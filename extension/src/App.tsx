import { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import FileUploader from './components/FileUploader';
import VerificationModal from './components/VerificationModal';
import GlobalConfig from './components/GlobalConfig';
import type { GlobalConfigData } from './types';
import { useOnlineUsers } from './hooks/useOnlineUsers';
import { getDesktopPath, exportExcel } from './services/api';
import './App.css';

function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('bfo_mode') || 'Offline');
  const [model, setModel] = useState(() => localStorage.getItem('bfo_model') || 'gemini-3.1-flash-lite');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('bfo_api_key') || '');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedInvoices, setExtractedInvoices] = useState<any[]>([]);
  const onlineUsers = useOnlineUsers();

  // Export Dialog State
  const [showExportModal, setShowExportModal] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [savePath, setSavePath] = useState('');         // Thư mục lưu file

  const [globalConfig, setGlobalConfig] = useState<GlobalConfigData>(() => {
    const saved = localStorage.getItem('bfo_global_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return {
      TenNguoiThucHien: 'Viết Trung',
      MaHoatDong: 'LSF0200',
      TTChiuPhi: 'LSF',
      MaChiPhi: '1512',
      MSNV: '7649',
      ASM: 'Hồ Vĩnh Hữu',
      HinhThucThanhToan: 'TM',
      KTPT: 'Thúy',
      GhiChu: 'ISP'
    };
  });

  // Tự động lưu thông tin đăng nhập & cấu hình vào localStorage
  useEffect(() => {
    localStorage.setItem('bfo_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('bfo_model', model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem('bfo_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('bfo_global_config', JSON.stringify(globalConfig));
  }, [globalConfig]);

  useEffect(() => {
    (window as any).openModal = (file: File) => {
      setSelectedFile(file);
    };
    return () => {
      window.removeEventListener('openModal', (window as any).openModal);
    };
  }, []);

  const handleStartScanning = () => {
    if (files.length === 0) {
      alert("Chưa có file nào để quét!");
      return;
    }
    if (extractedInvoices.length < files.length) {
      setSelectedFile(files[extractedInvoices.length]);
    } else {
      alert("Đã quét xong tất cả file!");
    }
  };

  // Export Form Options State
  const [exportOptions, setExportOptions] = useState<{ trichPhi: boolean; bfoThanhToan: boolean }>({
    trichPhi: true,
    bfoThanhToan: true
  });

  const triggerExportDialog = async () => {
    if (extractedInvoices.length === 0) {
      alert("Chưa có hóa đơn nào được xác nhận!");
      return;
    }
    // Gợi ý tên file mặc định: {Tên người thực hiện}_Trích phí_Chi phí tiếp khách Tháng {Tháng/Năm}.xlsx
    let monthYear = "07.2026";
    if (extractedInvoices.length > 0 && extractedInvoices[0].NgayChungTu) {
      const parts = extractedInvoices[0].NgayChungTu.split('/');
      if (parts.length >= 2) {
        monthYear = parts.length === 3 ? `${parts[1].padStart(2, '0')}.${parts[2]}` : extractedInvoices[0].NgayChungTu;
      }
    }
    const defaultName = `${globalConfig.TenNguoiThucHien || 'Viết Trung'}_Trích phí_Chi phí tiếp khách Tháng ${monthYear}`;
    setCustomFileName(defaultName);

    // Lấy Desktop path mặc định nếu chưa có savePath
    if (!savePath) {
      const path = await getDesktopPath();
      if (path) setSavePath(path);
    }

    setShowExportModal(true);
  };

  const downloadFile = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExecuteExport = async () => {
    if (!customFileName.trim()) {
      alert("Vui lòng nhập tên file xuất!");
      return;
    }
    if (!exportOptions.trichPhi && !exportOptions.bfoThanhToan) {
      alert("Vui lòng chọn ít nhất 1 mẫu file trả kết quả!");
      return;
    }

    const baseName = customFileName.replace(/\.(xlsx|xls)$/i, '').trim();
    let successCount = 0;
    const exportedNames: string[] = [];

    // 1. Xuất File Trích phí (nếu được chọn)
    if (exportOptions.trichPhi) {
      const fileName = `${baseName}.xlsx`;
      const { success, blob, error } = await exportExcel(extractedInvoices, globalConfig, fileName, "trich_phi");
      if (success && blob) {
        downloadFile(blob, fileName);
        successCount++;
        exportedNames.push(fileName);
      } else {
        alert(`❌ Lỗi xuất File Trích phí: ${error || "Không xác định"}`);
      }
    }

    // 2. Xuất File Nhập BFO thanh toán (nếu được chọn)
    if (exportOptions.bfoThanhToan) {
      const bfoBaseName = baseName.includes("Trích phí") 
        ? baseName.replace("Trích phí", "Nhập BFO thanh toán") 
        : `${baseName}_BFO`;
      const fileName = `${bfoBaseName}.xls`;
      const { success, blob, error } = await exportExcel(extractedInvoices, globalConfig, fileName, "bfo_thanh_toan");
      if (success && blob) {
        downloadFile(blob, fileName);
        successCount++;
        exportedNames.push(fileName);
      } else {
        alert(`❌ Lỗi xuất File Nhập BFO thanh toán: ${error || "Không xác định"}`);
      }
    }

    if (successCount > 0) {
      setShowExportModal(false);
      setExtractedInvoices([]);
      alert(`✅ Đã xuất và tải thành công ${successCount} file Excel:\n• ` + exportedNames.join('\n• '));
    }
  };

  return (
    <div className="app-container">
      <ControlPanel 
        mode={mode} setMode={setMode} 
        model={model} setModel={setModel} 
        apiKey={apiKey} setApiKey={setApiKey}
      />
      
      <main className="main-content">
        <GlobalConfig config={globalConfig} setConfig={setGlobalConfig} />
        
        <FileUploader 
          files={files} 
          setFiles={setFiles} 
          onFilesChanged={() => setExtractedInvoices([])}
        />

        {/* ── Selector mẫu trả kết quả ── */}
        <div className="export-options-selector" style={{ 
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '10px 14px',
          margin: '12px 0 6px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>📋 Mẫu file trả kết quả:</span>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={exportOptions.trichPhi}
              onChange={(e) => {
                if (!e.target.checked && !exportOptions.bfoThanhToan) return;
                setExportOptions(prev => ({ ...prev, trichPhi: e.target.checked }));
              }}
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
            />
            📄 File Trích phí
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={exportOptions.bfoThanhToan}
              onChange={(e) => {
                if (!e.target.checked && !exportOptions.trichPhi) return;
                setExportOptions(prev => ({ ...prev, bfoThanhToan: e.target.checked }));
              }}
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
            />
            📊 File Nhập BFO thanh toán
          </label>
        </div>
        
        <div className="action-row">
          <button 
            className="btn-primary" 
            onClick={handleStartScanning}
          >
            🔍 Bắt đầu quét {extractedInvoices.length > 0 ? `(${extractedInvoices.length}/${files.length})` : ''}
          </button>
          
          {extractedInvoices.length > 0 && (
            <button 
              className="btn-primary" 
              style={{ background: 'var(--color-success)' }}
              onClick={triggerExportDialog}
            >
              📥 Xuất Excel ({extractedInvoices.length})
            </button>
          )}
        </div>
      </main>

      {/* Export Filename Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowExportModal(false); setExtractedInvoices([]); } }}>
          <div className="export-modal">
            <div className="export-modal-header">
              <h2>📥 Xuất File Excel</h2>
              <button className="btn-close" onClick={() => {
                setShowExportModal(false);
                setExtractedInvoices([]);
              }}>&times;</button>
            </div>

            <div className="export-info-box">
              <p>📂 File Excel sẽ tự động tải xuống thư mục <strong>Downloads</strong> của trình duyệt.</p>
            </div>

            <div className="export-field">
              <label>Tên file xuất (.xlsx)</label>
              <input
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                placeholder="Nhập tên file..."
              />
            </div>

            <div className="export-modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowExportModal(false);
                setExtractedInvoices([]);
              }}>Hủy</button>
              <button className="btn-primary" onClick={handleExecuteExport} style={{ background: 'var(--color-success)' }}>💾 Lưu &amp; Xuất</button>
            </div>
          </div>
        </div>
      )}

      {selectedFile && (
        <VerificationModal 
          file={selectedFile} 
          mode={mode}
          model={model}
          apiKey={apiKey}
          onClose={() => {
            setSelectedFile(null);
            setExtractedInvoices([]);
          }} 
          onConfirm={(finalData) => {
            const updatedInvoices = [...extractedInvoices, finalData];
            setExtractedInvoices(updatedInvoices);
            setSelectedFile(null);
            
            // Mở file tiếp theo hoặc hiển thị xác nhận xuất file
            const nextIndex = updatedInvoices.length;
            if (nextIndex < files.length) {
              setTimeout(() => {
                setSelectedFile(files[nextIndex]);
              }, 300);
            } else {
              setTimeout(() => {
                let monthYear = "07.2026";
                if (updatedInvoices.length > 0 && updatedInvoices[0].NgayChungTu) {
                  const parts = updatedInvoices[0].NgayChungTu.split('/');
                  if (parts.length >= 2) {
                    monthYear = parts.length === 3 ? `${parts[1].padStart(2, '0')}.${parts[2]}` : updatedInvoices[0].NgayChungTu;
                  }
                }
                const defaultName = `${globalConfig.TenNguoiThucHien || 'Viết Trung'}_Nhập BFO_Chi phí tiếp khách Tháng ${monthYear}`;
                setCustomFileName(defaultName);
                setShowExportModal(true);
              }, 300);
            }
          }} 
        />
      )}

      {/* Online Users Badge */}
      <div className="online-badge">
        <div className="online-dot" />
        {onlineUsers} đang online
      </div>
    </div>
  );
}

export default App;

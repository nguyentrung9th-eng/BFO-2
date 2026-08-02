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

  const triggerExportDialog = async () => {
    if (extractedInvoices.length === 0) {
      alert("Chưa có hóa đơn nào được xác nhận!");
      return;
    }
    // Gợi ý tên file mặc định: {Tên người thực hiện}_Nhập BFO_Chi phí tiếp khách Tháng {Tháng/Năm}.xlsx
    let monthYear = "07.2026";
    if (extractedInvoices.length > 0 && extractedInvoices[0].NgayChungTu) {
      const parts = extractedInvoices[0].NgayChungTu.split('/');
      if (parts.length >= 2) {
        monthYear = parts.length === 3 ? `${parts[1].padStart(2, '0')}.${parts[2]}` : extractedInvoices[0].NgayChungTu;
      }
    }
    const defaultName = `${globalConfig.TenNguoiThucHien || 'Viết Trung'}_Nhập BFO_Chi phí tiếp khách Tháng ${monthYear}`;
    setCustomFileName(defaultName);

    // Lấy Desktop path mặc định nếu chưa có savePath
    if (!savePath) {
      const path = await getDesktopPath();
      if (path) setSavePath(path);
    }

    setShowExportModal(true);
  };

  const handleExecuteExport = async () => {
    if (!customFileName.trim()) {
      alert("Vui lòng nhập tên file xuất!");
      return;
    }

    const finalFileName = customFileName.toLowerCase().endsWith('.xlsx') ? customFileName.trim() : `${customFileName.trim()}.xlsx`;

    const { success, blob, error } = await exportExcel(extractedInvoices, globalConfig, finalFileName);

    if (success && blob) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowExportModal(false);
      setExtractedInvoices([]);
      alert(`✅ Đã xuất và tải thành công file Excel: ${finalFileName}`);
    } else {
      alert("❌ " + (error || "Lỗi xuất Excel không xác định"));
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
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
          <button 
            className="btn-primary" 
            style={{ flex: 1, padding: '12px', fontSize: '16px', background: '#007bff' }}
            onClick={handleStartScanning}
          >
            Bắt đầu quét {extractedInvoices.length > 0 ? `(${extractedInvoices.length}/${files.length})` : ''}
          </button>
          
          {extractedInvoices.length > 0 && (
            <button 
              className="btn-primary" 
              style={{ flex: 1, padding: '12px', fontSize: '16px', background: '#28a745' }}
              onClick={triggerExportDialog}
            >
              Xuất File Excel kết quả ({extractedInvoices.length})
            </button>
          )}
        </div>
      </main>

      {/* Export Filename Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '540px', padding: '20px' }}>
            <div className="modal-header">
              <h2>Xuất File Excel</h2>
              <button className="btn-close" onClick={() => {
                setShowExportModal(false);
                setExtractedInvoices([]);
              }}>&times;</button>
            </div>

            {/* Gợi ý lưu file trên WebApp */}
            <div style={{ margin: '16px 0 12px', background: '#e7f5ff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #bde0fe' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#0056b3', fontWeight: '500' }}>
                📥 File Excel sẽ tự động được tải xuống thư mục <strong>Downloads (Tải về)</strong> của trình duyệt sau khi xuất.
              </p>
            </div>

            {/* Tên file */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Tên file xuất (.xlsx):</label>
              <input
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                style={{ width: '100%', padding: '9px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => {
                setShowExportModal(false);
                setExtractedInvoices([]);
              }} style={{ padding: '8px 16px' }}>Hủy</button>
              <button className="btn-primary" onClick={handleExecuteExport} style={{ padding: '8px 16px', background: '#28a745' }}>💾 Lưu &amp; Xuất Excel</button>
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
      <div style={{
        position: 'fixed',
        bottom: '15px',
        left: '15px',
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          background: '#4ade80',
          borderRadius: '50%',
          boxShadow: '0 0 6px #4ade80',
          animation: 'pulse 2s infinite'
        }}></div>
        {onlineUsers} đang online
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
          100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }
      `}</style>
    </div>
  );
}

export default App;

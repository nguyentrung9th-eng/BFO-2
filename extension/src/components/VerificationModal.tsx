import React, { useState, useEffect } from 'react';
import './VerificationModal.css';

interface VerificationModalProps {
  file: File;
  mode: string;
  model: string;
  apiKey: string;
  onClose: () => void;
  onConfirm: (data: any) => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ file, mode, model, apiKey, onClose, onConfirm }) => {
  const fileUrl = URL.createObjectURL(file);

  const [loading, setLoading] = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    KyHieu: '',
    SoChungTuNgoai: '',
    NgayChungTu: '',
    NhaCungCap: '',
    MaSoThue: '',
    DienGiai_BoSung: 'Bệnh viện',
    ThanhTien: ''
  });

  const [taxLines, setTaxLines] = useState([
    { id: Date.now(), rate: '', preTax: '', tax: '', postTax: '' }
  ]);

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    const extractData = async () => {
      setLoading(true);
      setLogs([]);
      addLog(`Bắt đầu phân tích file: ${file.name}`);
      addLog(`Chế độ: ${mode} | Model: ${model}`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      formData.append('model_name', model);
      if (apiKey) {
        formData.append('api_key', apiKey);
      }

      try {
        addLog(`Đang gửi dữ liệu tới Backend...`);
        const response = await fetch('/api/extract', {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        
        if (result.success && result.data) {
          addLog(`Trích xuất thành công! Đang xử lý dữ liệu...`);
          const d = result.data;
          
          addLog(`+ Số HĐ: ${d.SoChungTuNgoai || 'Trống'}`);
          addLog(`+ Ngày HĐ: ${d.NgayChungTu || 'Trống'}`);
          addLog(`+ MST: ${d.MaSoThue || 'Trống'}`);
          addLog(`+ Đơn vị: ${d.NhaCungCap || 'Trống'}`);
          
          setInvoiceData(prev => ({
            ...prev,
            KyHieu: d.KyHieu || '',
            SoChungTuNgoai: d.SoChungTuNgoai || '',
            NgayChungTu: d.NgayChungTu || '',
            NhaCungCap: d.NhaCungCap || '',
            MaSoThue: d.MaSoThue || ''
          }));

          if (d.Taxes && d.Taxes.length > 0) {
            addLog(`Tìm thấy ${d.Taxes.length} dòng thuế suất.`);
            const parsedTaxes = d.Taxes.map((t: any, i: number) => {
              addLog(`  - Dòng ${i+1}: Thuế ${t.ThueSuat}, TT: ${t.SoTienTinhThueGTGT}, Tiền Thuế: ${t.SoTienThueVAT}`);
              let rateVal = '';
              if (t.ThueSuat) {
                const m = t.ThueSuat.match(/VAT0?(\d+)%/);
                if (m) rateVal = m[1];
                else if (t.ThueSuat === 'KHONGTHUE') rateVal = '0';
                else rateVal = 'other';
              }
              
              if (i === d.Taxes.length - 1 && t.ThanhTien) {
                 setInvoiceData(prev => ({ ...prev, ThanhTien: t.ThanhTien }));
              }
              
              return {
                id: Date.now() + i,
                rate: rateVal,
                preTax: t.SoTienTinhThueGTGT || '',
                tax: t.SoTienThueVAT || '',
                postTax: t.ThanhTien || ''
              };
            });
            setTaxLines(parsedTaxes);

            // Tính tổng tiền thanh toán = tổng các số tiền sau thuế của các mức thuế suất
            const totalSum = parsedTaxes.reduce((acc: number, t: any) => {
              const val = parseFloat((t.postTax || '').toString().replace(/[^\d.-]/g, ''));
              return acc + (isNaN(val) ? 0 : val);
            }, 0);

            if (totalSum > 0) {
              setInvoiceData(prev => ({ ...prev, ThanhTien: totalSum.toString() }));
            }
          } else {
            addLog(`Không tìm thấy chi tiết thuế.`);
          }
        } else {
          console.error("Extract failed:", result.error);
          const errMsg = (result.error || "").toLowerCase();
          let userFriendlyError = result.error || "Không xác định";
          
          if (errMsg.includes('connect') || errMsg.includes('timeout') || errMsg.includes('api key') || errMsg.includes('fetch')) {
            userFriendlyError = "Không thể kết nối tới AI online! Vui lòng kiểm tra lại mạng hoặc API Key của bạn.";
          }

          addLog(`Lỗi trích xuất: ${userFriendlyError}`);
          alert("Lỗi trích xuất: " + userFriendlyError);
        }
      } catch (err) {
        console.error("API Error:", err);
        setBackendOffline(true);
        addLog(`❌ Không thể kết nối tới Backend tại http://localhost:8000`);
        addLog(`→ Hãy chạy file: backend/start_backend.bat rồi thử lại.`);
      } finally {
        setLoading(false);
        addLog(`Hoàn tất quá trình.`);
      }
    };

    extractData();
  }, [file, mode, model, apiKey]);

  const handleAddTaxLine = () => {
    setTaxLines([...taxLines, { id: Date.now(), rate: '10', preTax: '', tax: '', postTax: '' }]);
  };

  const handleRemoveTaxLine = (id: number) => {
    if (taxLines.length > 1) {
      const updated = taxLines.filter(line => line.id !== id);
      setTaxLines(updated);
      
      // Tự động tính toán lại Tổng tiền thanh toán
      const total = updated.reduce((acc, line) => {
        const val = parseFloat((line.postTax || '').toString().replace(/[^\d.-]/g, ''));
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
      setInvoiceData(prev => ({ ...prev, ThanhTien: total.toString() }));
    }
  };

  const handleDataChange = (field: string, value: string) => {
    setInvoiceData({ ...invoiceData, [field]: value });
  };

  const handleTaxChange = (id: number, field: string, value: string) => {
    const updatedTaxLines = taxLines.map(line => line.id === id ? { ...line, [field]: value } : line);
    setTaxLines(updatedTaxLines);
    
    // Tự động tính toán lại Tổng tiền thanh toán bằng tổng Tiền sau thuế
    const total = updatedTaxLines.reduce((acc, line) => {
      const val = parseFloat((line.postTax || '').replace(/[^\d.-]/g, ''));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    
    if (total > 0 || (field === 'postTax' && value !== '')) {
      setInvoiceData(prev => ({ ...prev, ThanhTien: total.toString() }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Xác nhận Hóa đơn: {file.name}</h2>
          <button className="btn-close" onClick={onClose} title="Đóng và Dừng xử lý">
            &times;
          </button>
        </div>
        
        <div className="modal-body">
          {/* Split-View Left: Document Viewer */}
          <div className="document-viewer">
            {file.name.toLowerCase().endsWith('.xml') ? (
              <iframe src={fileUrl} title="XML Preview" className="preview-frame" style={{ width: '100%', height: '100%', border: 'none', background: '#f9f9f9' }} />
            ) : file.type === 'application/pdf' ? (
              <iframe src={`${fileUrl}#toolbar=0`} title="PDF Preview" className="preview-frame" />
            ) : (
              <img src={fileUrl} alt="Preview" className="preview-image" />
            )}
          </div>

          {/* Split-View Right: Form Data */}
          <div className="data-form" style={{ position: 'relative' }}>
            {backendOffline && (
              <div style={{
                background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px',
                padding: '10px 14px', marginBottom: '10px', fontSize: '13px', color: '#856404'
              }}>
                <strong>⚠️ Backend chưa chạy!</strong>
                <br />Hãy khởi động backend bằng cách mở file:
                <code style={{ display: 'block', marginTop: '4px', background: '#ffeeba', padding: '3px 6px', borderRadius: '3px' }}>
                  backend/start_backend.bat
                </code>
                <span style={{ fontSize: '12px' }}>Sau đó đóng cửa sổ này và thử lại.</span>
              </div>
            )}
            {loading && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 10,
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
              }}>
                <div className="spinner" style={{
                  border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', 
                  borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ marginTop: '10px', fontWeight: 'bold', color: '#555' }}>Đang trích xuất dữ liệu AI...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            
            <div className="form-group highlight-group" style={{ background: '#eef7ff', padding: '10px', borderRadius: '5px', borderLeft: '4px solid #007bff' }}>
              <label style={{ fontWeight: 'bold', color: '#0056b3' }}>Diễn giải tự động (Xem trước)</label>
              <div style={{ fontSize: '13px', color: '#333', marginTop: '4px', fontStyle: 'italic', wordBreak: 'break-word' }}>
                {(() => {
                  let thangNam = "07/2026";
                  if (invoiceData.NgayChungTu && invoiceData.NgayChungTu.includes('/')) {
                    const parts = invoiceData.NgayChungTu.split('/');
                    if (parts.length >= 2) {
                      thangNam = parts.length === 3 ? `${parts[1].padStart(2, '0')}/${parts[2]}` : invoiceData.NgayChungTu;
                    }
                  }
                  let rawSoHd = (invoiceData.SoChungTuNgoai || '').includes('|')
                    ? invoiceData.SoChungTuNgoai.split('|').pop()?.trim() || ''
                    : (invoiceData.SoChungTuNgoai || '').trim();
                  const soHd = /^\d+$/.test(rawSoHd) ? rawSoHd.padStart(8, '0') : rawSoHd;
                  const bv = invoiceData.DienGiai_BoSung ? `_${invoiceData.DienGiai_BoSung}` : '';
                  return `THANH TOÁN CHI PHÍ TIẾP KHÁCH THEO KẾ HOẠCH THÁNG ${thangNam} _${soHd}${bv}`;
                })()}
              </div>
            </div>

            <div className="form-group">
              <label>Ký hiệu Hóa đơn</label>
              <input type="text" value={invoiceData.KyHieu} onChange={e => handleDataChange('KyHieu', e.target.value)} />
            </div>
            
            <div className="form-group">
              <label>Số Hóa đơn</label>
              <input 
                type="text" 
                value={invoiceData.SoChungTuNgoai} 
                onChange={e => handleDataChange('SoChungTuNgoai', e.target.value)}
                onBlur={e => {
                  const val = e.target.value.trim();
                  if (/^\d+$/.test(val)) {
                    handleDataChange('SoChungTuNgoai', val.padStart(8, '0'));
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label>Ngày Hóa đơn</label>
              <input type="text" value={invoiceData.NgayChungTu} onChange={e => handleDataChange('NgayChungTu', e.target.value)} />
            </div>

            <div className="form-group">
              <label>TÊN NCC (Tên Đơn vị bán hàng)</label>
              <input type="text" value={invoiceData.NhaCungCap} onChange={e => handleDataChange('NhaCungCap', e.target.value)} />
            </div>

            <div className="form-group">
              <label>MST (Mã số thuế)</label>
              <input type="text" value={invoiceData.MaSoThue} onChange={e => handleDataChange('MaSoThue', e.target.value)} />
            </div>

            <div className="form-group highlight-group">
              <label>Bệnh viện / Đơn vị tổ chức</label>
              <input 
                type="text" 
                placeholder="VD: BV Chợ Rẫy, BV Tâm Anh HCM..."
                value={invoiceData.DienGiai_BoSung} 
                onChange={e => handleDataChange('DienGiai_BoSung', e.target.value)}
                className={`input-highlight ${
                  !invoiceData.DienGiai_BoSung.trim() || invoiceData.DienGiai_BoSung.trim() === 'Bệnh viện' 
                    ? 'is-default' 
                    : 'is-edited'
                }`} 
              />
            </div>

            <div className="tax-section">
              <div className="tax-section-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                <h4 style={{margin: 0}}>Chi tiết Thuế & Số tiền</h4>
                <button type="button" className="btn-secondary" style={{padding: '4px 8px', fontSize: '12px'}} onClick={handleAddTaxLine}>
                  + Thêm dòng thuế suất
                </button>
              </div>

              {taxLines.map((line) => (
                <div key={line.id} className="tax-line-card" style={{border: '1px solid #ddd', padding: '10px', borderRadius: '4px', marginBottom: '10px', position: 'relative'}}>
                  {taxLines.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTaxLine(line.id)}
                      style={{position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold'}}
                      title="Xóa dòng thuế này"
                    >
                      &times;
                    </button>
                  )}
                  <div className="form-group">
                    <label>Thuế suất (%)</label>
                    <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                      <label style={{fontWeight: 'normal', margin: 0}}><input type="radio" name={`tax_${line.id}`} value="5" checked={line.rate === '5'} onChange={e => handleTaxChange(line.id, 'rate', e.target.value)} /> 5%</label>
                      <label style={{fontWeight: 'normal', margin: 0}}><input type="radio" name={`tax_${line.id}`} value="8" checked={line.rate === '8'} onChange={e => handleTaxChange(line.id, 'rate', e.target.value)} /> 8%</label>
                      <label style={{fontWeight: 'normal', margin: 0}}><input type="radio" name={`tax_${line.id}`} value="10" checked={line.rate === '10'} onChange={e => handleTaxChange(line.id, 'rate', e.target.value)} /> 10%</label>
                      <label style={{fontWeight: 'normal', margin: 0, display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <input type="radio" name={`tax_${line.id}`} value="other" checked={line.rate !== '5' && line.rate !== '8' && line.rate !== '10'} onChange={() => handleTaxChange(line.id, 'rate', 'other')} /> Khác:
                        <input type="text" style={{width: '60px', padding: '2px 5px'}} value={['5','8','10'].includes(line.rate) ? '' : line.rate} onChange={e => handleTaxChange(line.id, 'rate', e.target.value)} />
                      </label>
                    </div>
                  </div>
                  
                  <div style={{display: 'flex', gap: '10px'}}>
                    <div className="form-group" style={{flex: 1}}>
                      <label>Tiền trước thuế</label>
                      <input type="text" value={line.preTax} onChange={e => handleTaxChange(line.id, 'preTax', e.target.value)} />
                    </div>
                    <div className="form-group" style={{flex: 1}}>
                      <label>Tiền thuế</label>
                      <input type="text" value={line.tax} onChange={e => handleTaxChange(line.id, 'tax', e.target.value)} />
                    </div>
                    <div className="form-group" style={{flex: 1}}>
                      <label>Tiền sau thuế</label>
                      <input type="text" value={line.postTax} onChange={e => handleTaxChange(line.id, 'postTax', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

            </div>
            
            <div className="form-group">
              <label>Tổng tiền thanh toán</label>
              <input type="text" value={invoiceData.ThanhTien} onChange={e => handleDataChange('ThanhTien', e.target.value)} />
            </div>

            <div className="logs-section" style={{marginTop: '20px', background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', maxHeight: '120px', overflowY: 'auto', fontSize: '12px'}}>
              <h5 style={{margin: '0 0 5px 0'}}>Nhật ký hoạt động:</h5>
              {logs.map((log, idx) => (
                <div key={idx} style={{fontFamily: 'monospace', color: '#333', marginBottom: '2px'}}>{log}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-danger" onClick={onClose} disabled={loading}>
            Dừng & Đóng
          </button>
          <button className="btn-primary" onClick={() => onConfirm({ ...invoiceData, Taxes: taxLines })} disabled={loading}>
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;

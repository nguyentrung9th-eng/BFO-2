import React from 'react';
import './GlobalConfig.css';

export interface GlobalConfigData {
  TenNguoiThucHien: string;
  MaHoatDong: string;
  TTChiuPhi: string;
  MaChiPhi: string;
  MSNV: string;
  ASM: string;
  HinhThucThanhToan: string;
  KTPT: string;
  GhiChu: string;
}

interface GlobalConfigProps {
  config: GlobalConfigData;
  setConfig: React.Dispatch<React.SetStateAction<GlobalConfigData>>;
}

const GlobalConfig: React.FC<GlobalConfigProps> = ({ config, setConfig }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="global-config-container">
      <h3 className="global-config-title">Thông tin mặc định đợt trích xuất (Global Fields)</h3>
      <div className="global-config-grid">
        <div className="config-group" style={{ gridColumn: 'span 2', background: '#fff9e6', padding: '8px', borderRadius: '4px', border: '1px solid #ffe0b2' }}>
          <label style={{ fontWeight: 'bold', color: '#d84315' }}>Tên người thực hiện:</label>
          <input type="text" name="TenNguoiThucHien" value={config.TenNguoiThucHien} onChange={handleChange} placeholder="VD: Viết Trung" style={{ fontWeight: 'bold' }} />
        </div>

        <div className="config-group">
          <label>Mã hoạt động (NS):</label>
          <input type="text" name="MaHoatDong" value={config.MaHoatDong} onChange={handleChange} />
        </div>
        <div className="config-group">
          <label>TT Chịu phí:</label>
          <input type="text" name="TTChiuPhi" value={config.TTChiuPhi} onChange={handleChange} />
        </div>
        
        <div className="config-group">
          <label>Mã chi phí:</label>
          <input type="text" name="MaChiPhi" value={config.MaChiPhi} onChange={handleChange} />
        </div>
        <div className="config-group">
          <label>MSNV:</label>
          <input type="text" name="MSNV" value={config.MSNV} onChange={handleChange} />
        </div>
        
        <div className="config-group">
          <label>ASM:</label>
          <input type="text" name="ASM" value={config.ASM} onChange={handleChange} />
        </div>
        <div className="config-group">
          <label>Hình Thức Thanh Toán:</label>
          <input type="text" name="HinhThucThanhToan" value={config.HinhThucThanhToan} onChange={handleChange} />
        </div>

        <div className="config-group">
          <label>KTPT:</label>
          <input type="text" name="KTPT" value={config.KTPT} onChange={handleChange} />
        </div>
        <div className="config-group">
          <label>GHI CHÚ:</label>
          <input type="text" name="GhiChu" value={config.GhiChu} onChange={handleChange} />
        </div>
      </div>
    </div>
  );
};

export default GlobalConfig;

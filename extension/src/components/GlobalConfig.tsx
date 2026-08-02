import React, { useState } from 'react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showExtended, setShowExtended] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="global-config-container">
      {/* ── Collapsible Header ── */}
      <div
        className="global-config-header"
        onClick={() => setIsCollapsed(c => !c)}
        role="button"
        aria-expanded={!isCollapsed}
      >
        <h3 className="global-config-title">⚙️ Cấu hình đợt trích xuất</h3>
        <span className={`config-toggle-icon${!isCollapsed ? ' open' : ''}`}>▼</span>
      </div>

      {/* ── Body ── */}
      {!isCollapsed && (
        <div className="global-config-body">
          <div className="global-config-grid">
            {/* ── Luôn hiển thị ── */}
            <div className="config-group span-full">
              <label>Tên người thực hiện</label>
              <input
                type="text"
                name="TenNguoiThucHien"
                value={config.TenNguoiThucHien}
                onChange={handleChange}
                placeholder="VD: Viết Trung"
              />
            </div>

            <div className="config-group">
              <label>MSNV</label>
              <input type="text" name="MSNV" value={config.MSNV} onChange={handleChange} />
            </div>
            <div className="config-group">
              <label>ASM</label>
              <input type="text" name="ASM" value={config.ASM} onChange={handleChange} />
            </div>
          </div>

          {/* ── Toggle mở rộng ── */}
          <button
            type="button"
            className="btn-expand-config"
            onClick={() => setShowExtended(s => !s)}
          >
            {showExtended ? '▲ Thu gọn' : '▼ Mở rộng'}
          </button>

          {/* ── Các trường mở rộng ── */}
          {showExtended && (
            <div className="global-config-grid global-config-extended">
              <div className="config-group">
                <label>Mã hoạt động (NS)</label>
                <input type="text" name="MaHoatDong" value={config.MaHoatDong} onChange={handleChange} />
              </div>
              <div className="config-group">
                <label>TT Chịu phí</label>
                <input type="text" name="TTChiuPhi" value={config.TTChiuPhi} onChange={handleChange} />
              </div>

              <div className="config-group">
                <label>Mã chi phí</label>
                <input type="text" name="MaChiPhi" value={config.MaChiPhi} onChange={handleChange} />
              </div>
              <div className="config-group">
                <label>Hình thức thanh toán</label>
                <input type="text" name="HinhThucThanhToan" value={config.HinhThucThanhToan} onChange={handleChange} />
              </div>

              <div className="config-group">
                <label>KTPT</label>
                <input type="text" name="KTPT" value={config.KTPT} onChange={handleChange} />
              </div>
              <div className="config-group">
                <label>Ghi chú</label>
                <input type="text" name="GhiChu" value={config.GhiChu} onChange={handleChange} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalConfig;

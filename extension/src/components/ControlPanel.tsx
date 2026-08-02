import React, { useState } from 'react';
import './ControlPanel.css';
import HelpModal from './HelpModal';

interface ControlPanelProps {
  mode: string;
  setMode: (mode: string) => void;
  model: string;
  setModel: (model: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ mode, setMode, model, setModel, apiKey, setApiKey }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [modelsList, setModelsList] = useState<string[]>([
    'gemini-3.1-flash-lite',
    'gemini-3.5-pro',
    'gemini-3.6-flash',
    'gemini-3.6-pro'
  ]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [toastFading, setToastFading] = useState(false);

  const HELP_SEEN_KEY = 'bfo_help_seen';
  const isFirstVisit = !localStorage.getItem(HELP_SEEN_KEY);
  const [showHelp, setShowHelp] = useState(() => isFirstVisit);

  const handleCloseHelp = () => {
    localStorage.setItem(HELP_SEEN_KEY, '1');
    setShowHelp(false);
  };

  const isAIMode = mode !== 'Offline';

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastFading(false);
    setToast({ message, type });
    setTimeout(() => {
      setToastFading(true);
      setTimeout(() => { setToast(null); setToastFading(false); }, 420);
    }, 1000);
  };

  const handleUpdateModels = async () => {
    if (!apiKey) {
      showToast("Vui lòng nhập API Key!", 'error');
      return;
    }
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await res.json();
      if (data.models) {
        const filtered = data.models
          .filter((m: any) => m.name.includes('3.1') || m.name.includes('3.5') || m.name.includes('3.6'))
          .map((m: any) => m.name.replace('models/', ''));
        if (filtered.length > 0) {
          setModelsList(filtered);
          if (!filtered.includes(model)) setModel(filtered[0]);
          showToast(`✅ Đã cập nhật ${filtered.length} model!`, 'success');
        } else {
          showToast('Không tìm thấy model 3.x nào!', 'error');
        }
      } else {
        showToast('Lỗi từ Gemini API!', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Lỗi kết nối Gemini API!', 'error');
    }
  };

  return (
    <div className="control-panel">
      {/* ── Top Bar ── */}
      <div className="panel-top">
        <div className="panel-brand">
          <div className="brand-dot" />
          <h2>BFO AI</h2>
        </div>

        <div className="panel-actions">
          <span className="mode-badge">{mode}</span>
          <button
            className="btn-help"
            onClick={() => setShowHelp(true)}
            aria-label="Giới thiệu"
            title="Giới thiệu tính năng"
          >
            ?
          </button>
          <button
            className={`btn-settings${showSettings ? ' active' : ''}`}
            onClick={() => setShowSettings(s => !s)}
            aria-expanded={showSettings}
          >
            ⚙️ Cài đặt {showSettings ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* ── Collapsible Settings ── */}
      {showSettings && (
        <div className="panel-settings">
          {/* Chế độ — always visible inside settings */}
          <div className="control-group">
            <label htmlFor="mode-select">Chế độ</label>
            <select
              id="mode-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="Offline">Offline</option>
              <option value="Google Login">Google Login</option>
              <option value="API Key">API Key</option>
            </select>
          </div>

          {/* Mô hình AI — chỉ hiện khi AI mode */}
          {isAIMode && (
            <div className="control-group">
              <label htmlFor="model-select">Mô hình AI</label>
              <select
                id="model-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {modelsList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cập nhật model — chỉ hiện khi AI mode */}
          {isAIMode && (
            <button
              type="button"
              className="btn-update-model"
              onClick={handleUpdateModels}
            >
              🔄 Cập nhật
            </button>
          )}

          {/* API Key — chỉ hiện khi API Key mode */}
          {mode === 'API Key' && (
            <div className="control-group">
              <label htmlFor="api-key-input">Gemini API Key</label>
              <input
                id="api-key-input"
                type="password"
                placeholder="Nhập API Key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          )}

          {/* Google Login — chỉ hiện khi Google mode */}
          {mode === 'Google Login' && (
            <div className="control-group">
              <label>Xác thực</label>
              <button type="button" className="btn-google">
                🔐 Đăng nhập bằng Google
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div className={`panel-toast panel-toast--${toast.type}${toastFading ? ' panel-toast--fading' : ''}`}>
          {toast.message}
        </div>
      )}

      {/* ── Help Modal ── */}
      {showHelp && (
        <HelpModal
          onClose={handleCloseHelp}
          isFirstVisit={isFirstVisit}
        />
      )}
    </div>
  );
};

export default ControlPanel;

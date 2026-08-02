import React, { useState } from 'react';
import './ControlPanel.css';

interface ControlPanelProps {
  mode: string;
  setMode: (mode: string) => void;
  model: string;
  setModel: (model: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ mode, setMode, model, setModel, apiKey, setApiKey }) => {
  const [modelsList, setModelsList] = useState<string[]>([
    'gemini-3.1-flash-lite',
    'gemini-3.5-pro',
    'gemini-3.6-flash',
    'gemini-3.6-pro'
  ]);

  const handleUpdateModels = async () => {
    if (!apiKey) {
      alert("Vui lòng nhập API Key để cập nhật danh sách Model!");
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
          if (!filtered.includes(model)) {
            setModel(filtered[0]);
          }
          alert("Cập nhật danh sách model thành công!");
        } else {
          alert("Không tìm thấy model 3.x nào!");
        }
      } else {
        alert("Lỗi từ Gemini API: " + JSON.stringify(data));
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi kết nối tới Gemini API!");
    }
  };

  return (
    <div className="control-panel">
      <h2>BFO AI Dashboard</h2>
      
      <div className="control-group">
        <label htmlFor="mode-select">Chế độ xử lý:</label>
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

      {mode === 'API Key' && (
        <div className="control-group">
          <input 
            type="password" 
            placeholder="Nhập Gemini API Key..." 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{width: '100%', padding: '6px', marginTop: '8px', boxSizing: 'border-box'}} 
          />
        </div>
      )}

      {mode === 'Google Login' && (
        <div className="control-group">
          <button 
            type="button" 
            style={{width: '100%', padding: '8px', marginTop: '8px', background: '#4285F4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}
          >
            Đăng nhập bằng Google
          </button>
        </div>
      )}

      <div className="control-group">
        <label htmlFor="model-select">Mô hình AI:</label>
        <select 
          id="model-select" 
          value={model} 
          onChange={(e) => setModel(e.target.value)}
        >
          {modelsList.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button 
          type="button" 
          className="btn-secondary" 
          style={{ padding: '0.5rem', fontSize: '0.8rem' }}
          onClick={handleUpdateModels}
        >
          Cập nhật Gemini Model
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;

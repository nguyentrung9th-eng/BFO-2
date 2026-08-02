import React, { useState, useRef } from 'react';
import './HelpModal.css';

interface HelpModalProps {
  onClose: () => void;
  isFirstVisit: boolean;
}

const SLIDES = [
  {
    icon: '🚀',
    title: 'BFO AI là gì?',
    desc: 'Công cụ giúp bạn nhập chi phí tiếp khách vào hệ thống BFO nhanh chóng, không cần gõ tay từng trường.',
    bullets: [
      { icon: '📤', text: 'Upload hóa đơn dạng PDF, XML hoặc ảnh (PNG, JPG)' },
      { icon: '🤖', text: 'AI tự động đọc và điền thông tin từ hóa đơn' },
      { icon: '✅', text: 'Kiểm tra, chỉnh sửa rồi xác nhận từng hóa đơn' },
      { icon: '📊', text: 'Xuất file Excel đúng chuẩn BFO chỉ 1 click' },
    ],
    example: null,
  },
  {
    icon: '📂',
    title: 'Trích xuất thông minh',
    desc: 'AI đọc hóa đơn và tự động điền các trường dữ liệu quan trọng:',
    bullets: [
      { icon: '🔢', text: 'Ký hiệu hóa đơn, Số chứng từ, Ngày chứng từ' },
      { icon: '🏢', text: 'Tên nhà cung cấp, Mã số thuế' },
      { icon: '💰', text: 'Thành tiền, Thuế VAT theo từng dòng thuế suất' },
      { icon: '📝', text: 'Diễn giải bổ sung (VD: Bệnh viện, Phòng khám...)' },
    ],
    example: null,
  },
  {
    icon: '✅',
    title: 'Kiểm tra & Xác nhận',
    desc: 'Xem ảnh hóa đơn và form dữ liệu song song để kiểm tra trước khi xác nhận.',
    bullets: [
      { icon: '🔴', text: 'Trường đỏ = AI trích xuất tự động, cần kiểm tra lại' },
      { icon: '🔵', text: 'Trường xanh = đã chỉnh sửa thủ công' },
      { icon: '⏭️', text: 'Xác nhận xong → tự động chuyển sang hóa đơn tiếp theo' },
      { icon: '🔁', text: 'Quét hết tất cả file → hiện ngay hộp thoại Xuất Excel' },
    ],
    example: null,
  },
  {
    icon: '📊',
    title: 'Xuất Excel tự động',
    desc: 'File Excel đầu ra được đặt tên và điền đầy đủ theo Cấu hình đợt trích xuất.',
    bullets: [
      { icon: '📁', text: 'Tên file: tên người + tháng/năm tự động' },
      { icon: '📋', text: 'Tên sheet: không dấu, viết hoa, theo chuẩn Excel' },
      { icon: '✍️', text: 'Diễn giải: số HD + loại chi phí + tháng' },
      { icon: '⚙️', text: 'Mã HĐ, MSNV, ASM, KTPT... lấy từ Cấu hình' },
    ],
    example: {
      fileName: 'Viết Trung_Nhập BFO_Chi phí tiếp khách Tháng 07.2026.xlsx',
      sheetName: 'Trich phi VIET TRUNG T07.26',
      dienGiai: 'THANH TOÁN CHI PHÍ TIẾP KHÁCH THEO KẾ HOẠCH THÁNG 07/2026 _HD001_Bệnh viện',
    },
  },
];

const HelpModal: React.FC<HelpModalProps> = ({ onClose, isFirstVisit }) => {
  const [current, setCurrent] = useState(0);
  const totalSlides = SLIDES.length;
  const isLast = current === totalSlides - 1;

  // Touch/swipe support
  const touchStartX = useRef<number | null>(null);

  const goNext = () => {
    if (isLast) { onClose(); return; }
    setCurrent(c => c + 1);
  };
  const goPrev = () => {
    if (current === 0) return;
    setCurrent(c => c - 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="help-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="help-modal" role="dialog" aria-label="Giới thiệu BFO AI">
        {/* ── Header ── */}
        <div className="help-modal-header">
          <span className="help-slide-count">{current + 1} / {totalSlides}</span>
          <button className="btn-close" onClick={onClose} aria-label="Đóng">×</button>
        </div>

        {/* ── Slides ── */}
        <div
          className="help-slides-viewport"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="help-slides-track"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {SLIDES.map((s, i) => (
              <div className="help-slide" key={i}>
                <div className="help-slide-icon">{s.icon}</div>
                <h3 className="help-slide-title">{s.title}</h3>
                <p className="help-slide-desc">{s.desc}</p>
                <ul className="help-slide-bullets">
                  {s.bullets.map((b, j) => (
                    <li key={j}>
                      <span className="help-bullet-icon">{b.icon}</span>
                      <span>{b.text}</span>
                    </li>
                  ))}
                </ul>

                {/* Ví dụ thực tế — chỉ slide 4 */}
                {s.example && (
                  <div className="help-example-box">
                    <p>Tên file</p>
                    <span>📄 {s.example.fileName}</span>
                    <p style={{ marginTop: '0.5rem' }}>Tên sheet</p>
                    <span>📋 {s.example.sheetName}</span>
                    <p style={{ marginTop: '0.5rem' }}>Diễn giải</p>
                    <span>✍️ {s.example.dienGiai}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Dot indicators ── */}
        <div className="help-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`help-dot${i === current ? ' active' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* ── Footer navigation ── */}
        <div className="help-modal-footer">
          <button
            className="btn-help-nav"
            onClick={goPrev}
            disabled={current === 0}
          >
            ← Trước
          </button>

          {isLast ? (
            <button
              className={`btn-help-next${isFirstVisit ? ' btn-start' : ''}`}
              onClick={onClose}
            >
              {isFirstVisit ? '🎉 Bắt đầu dùng ngay!' : 'Đóng'}
            </button>
          ) : (
            <button className="btn-help-next" onClick={goNext}>
              Tiếp theo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;

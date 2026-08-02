# 📁 Thư mục `UPLOAD_CHON_THU_MUC_NAY` — Tài liệu Hướng dẫn & Vận hành Repo GitHub

## 💡 Mục đích của thư mục
Thư mục `UPLOAD_CHON_THU_MUC_NAY` đóng vai trò là **Source chuẩn đã đóng gói** đại diện cho toàn bộ repository GitHub của ứng dụng **BFO Online (DHG BFO WebApp)**.

Mỗi khi có cập nhật tính năng mới (giao diện smartphone, trích xuất hóa đơn, xuất file Excel...), tất cả mã nguồn mới nhất từ frontend (`extension/`) và backend (`backend/app`, `Procfile`, `requirements.txt`) sẽ được đồng bộ đầy đủ vào thư mục này để sẵn sàng tải/push lên GitHub.

---

## 🛠️ Cấu trúc hoàn chỉnh của Thư mục

```text
UPLOAD_CHON_THU_MUC_NAY/
├── app/                        # Backend Python FastAPI (xử lý OCR, Gemini AI, xuất Excel)
│   ├── api/                    # Các API endpoint (extract, export, websocket online, system...)
│   ├── core/                   # Logic nghiệp vụ chính (excel_writer.py, gemini_ocr.py...)
│   ├── models/                 # Schemas & Pydantic models
│   └── main.py                 # File chạy chính của server FastAPI
├── extension/                  # Frontend React + Vite + TypeScript (Giao diện người dùng)
│   ├── dist/                   # Bản build Production tĩnh đã được biên dịch mới nhất
│   ├── public/                 # Favicon và tài nguyên tĩnh
│   ├── src/                    # Mã nguồn React
│   │   ├── components/         # ControlPanel, GlobalConfig, FileUploader, HelpModal, VerificationModal
│   │   ├── hooks/              # useOnlineUsers websocket hook
│   │   ├── services/           # Kết nối API backend & xuất Excel
│   │   ├── App.tsx             # Component chính
│   │   ├── index.css           # Design system tokens (#33CCFF, font Inter)
│   │   └── ...
│   ├── index.html              # HTML chuẩn PWA & Smartphone responsive
│   ├── package.json            # Khai báo thư viện Frontend
│   └── vite.config.ts          # Cấu hình Vite build
├── Procfile                    # File cấu hình Deployment (Heroku / Render / Railway)
├── requirements.txt            # Thư viện Python bắt buộc cho Backend
└── README.md                   # File hướng dẫn vận hành repo này
```

---

## 🚀 Cách tải/push thư mục này lên GitHub

### Cách 1: Sử dụng Giao diện Web GitHub
1. Mở Repository của bạn trên GitHub.
2. Nhấn vào nút **Add file** -> **Upload files**.
3. Chọn toàn bộ nội dung inside thư mục `UPLOAD_CHON_THU_MUC_NAY` và kéo thả vào trình duyệt.
4. Nhập tiêu đề commit (ví dụ: `Cập nhật giao diện smartphone & Modal hướng dẫn`) và bấm **Commit changes**.

### Cách 2: Sử dụng Git Command Line (hoặc Git Bash)
Nếu máy bạn có sẵn Git, di chuyển Terminal tới thư mục này và chạy:
```bash
git init
git remote add origin <URL_REPO_GITHUB_CUA_BAN>
git add .
git commit -m "Cập nhật hoàn chỉnh toàn bộ source BFO WebApp"
git branch -M main
git push -u origin main -f
```

---

## ✨ Các điểm mới đã được tích hợp trong bản này
1. **Giao diện chuẩn Smartphone & Flat Modern**: 
   - Font Inter, tông màu `#33CCFF`.
   - Header cố định (Sticky), thiết kế thu gọn nút cài đặt ⚙️.
   - Nút bấm to chuẩn Touch target (`min-height: 44px`).
   - Modal kiểm tra hóa đơn full-screen trên điện thoại.
2. **Cấu hình đợt trích xuất**:
   - Mặc định hiện 3 trường quan trọng nhất (`Tên người thực hiện`, `MSNV`, `ASM`).
   - Nút `▼ Mở rộng` mở nhanh 6 trường cấu hình nâng cao.
3. **Nút Giới thiệu `?`**:
   - Tự động hiển thị khi người dùng truy cập lần đầu tiên.
   - Modal Slideshow 4 slide hướng dẫn cách trích xuất hóa đơn, kiểm tra dữ liệu và xuất Excel tự động.
4. **Thông báo Toast**:
   - Cập nhật danh sách Gemini Model hiển thị thông báo mờ dần trong 1s, không dùng `alert()` gây gián đoạn.

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
import os
import tempfile
from app.models.schemas import ExportRequest
from app.core.excel_writer import write_to_excel

router = APIRouter()

@router.post("/export")
async def export_excel(req: ExportRequest):
    # Chuyển đổi dữ liệu từ Frontend (mảng Taxes) thành cấu trúc phẳng (mỗi thuế 1 dòng) cho excel_writer
    flat_data_list = []
    
    for inv in req.invoices:
        # Nếu gộp KyHieu và SoChungTuNgoai
        so_hd_full = f"{inv.KyHieu}|{inv.SoChungTuNgoai}" if inv.KyHieu else inv.SoChungTuNgoai
        
        base_dict = {
            "SoChungTuNgoai": so_hd_full,
            "NgayChungTu": inv.NgayChungTu,
            "NhaCungCap": inv.NhaCungCap,
            "MaSoThue": inv.MaSoThue,
            "DienGiai_BoSung": inv.DienGiai_BoSung,
        }
        
        if not inv.Taxes:
            flat_data_list.append(base_dict)
        else:
            for tax in inv.Taxes:
                row = base_dict.copy()
                row["ThueSuat"] = tax.ThueSuat
                row["SoTienTinhThueGTGT"] = tax.SoTienTinhThueGTGT
                row["SoTienThueVAT"] = tax.SoTienThueVAT
                row["ThanhTien"] = tax.ThanhTien
                flat_data_list.append(row)
                
    # Tạo file tạm thời để lưu Excel và trả về qua FileResponse
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp_excel:
        temp_excel_path = tmp_excel.name

    # Nếu Frontend không gửi template, tự động lấy template.xlsx trong thư mục app/data (nếu có)
    template_file = req.template_path
    if not template_file:
        default_template = os.path.join(os.path.dirname(__file__), "..", "..", "data", "template.xlsx")
        if os.path.exists(default_template):
            template_file = default_template

    result = write_to_excel(template_file, temp_excel_path, flat_data_list, req.global_defaults)

    if not result.get("success"):
        if os.path.exists(temp_excel_path):
            os.remove(temp_excel_path)
        raise HTTPException(status_code=500, detail=result.get("error", "Lỗi tạo file Excel"))
    
    def cleanup_file():
        if os.path.exists(temp_excel_path):
            os.remove(temp_excel_path)

    filename_download = req.file_name or "BFO_Export.xlsx"
    if not filename_download.lower().endswith('.xlsx'):
        filename_download = f"{filename_download}.xlsx"

    return FileResponse(
        path=temp_excel_path,
        filename=filename_download,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        background=BackgroundTask(cleanup_file)
    )

from fastapi import APIRouter, UploadFile, File, Form
import os
import tempfile
from app.core.xml_extractor import extract_xml_invoice
from app.core.extractor import extract_invoice_data, extract_online_gemini

router = APIRouter()

@router.post("/extract")
async def extract_invoice(
    file: UploadFile = File(...),
    mode: str = Form("Offline"),
    model_name: str = Form("gemini-3.1-flash-lite"),
    api_key: str = Form(None)
):
    # Read first bytes to accurately detect XML format regardless of filename extension
    file_bytes = await file.read()
    await file.seek(0)
    
    is_xml = False
    filename = file.filename or ""
    file_ext = os.path.splitext(filename)[1].lower()
    
    # Header signature check for XML
    header_snippet = file_bytes[:300].decode('utf-8', errors='ignore').strip().lower()
    if file_ext == ".xml" or header_snippet.startswith("<?xml") or "<invoice" in header_snippet or "<hdon" in header_snippet:
        is_xml = True

    if is_xml:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xml") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        
        try:
            res = extract_xml_invoice(tmp_path)
            return res
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    # Lưu file tạm PDF/Image để xử lý
    suffix = file_ext if file_ext else ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        # Bước 1: Trích xuất Offline (Regex/OCR nội bộ)
        offline_result = extract_invoice_data(tmp_path)
        
        if not offline_result.get("success"):
            return offline_result
            
        data_list = offline_result.get("data_list", [])
        raw_text = offline_result.get("raw_text", "")
        
        # Format lại dữ liệu offline cho UI (tách KyHieu và SoChungTuNgoai)
        formatted_data = {
            "KyHieu": "",
            "SoChungTuNgoai": "",
            "NgayChungTu": "",
            "NhaCungCap": "",
            "MaSoThue": "",
            "DienGiai_BoSung": "",
            "Taxes": []
        }
        
        if data_list:
            base_data = data_list[0]
            so_hd_full = base_data.get("SoChungTuNgoai", "")
            if "|" in so_hd_full:
                parts = so_hd_full.split("|")
                formatted_data["KyHieu"] = parts[0]
                so_num = parts[1].strip()
                formatted_data["SoChungTuNgoai"] = so_num.zfill(8) if so_num.isdigit() else so_num
            else:
                so_num = so_hd_full.strip()
                formatted_data["SoChungTuNgoai"] = so_num.zfill(8) if so_num.isdigit() else so_num
                
            formatted_data["NgayChungTu"] = base_data.get("NgayChungTu", "")
            formatted_data["NhaCungCap"] = base_data.get("NhaCungCap", "")
            formatted_data["MaSoThue"] = base_data.get("MaSoThue", "")
            
            for row in data_list:
                formatted_data["Taxes"].append({
                    "ThueSuat": row.get("ThueSuat", ""),
                    "SoTienTinhThueGTGT": row.get("SoTienTinhThueGTGT", ""),
                    "SoTienThueVAT": row.get("SoTienThueVAT", ""),
                    "ThanhTien": row.get("ThanhTien", "")
                })

        # Bước 2: Gọi AI nếu ở chế độ API Key hoặc Google Login
        if mode in ["API Key", "Google Login"] and raw_text:
            if mode == "API Key":
                if not api_key:
                    return {"success": False, "error": "API Key bị trống! Vui lòng nhập API Key."}
                ai_result = extract_online_gemini(raw_text, api_key=api_key, model_name=model_name)
            else:
                try:
                    import google.auth
                    credentials, project = google.auth.default()
                    ai_result = extract_online_gemini(raw_text, credentials=credentials, model_name=model_name)
                except Exception as e:
                    return {"success": False, "error": f"Lỗi xác thực Google: {str(e)}"}

            if ai_result.get("success"):
                ai_data = ai_result.get("data", {})
                
                # Ghi đè dữ liệu AI lên dữ liệu Offline
                so_hd_ai = str(ai_data.get("SoChungTuNgoai", "")).strip()
                if so_hd_ai:
                    if "|" in so_hd_ai:
                        so_hd_ai = so_hd_ai.split("|")[-1].strip()
                    formatted_data["SoChungTuNgoai"] = so_hd_ai.zfill(8) if so_hd_ai.isdigit() else so_hd_ai

                if ai_data.get("NgayChungTu"): formatted_data["NgayChungTu"] = ai_data["NgayChungTu"]
                if ai_data.get("NhaCungCap"): formatted_data["NhaCungCap"] = ai_data["NhaCungCap"]
                if ai_data.get("MaSoThue"): formatted_data["MaSoThue"] = ai_data["MaSoThue"]
                
                if ai_data.get("Taxes") and len(ai_data["Taxes"]) > 0:
                    formatted_data["Taxes"] = ai_data["Taxes"]
            else:
                return {"success": False, "error": ai_result.get("error", "Không thể kết nối tới AI online")}
                    
        return {"success": True, "data": formatted_data, "raw_text": raw_text}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

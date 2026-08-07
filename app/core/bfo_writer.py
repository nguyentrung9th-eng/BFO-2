import os
import re
import unicodedata
import xlrd
import xlwt
from xlutils.copy import copy
from datetime import datetime

def to_cp1252_str(text: str) -> str:
    """
    Chuẩn hóa chuỗi văn bản về 100% ký tự tương thích Code Page 1252 (windows-1252).
    """
    if not text:
        return ""
    s = str(text).strip()
    try:
        return s.encode('cp1252').decode('cp1252')
    except UnicodeEncodeError:
        s = s.replace('Đ', 'D').replace('đ', 'd')
        s_norm = unicodedata.normalize('NFD', s)
        s_clean = ''.join(c for c in s_norm if unicodedata.category(c) != 'Mn')
        return s_clean.encode('cp1252', 'replace').decode('cp1252')

def parse_date(date_str: str):
    """
    Chuyển đổi chuỗi ngày dạng 'DD/MM/YYYY' hoặc 'YYYY-MM-DD' hoặc 'DD-MM-YYYY'
    thành tuple (year, month, day).
    """
    if not date_str:
        return None
    date_str = date_str.strip()
    try:
        if '/' in date_str:
            parts = date_str.split('/')
            if len(parts) == 3:
                return int(parts[2]), int(parts[1]), int(parts[0])
        elif '-' in date_str:
            parts = date_str.split('-')
            if len(parts) == 3:
                if len(parts[0]) == 4:
                    return int(parts[0]), int(parts[1]), int(parts[2])
                else:
                    return int(parts[2]), int(parts[1]), int(parts[0])
    except Exception:
        pass
    return None

def format_thue_suat(thue_str: str) -> str:
    """
    Chuẩn hóa tỷ lệ thuế thành dạng VAT08%, VAT10%, VAT05%, VAT00%, KTT...
    """
    if not thue_str:
        return "VAT08%"
    s = str(thue_str).strip().upper()
    if s.startswith("VAT") or s == "KTT":
        return s
    
    digits = re.findall(r'\d+', s)
    if digits:
        val = int(digits[0])
        return f"VAT{val:02d}%"
    return "VAT08%"

def write_to_bfo_excel(template_path: str, output_path: str, extracted_data_list: list, global_defaults: dict):
    """
    Điền dữ liệu vào form Nhập BFO thanh toán (mẫu form_nhap_bfo.xls gồm 29 cột).
    Ép mã hóa BIFF CODEPAGE record về 1252 (0x04E4) và chuẩn hóa dữ liệu văn bản Code Page 1252 (windows-1252).
    Format cells: Date với kiểu mm/dd/yyyy cho cột NgayChungTu.
    """
    try:
        if not template_path or not os.path.exists(template_path):
            default_tpl = os.path.join(os.path.dirname(__file__), "..", "data", "form_nhap_bfo.xls")
            if os.path.exists(default_tpl):
                template_path = default_tpl
            else:
                raise FileNotFoundError(f"Không tìm thấy template mẫu: {template_path}")

        rb = xlrd.open_workbook(template_path, formatting_info=True)
        wb = copy(rb)
        
        # BẮT BUỘC: Ép chuẩn mã hóa Workbook và BIFF CODEPAGE Record = 1252 (0x04E4)
        wb.encoding = 'cp1252'
        wb._Workbook__codepage_rec = lambda: b'\x42\x00\x02\x00\xe4\x04'

        ws = wb.get_sheet(0)

        # Style định dạng theo đúng form mẫu (Arial 8pt)
        font = xlwt.Font()
        font.name = 'Arial'
        font.height = 8 * 20  # 8pt

        text_style = xlwt.XFStyle()
        text_style.font = font

        date_style = xlwt.XFStyle()
        date_style.font = font
        date_style.num_format_str = 'mm/dd/yyyy'

        # Định dạng số KHÔNG CÓ DẤU PHẨY PHÂN CÁCH HÀNG NGHÌN (ví dụ 1234567) theo yêu cầu mẫu BFO
        bfo_num_style = xlwt.XFStyle()
        bfo_num_style.font = font
        bfo_num_style.num_format_str = '0'

        current_row = 1  # Dòng 1 (index 0) là Header, dữ liệu bắt đầu từ dòng 2 (index 1)

        for data in extracted_data_list:
            if not data:
                continue

            ngay_raw = str(data.get('NgayChungTu', '')).strip()
            thang_nam = "07/2026"
            date_tuple = parse_date(ngay_raw)
            if date_tuple:
                thang_nam = f"{date_tuple[1]:02d}/{date_tuple[0]}"
            elif ngay_raw and '/' in ngay_raw:
                parts = ngay_raw.split('/')
                if len(parts) >= 2:
                    thang_nam = f"{parts[1].zfill(2)}/{parts[2]}" if len(parts) == 3 else ngay_raw

            so_hd_full = str(data.get('SoChungTuNgoai', '')).strip()
            if '|' in so_hd_full:
                so_hd_display = so_hd_full.split('|')[-1].strip()
            else:
                so_hd_display = so_hd_full

            # Bệnh viện / Đơn vị tổ chức (DienGiai_BoSung)
            bv = str(data.get('DienGiai_BoSung', '')).strip()
            bv_suffix = f"_{bv}" if bv else ""

            # Giữ nguyên tiếng Việt có dấu đầy đủ
            dien_giai = f"THANH TOÁN CHI PHÍ TIẾP KHÁCH THEO KẾ HOẠCH THÁNG {thang_nam} _{so_hd_display}{bv_suffix}"

            # Số tiền (chuyển sang kiểu nguyên/thực để ghi vào cell number format '0')
            pre_tax_raw = data.get('SoTienTinhThueGTGT', 0)
            tax_amt_raw = data.get('SoTienThueVAT', 0)
            post_tax_raw = data.get('ThanhTien', 0)

            try:
                pre_tax = int(round(float(pre_tax_raw))) if str(pre_tax_raw).replace('.', '', 1).isdigit() else 0
                tax_amt = int(round(float(tax_amt_raw))) if str(tax_amt_raw).replace('.', '', 1).isdigit() else 0
                post_tax = int(round(float(post_tax_raw))) if str(post_tax_raw).replace('.', '', 1).isdigit() else pre_tax + tax_amt
            except ValueError:
                pre_tax, tax_amt, post_tax = 0, 0, 0

            ma_hoat_dong = str(global_defaults.get('MaHoatDong', 'LSF0200') or 'LSF0200').strip()
            tt_chiu_phi = str(global_defaults.get('TTChiuPhi', 'LSF') or 'LSF').strip()
            ma_chi_phi = str(global_defaults.get('MaChiPhi', '1512') or '1512').strip()
            ten_nguoi_thuc_hien = str(global_defaults.get('TenNguoiThucHien', '') or 'NGUYỄN VIẾT TRUNG').strip().upper()
            thue_suat = format_thue_suat(data.get('ThueSuat', ''))
            mst = str(data.get('MaSoThue', '')).strip()
            ncc = str(data.get('NhaCungCap', '')).strip()

            # Ghi 29 cột
            # 1: DienGiai
            ws.write(current_row, 0, dien_giai, text_style)
            # 2: LoaiChungTu
            ws.write(current_row, 1, "0", text_style)
            # 3: Loai
            ws.write(current_row, 2, "0", text_style)
            # 4: MaSoTK
            ws.write(current_row, 3, "335", text_style)
            # 5: SoLuong
            ws.write(current_row, 4, "0", text_style)
            # 6: DVT
            ws.write(current_row, 5, "", text_style)
            # 7: DonGia
            ws.write(current_row, 6, "", text_style)
            # 8: ThanhTien (Số tiền KHÔNG CÓ dấu phẩy phẩy phân cách hàng nghìn)
            ws.write(current_row, 7, post_tax, bfo_num_style)
            # 9: MaHopDong
            ws.write(current_row, 8, "", text_style)
            # 10: MaDuTru
            ws.write(current_row, 9, "", text_style)
            # 11: LoaiDauTu
            ws.write(current_row, 10, "", text_style)
            # 12: MaDauTu
            ws.write(current_row, 11, "", text_style)
            # 13: MaHoatDong
            ws.write(current_row, 12, ma_hoat_dong, text_style)
            # 14: TTChiuPhi
            ws.write(current_row, 13, tt_chiu_phi, text_style)
            # 15: MaChiPhi
            ws.write(current_row, 14, ma_chi_phi, text_style)
            # 16: MaTaiSan
            ws.write(current_row, 15, "", text_style)
            # 17: SoCongLenh
            ws.write(current_row, 16, "", text_style)
            # 18: ChungTuDeNghi
            ws.write(current_row, 17, "", text_style)
            # 19: SoChungTuNgoai
            ws.write(current_row, 18, so_hd_full, text_style)

            # 20: NgayChungTu (Date format: mm/dd/yyyy)
            if date_tuple:
                try:
                    date_val = xlrd.xldate.xldate_from_date_tuple((date_tuple[0], date_tuple[1], date_tuple[2]), 0)
                    ws.write(current_row, 19, date_val, date_style)
                except Exception:
                    ws.write(current_row, 19, ngay_raw, text_style)
            else:
                ws.write(current_row, 19, ngay_raw, text_style)

            # 21: NguoiThanhToan (Giữ nguyên dấu tiếng Việt)
            ws.write(current_row, 20, ten_nguoi_thuc_hien, text_style)
            # 22: DiaChi
            ws.write(current_row, 21, "MK", text_style)
            # 23: MaSoThue
            ws.write(current_row, 22, mst, text_style)
            # 24: XuatChoNhanTu (Giữ nguyên dấu tiếng Việt)
            ws.write(current_row, 23, ncc, text_style)
            # 25: DienGiaiThue
            ws.write(current_row, 24, "", text_style)
            # 26: NhomThue
            ws.write(current_row, 25, "NOIDIA", text_style)
            # 27: ThueSuat
            ws.write(current_row, 26, thue_suat, text_style)
            # 28: SoTienTinhThueGTGT (Số tiền KHÔNG CÓ dấu phẩy)
            ws.write(current_row, 27, pre_tax, bfo_num_style)
            # 29: SoTienThueVAT (Số tiền KHÔNG CÓ dấu phẩy)
            ws.write(current_row, 28, tax_amt, bfo_num_style)

            current_row += 1

        out_dir = os.path.dirname(output_path)
        if out_dir and not os.path.exists(out_dir):
            os.makedirs(out_dir, exist_ok=True)

        if not output_path.endswith('.xls'):
            output_path = output_path + '.xls'

        wb.save(output_path)
        return {"success": True, "output_path": output_path}

    except Exception as e:
        return {"success": False, "error": f"Lỗi ghi file BFO Excel: {str(e)}"}

import xml.etree.ElementTree as ET
import re

def extract_xml_invoice(file_path):
    """
    Trích xuất thông tin hóa đơn điện tử từ file XML chuẩn của Tổng cục Thuế Việt Nam
    (Bao gồm VNPT, Viettel, MInvoice, Softdreams, EasyInvoice, BKAV...)
    """
    try:
        # Đọc nội dung file XML
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Loại bỏ namespace nếu có để dễ parse thẻ XML
        content_clean = re.sub(r'\sxmlns(?::\w+)?="[^"]+"', '', content)
        root = ET.fromstring(content_clean)

        formatted_data = {
            "KyHieu": "",
            "SoChungTuNgoai": "",
            "NgayChungTu": "",
            "NhaCungCap": "",
            "MaSoThue": "",
            "DienGiai_BoSung": "",
            "Taxes": []
        }

        def find_text(tags, parent=root):
            for tag in tags:
                elem = parent.find(f".//{tag}")
                if elem is not None and elem.text and elem.text.strip():
                    return elem.text.strip()
            return ""

        # 1. Ký hiệu hóa đơn & Số hóa đơn
        ky_hieu = find_text(["KHMSHDon", "KHHDon", "Serial", "InvoicePattern", "Pattern"])
        so_hd = find_text(["SHDon", "InvoiceNo", "Fkey", "No"])
        
        # Xử lý zfill 8 chữ số cho số hóa đơn
        if so_hd and so_hd.isdigit():
            so_hd = so_hd.zfill(8)

        formatted_data["KyHieu"] = ky_hieu
        formatted_data["SoChungTuNgoai"] = so_hd

        # 2. Ngày hóa đơn
        ngay_hd = find_text(["NLap", "InvoiceDate", "ArisingDate", "IssueDate"])
        if not ngay_hd:
            ngay = find_text(["Ngay"])
            thang = find_text(["Thang"])
            nam = find_text(["Nam"])
            if ngay and thang and nam:
                ngay_hd = f"{ngay.zfill(2)}/{thang.zfill(2)}/{nam}"
        
        if ngay_hd:
            # Normalize YYYY-MM-DD -> DD/MM/YYYY
            m_iso = re.match(r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', ngay_hd)
            if m_iso:
                ngay_hd = f"{m_iso.group(3).zfill(2)}/{m_iso.group(2).zfill(2)}/{m_iso.group(1)}"
            else:
                m_vi = re.match(r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})', ngay_hd)
                if m_vi:
                    ngay_hd = f"{m_vi.group(1).zfill(2)}/{m_vi.group(2).zfill(2)}/{m_vi.group(3)}"

        formatted_data["NgayChungTu"] = ngay_hd

        # 3. Thông tin Đơn vị Bán (NhaCungCap & MaSoThue)
        nban = root.find(".//NBan") or root.find(".//Seller") or root.find(".//Supplier")
        if nban is not None:
            formatted_data["NhaCungCap"] = find_text(["Ten", "SellerName", "Name"], parent=nban)
            mst = find_text(["MST", "SellerTaxCode", "TaxCode"], parent=nban)
            if mst:
                formatted_data["MaSoThue"] = mst
        else:
            formatted_data["NhaCungCap"] = find_text(["TenNBan", "SellerName", "SupplierName"])
            formatted_data["MaSoThue"] = find_text(["MSTNBan", "SellerTaxCode", "SupplierTaxCode"])

        # 4. Trích xuất Chi tiết Thuế & Tiền (THTTien / Taxes)
        tax_list = []
        lt_suat = root.findall(".//LTSuat") or root.findall(".//VATDetail") or root.findall(".//TaxDetail")
        
        if lt_suat:
            for item in lt_suat:
                tsuat = find_text(["TSuat", "VATRate", "Rate"], parent=item)
                thtien = find_text(["ThTien", "Turnover", "Amount"], parent=item)
                tthue = find_text(["TThue", "VATAmount", "TaxAmount"], parent=item)

                if thtien or tthue:
                    pre_tax = float(thtien) if thtien else 0.0
                    tax_amt = float(tthue) if tthue else 0.0
                    post_tax = pre_tax + tax_amt
                    tax_list.append({
                        "ThueSuat": tsuat or "10%",
                        "SoTienTinhThueGTGT": str(int(pre_tax)),
                        "SoTienThueVAT": str(int(tax_amt)),
                        "ThanhTien": str(int(post_tax))
                    })
        else:
            # Fallback nếu hóa đơn 1 dòng tiền tổng
            pre_tax_str = find_text(["TgTCThue", "TotalAmountWithoutVAT", "Amount"])
            tax_amt_str = find_text(["TgTThue", "TotalVATAmount", "VATAmount"])
            total_str = find_text(["TgTTTBSo", "TotalAmountWithVAT", "TotalAmount"])

            if pre_tax_str or total_str:
                pre_tax = float(pre_tax_str) if pre_tax_str else 0.0
                tax_amt = float(tax_amt_str) if tax_amt_str else 0.0
                total = float(total_str) if total_str else (pre_tax + tax_amt)

                tax_list.append({
                    "ThueSuat": "10%",
                    "SoTienTinhThueGTGT": str(int(pre_tax)),
                    "SoTienThueVAT": str(int(tax_amt)),
                    "ThanhTien": str(int(total))
                })

        formatted_data["Taxes"] = tax_list
        return {"success": True, "data": formatted_data, "raw_text": content[:2000]}

    except Exception as e:
        return {"success": False, "error": f"Lỗi đọc file XML hóa đơn: {str(e)}"}

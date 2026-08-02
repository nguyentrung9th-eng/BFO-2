import pdfplumber
import json
import re
import os

# Đường dẫn tĩnh tới keywords.json trong thư mục data của backend
KEYWORD_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'keywords.json')


def load_keywords():
    if os.path.exists(KEYWORD_FILE):
        try:
            with open(KEYWORD_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {}

def clean_supplier_name(name):
    # Tải danh sách từ khóa động từ keywords.json
    keywords_dict = load_keywords()
    supplier_kws = keywords_dict.get("NhaCungCap_Keywords", [
        "đơn vị bán hàng", "tên đơn vị", "tên công ty", "công ty", 
        "nhà cung cấp", "đơn vị cung cấp", "seller"
    ])
    
    # Tạo Regex động từ danh sách đã học
    cleaned_kws = [re.escape(kw.strip().lower()) for kw in supplier_kws]
    kw_pattern = r'^(?:' + '|'.join(cleaned_kws) + r')[^:]{0,30}:\s*'
    
    prev = None
    while prev != name:
        prev = name
        # Loại bỏ các cụm từ khớp với từ khóa
        name = re.sub(kw_pattern, '', name, flags=re.IGNORECASE)
        # Loại bỏ các dấu mở ngoặc/đóng ngoặc/hai chấm/khoảng trắng thừa ở đầu chuỗi
        name = re.sub(r'^[\s:()\[\]-]+', '', name).strip()
        
    return name



def extract_offline_adaptive(text):
    data_template = {
        "SoChungTuNgoai": "",
        "NgayChungTu": "",
        "NhaCungCap": "",
        "MaSoThue": "",
    }
    
    missing_fields = []
    keywords = load_keywords()
    
    # 20 lines limitation for key fields (Invoice No, Serial, Date) as requested by user
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    top_20_text = "\n".join(lines[:20])
    
    # 1. Ký hiệu và Số hóa đơn
    ky_hieu = ""
    for pattern in keywords.get("KyHieu", []):
        try:
            m = re.search(pattern, top_20_text, re.IGNORECASE)
            if m:
                ky_hieu = m.group(1)
                break
        except: pass
        
    so_hd = ""
    for pattern in keywords.get("SoChungTuNgoai", []):
        try:
            m = re.search(pattern, top_20_text, re.IGNORECASE)
            if m:
                so_hd = m.group(1).zfill(8)
                break
        except: pass
        
    if ky_hieu and so_hd:
        data_template["SoChungTuNgoai"] = f"{ky_hieu}|{so_hd}"
    elif so_hd:
        data_template["SoChungTuNgoai"] = so_hd
        missing_fields.append("KyHieu")
    else:
        missing_fields.append("SoChungTuNgoai")

    # 2. NgayChungTu
    for pattern in keywords.get("NgayChungTu", []):
        try:
            m = re.search(pattern, top_20_text, re.IGNORECASE)
            if m:
                if len(m.groups()) >= 3:
                    data_template["NgayChungTu"] = f"{m.group(1).zfill(2)}/{m.group(2).zfill(2)}/{m.group(3)}"
                break
        except: pass

    if not data_template["NgayChungTu"]: missing_fields.append("NgayChungTu")

    # 3. MaSoThue (Ignore buyer 1800156801)
    for pattern in keywords.get("MaSoThue", []):
        try:
            # Cho phép MST chứa khoảng trắng và các ký tự OCR dễ nhầm lẫn bằng cách nới lỏng regex
            pattern = pattern.replace(r"([0-9-]+)", r"([\d\slIoO-]{10,40})")
            pattern = pattern.replace(r"([\d\w/.-]+)", r"([\d\slIoO-]{10,40})")
            matches = re.findall(pattern, text, re.IGNORECASE)
            for tc in matches:
                # Sửa lỗi OCR hay nhầm lẫn số với chữ (1 -> l/I, 0 -> O/o)
                tc = tc.replace('l', '1').replace('I', '1').replace('O', '0').replace('o', '0')
                clean_tc = re.sub(r'[^\d-]', '', tc)
                if "1800156801" not in clean_tc and 10 <= len(clean_tc) <= 15:
                    if clean_tc.startswith('0'):
                        clean_tc = "'" + clean_tc
                    data_template["MaSoThue"] = clean_tc
                    break
            if data_template["MaSoThue"]: break
        except: pass

    if not data_template["MaSoThue"]: missing_fields.append("MaSoThue")

    # 4. NhaCungCap & DiaChiNCC
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    for idx, line in enumerate(lines[:20]):
        line_upper = line.upper()
        # Bỏ qua các dòng chứa nhãn địa chỉ hoặc mã số thuế
        ignore_kws = ["ĐỊA CHỈ", "ADDRESS", "MÃ SỐ THUẾ", "TAX CODE", "MST", "SỐ ĐIỆN THOẠI", "TEL"]
        if any(k in line_upper for k in ignore_kws):
            continue
            
        supplier_entity_keywords = [
            "CÔNG TY", "CHI NHÁNH", "HỘ KINH DOANH", "NHÀ HÀNG", "KHÁCH SẠN", 
            "TẬP ĐOÀN", "DOANH NGHIỆP", "DNTN", "HỢP TÁC XÃ", "TRUNG TÂM", "ĐẠI LÝ"
        ]
        if any(kw in line_upper for kw in supplier_entity_keywords) and "DƯỢC HẬU GIANG" not in line_upper:
            name = line
            # Peek at next line for continuation
            if idx + 1 < len(lines):
                next_line = lines[idx+1]
                new_field_kws = [
                    "mã số thuế", "tax code", "địa chỉ", "address", "tài khoản", "a/c", 
                    "điện thoại", "họ tên", "ký hiệu", "serial", "số (no.)", "số hóa đơn", 
                    "ngày", "date", "mã tham chiếu", "reference code"
                ]
                if not any(k in next_line.lower() for k in new_field_kws) and len(next_line.strip()) > 3:
                    name += " " + next_line.strip()
            data_template["NhaCungCap"] = clean_supplier_name(name)
            break
            
    if not data_template["NhaCungCap"]:
        missing_fields.append("NhaCungCap")

    # 5. Xử lý nhiều dòng thuế suất
    # Tìm kiếm các dòng có chứa "Tổng tiền chịu thuế suất" hoặc "Thuế suất" kèm theo %
    tax_rows = []
    
    summary_keywords = ["tổng", "thuế suất", "cộng", "chịu thuế", "tiền thuế"]
    needs_tax_review = False
    
    for line in lines: # Quét toàn bộ file thay vì chỉ 30 dòng cuối
        line_lower = line.lower()
        
        has_kw = any(k in line_lower for k in summary_keywords)
        text_only = re.sub(r'[\d.,%\s-]', '', line)
        is_num_only_row = ('%' in line) and (len(text_only) < 3) and len(re.findall(r'[\d.]{4,}', line)) >= 1
        is_total_row_no_percent = has_kw and len(re.findall(r'[\d.]{4,}', line)) >= 2
        
        if ("%" in line_lower and has_kw) or is_num_only_row or is_total_row_no_percent:
            # Tìm phần trăm
            percent_match = re.search(r'(\d+)%', line)
            rate = int(percent_match.group(1)) if percent_match else 0
            
            # Tìm các số trên dòng này
            numbers = re.findall(r'\b\d{1,3}(?:\.\d{3})+(?!\d)\b|\b\d+\b', line)
            # Lọc bỏ số của thuế suất (vd số 8)
            if percent_match:
                numbers = [int(n.replace('.', '')) for n in numbers if n != percent_match.group(1)]
            else:
                numbers = [int(n.replace('.', '')) for n in numbers]
                
            # Lấy số lớn hơn 1000
            valid_money = [n for n in numbers if n > 1000]
            
            if not percent_match:
                needs_tax_review = True # Không có % -> Cần review để kiểm tra kết quả nội suy
                
            if len(valid_money) >= 2:
                if len(valid_money) >= 3:
                    base = valid_money[-3]
                    tax = valid_money[-2]
                    total = valid_money[-1]
                    if rate == 0 and base > 0:
                        calc_ratio = tax / base
                        if 0.07 <= calc_ratio <= 0.09:
                            rate = 8
                        elif 0.09 <= calc_ratio <= 0.11:
                            rate = 10
                        elif 0.04 <= calc_ratio <= 0.06:
                            rate = 5
                else:
                    # Chỉ có 2 số, kiểm tra xem có khớp tỷ lệ thuế không
                    n1 = min(valid_money)
                    n2 = max(valid_money)
                    
                    if rate > 0 and n1 > 0 and n2 > 0:
                        ratio = n1 / n2
                        target_ratio = rate / 100.0
                        # Khớp nếu là Tax / Base = rate
                        if abs(ratio - target_ratio) < 0.01:
                            tax = n1
                            base = n2
                            total = base + tax
                            needs_tax_review = True
                        # Khớp nếu là Tax / Total = rate / (100 + rate)
                        elif abs(ratio - (target_ratio / (1 + target_ratio))) < 0.01:
                            tax = n1
                            total = n2
                            base = total - tax
                            needs_tax_review = True
                        else:
                            tax = n1
                            total = n2
                            base = total - tax
                    else:
                        # Nội suy tỷ lệ tốt nhất
                        ratios_to_try = [
                            (8, 0.08, "tax_base"),
                            (10, 0.10, "tax_base"),
                            (5, 0.05, "tax_base"),
                            (8, 0.08/1.08, "tax_total"),
                            (10, 0.10/1.10, "tax_total"),
                            (5, 0.05/1.05, "tax_total"),
                        ]
                        best_rate = 8
                        best_type = "tax_base"
                        min_diff = 999
                        ratio = n1 / n2
                        for r_val, target, r_type in ratios_to_try:
                            diff = abs(ratio - target)
                            if diff < min_diff:
                                min_diff = diff
                                best_rate = r_val
                                best_type = r_type
                        
                        rate = best_rate
                        needs_tax_review = True
                        if best_type == "tax_base":
                            tax = n1
                            base = n2
                            total = base + tax
                        else:
                            tax = n1
                            total = n2
                            base = total - tax
                
                row_dict = {
                    "ThueSuat": f"VAT{str(rate).zfill(2)}%",
                    "SoTienTinhThueGTGT": str(int(base)),
                    "SoTienThueVAT": str(int(tax)),
                    "ThanhTien": str(int(total))
                }
                if row_dict not in tax_rows:
                    tax_rows.append(row_dict)
    # Lọc bỏ dòng tổng gộp (nếu có nhiều dòng thuế suất khác nhau)
    if len(tax_rows) > 1:
        filtered_tax_rows = []
        for i, r in enumerate(tax_rows):
            r_base = int(r["SoTienTinhThueGTGT"]) if r["SoTienTinhThueGTGT"] else 0
            r_tax = int(r["SoTienThueVAT"]) if r["SoTienThueVAT"] else 0
            
            other_base_sum = 0
            other_tax_sum = 0
            for j, o in enumerate(tax_rows):
                if i != j:
                    other_base_sum += int(o["SoTienTinhThueGTGT"]) if o["SoTienTinhThueGTGT"] else 0
                    other_tax_sum += int(o["SoTienThueVAT"]) if o["SoTienThueVAT"] else 0
            
            # Nếu dòng này khớp với tổng tất cả các dòng còn lại (cho phép sai số nhỏ)
            if r_base > 0 and abs(r_base - other_base_sum) < 10 and abs(r_tax - other_tax_sum) < 10:
                continue # Bỏ qua dòng tổng gộp này
            filtered_tax_rows.append(r)
        tax_rows = filtered_tax_rows

    if not tax_rows:
        needs_tax_review = True
        missing_fields.extend(["SoTienTinhThueGTGT", "ThueSuat"])
        tax_rows.append({
            "ThueSuat": "",
            "SoTienTinhThueGTGT": "",
            "SoTienThueVAT": "",
            "ThanhTien": ""
        })

    # Cảnh báo nếu vẫn còn >= 3 dòng thuế hoặc cần review
    if len(tax_rows) >= 3:
        needs_tax_review = True
        
    # Ghép dữ liệu chung và dữ liệu thuế
    results = []
    for tr in tax_rows:
        row_data = data_template.copy()
        row_data.update(tr)
        results.append(row_data)

    needs_review = (len(missing_fields) > 0) or needs_tax_review
    return results, missing_fields, needs_review, needs_tax_review

def extract_invoice_data(pdf_path):
    text = ""
    try:
        # Nếu là file XML nhưng đuôi file bị nhầm thành .pdf
        with open(pdf_path, 'r', encoding='utf-8', errors='ignore') as f:
            head = f.read(300).strip().lower()
            if head.startswith("<?xml") or "<invoice" in head or "<hdon" in head:
                from app.core.xml_extractor import extract_xml_invoice
                return extract_xml_invoice(pdf_path)

        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
    except Exception as e:
        err_msg = str(e)
        if "No /Root object" in err_msg or "Is this really a PDF" in err_msg:
            return {"success": False, "error": "File tải lên không đúng định dạng PDF chuẩn (có thể là file XML/Ảnh hoặc bị đổi đuôi file). Vui lòng chọn lại đúng file hóa đơn XML/PDF."}
        return {"success": False, "error": f"Lỗi đọc file PDF: {err_msg}"}
        
    if not text.strip():
        return {"success": False, "error": "Không tìm thấy văn bản trong file PDF."}

    try:
        # Results is now a list of rows
        results, missing_fields, needs_review, needs_tax_review = extract_offline_adaptive(text)
        return {
            "success": True, 
            "data_list": results, 
            "raw_text": text,
            "needs_review": needs_review,
            "needs_tax_review": needs_tax_review,
            "missing_fields": missing_fields
        }
    except Exception as e:
        return {"success": False, "error": f"Lỗi trích xuất: {str(e)}"}

def create_gemini_client(credentials=None, api_key=None):
    from google import genai
    if api_key:
        return genai.Client(api_key=api_key)
    elif credentials:
        from google.auth.transport.requests import Request
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        # google-genai Developer API requires api_key. Bypass it and use Bearer token.
        client = genai.Client(api_key='OAUTH_MODE')
        if 'x-goog-api-key' in client._api_client._http_options.headers:
            del client._api_client._http_options.headers['x-goog-api-key']
        client._api_client._http_options.headers['Authorization'] = f'Bearer {credentials.token}'
        return client
    return None

def extract_online_gemini(raw_text, credentials=None, api_key=None, model_name='gemini-2.5-flash'):
    try:
        client = create_gemini_client(credentials, api_key)
        if not client:
            return {"success": False, "error": "Thiếu thông tin xác thực (API Key hoặc Google Auth)."}
        
        clean_model_name = model_name
        if clean_model_name.startswith("models/"):
            clean_model_name = clean_model_name[7:]
        
        # Get first 20 lines of text for key field extraction references
        lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
        header_text = "\n".join(lines[:20])
        
        prompt = f"""
        Bạn là trợ lý trích xuất hóa đơn chuyên nghiệp. Hãy phân tích đoạn văn bản hóa đơn sau đây và trích xuất các thông tin chính xác theo cấu trúc JSON:
        {{
          "SoChungTuNgoai": "Số hóa đơn (chỉ lấy phần số, BẮT BUỘC ĐỦ 8 CHỮ SỐ có các số 0 ở đầu nếu ngắn hơn, ví dụ '00002662', không lấy ký hiệu như '1C26MAA')",
          "NgayChungTu": "Ngày hóa đơn dạng DD/MM/YYYY",
          "NhaCungCap": "Tên công ty bán hàng đầy đủ",
          "MaSoThue": "Mã số thuế người bán (viết liền không dấu cách, GIỮ NGUYÊN dấu gạch ngang nếu có)",
          "Taxes": [
            {{
              "ThueSuat": "Mức thuế suất dạng phần trăm (Ví dụ: 'VAT08%', 'VAT10%', 'VAT05%', 'VAT00%', hoặc 'KHONGTHUE')",
              "SoTienTinhThueGTGT": "Số tiền tính thuế GTGT (chỉ lấy phần số nguyên bản ví dụ '8910216')",
              "SoTienThueVAT": "Số tiền thuế VAT (chỉ lấy phần số nguyên bản ví dụ '712817')",
              "ThanhTien": "Tổng tiền thanh toán của mức thuế này (chỉ lấy phần số nguyên bản)"
            }}
          ]
        }}

        Tham khảo 20 dòng đầu tiên của hóa đơn chứa thông tin chính:
        \"\"\"
        {header_text}
        \"\"\"

        Toàn bộ văn bản hóa đơn để tham khảo địa chỉ và mã số thuế:
        \"\"\"
        {raw_text}
        \"\"\"

        LƯU Ý QUAN TRỌNG:
        - Output phải là JSON hợp lệ, không chứa bất kỳ ký tự nào ngoài JSON object.
        - Nếu hóa đơn có nhiều dòng/mặt hàng cùng chung MỘT mức thuế suất (ví dụ cùng là 8%), BẮT BUỘC phải gộp (cộng dồn) chúng lại thành 1 object duy nhất trong mảng `Taxes`. Nguyên tắc: 1 mức thuế suất chỉ có duy nhất 1 dòng tương ứng cho tổng tiền của mức thuế suất đó.
        - TUYỆT ĐỐI KHÔNG tự sinh ra, tính toán hay bịa đặt các con số tiền ảo không xuất hiện trong văn bản hóa đơn. Nếu văn bản không có thông tin, hãy để trống "".
        """
        
        response = client.models.generate_content(
            model=clean_model_name,
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        
        # Parse JSON output
        text_res = response.text.strip()
        if text_res.startswith("```json"):
            text_res = text_res[7:]
        elif text_res.startswith("```"):
            text_res = text_res[3:]
        if text_res.endswith("```"):
            text_res = text_res[:-3]
            
        result = json.loads(text_res.strip())
        
        # Clean tax code programmatically just in case
        mst = result.get("MaSoThue", "")
        # Sửa lỗi OCR hay nhầm lẫn
        mst = mst.replace('l', '1').replace('I', '1').replace('O', '0').replace('o', '0')
        clean_tc = re.sub(r'[^\d-]', '', mst)
        if 10 <= len(clean_tc) <= 15:
            if clean_tc.startswith('0'):
                result["MaSoThue"] = "'" + clean_tc
            else:
                result["MaSoThue"] = clean_tc
        else:
            if clean_tc:
                if clean_tc.startswith('0'):
                    result["MaSoThue"] = "'" + clean_tc
                else:
                    result["MaSoThue"] = clean_tc
            
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

def append_new_keyword(field_key, new_pattern):
    keywords_dict = load_keywords()
    if field_key not in keywords_dict:
        keywords_dict[field_key] = []
        
    if new_pattern not in keywords_dict[field_key]:
        keywords_dict[field_key].append(new_pattern)
        try:
            with open(KEYWORD_FILE, 'w', encoding='utf-8') as f:
                json.dump(keywords_dict, f, ensure_ascii=False, indent=4)
            return True
        except Exception as e:
            print(f"Error saving keywords: {e}")
            return False
    return False

def adaptive_learn_rules(raw_text, missing_fields, ai_data, credentials=None, api_key=None, model_name='gemini-2.5-flash'):
    learned_logs = []
    if not api_key and not credentials:
        return learned_logs
        
    try:
        from pydantic import BaseModel, Field
        
        client = create_gemini_client(credentials, api_key)
        if not client:
            return learned_logs
            
        clean_model_name = model_name
        if clean_model_name.startswith("models/"):
            clean_model_name = clean_model_name[7:]
            
        class RuleSchema(BaseModel):
            pattern: str = Field(description="Biểu thức regex hoặc từ khóa nhãn")
            
        for field in missing_fields:
            ai_val = str(ai_data.get(field, "")).strip()
            if not ai_val:
                continue
                
            is_regex_field = field in ["SoChungTuNgoai", "KyHieu", "NgayChungTu", "MaSoThue"]
            
            prompt = f"Trường cần trích xuất: {field}\nGiá trị AI tìm được: '{ai_val}'\n"
            if is_regex_field:
                prompt += "Hãy trả về một biểu thức Regex (Python) với 1 Capture Group để lấy giá trị trên từ văn bản. Ví dụ: `Mã số thuế.*?([\\d\\s-]+)`\n"
            else:
                prompt += "Hãy trả về TỪ KHÓA NHÃN (Keyword Prefix) đứng ngay trước giá trị trên. Ví dụ: `đơn vị bán hàng`.\n"
                
            prompt += f"Văn bản:\n\"\"\"{raw_text}\"\"\""
            
            response = client.models.generate_content(
                model=clean_model_name,
                contents=prompt,
                config={"response_mime_type": "application/json", "response_schema": RuleSchema}
            )
            
            try:
                rule_data = json.loads(response.text.strip())
                new_pattern = rule_data.get("pattern", "").strip()
            except:
                continue
                
            if not new_pattern:
                continue
                
            is_valid = False
            target_key = field
            
            if is_regex_field:
                try:
                    m = re.search(new_pattern, raw_text, re.IGNORECASE)
                    if m and len(m.groups()) >= 1:
                        extracted = m.group(1).strip()
                        clean_regex = re.sub(r'[^\d-]', '', extracted)
                        clean_ai = re.sub(r'[^\d-]', '', ai_val)
                        if clean_regex and clean_regex in clean_ai or clean_ai in clean_regex:
                            is_valid = True
                except:
                    pass
            else:
                if len(new_pattern) > 2 and new_pattern.lower() in raw_text.lower():
                    is_valid = True
                target_key = field + "_Keywords" if field in ["NhaCungCap", "DiaChiNCC"] else field
                if field == "DiaChiNCC": target_key = "DiaChi_Keywords"
                
            if is_valid:
                added = append_new_keyword(target_key, new_pattern)
                if added:
                    learned_logs.append(f"[{field}] {new_pattern}")
                    
    except Exception as e:
        print("Adaptive learning error:", e)
        
    return learned_logs

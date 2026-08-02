from pydantic import BaseModel

class TaxLine(BaseModel):
    ThueSuat: str
    SoTienTinhThueGTGT: str
    SoTienThueVAT: str
    ThanhTien: str

class InvoiceData(BaseModel):
    KyHieu: str = ""
    SoChungTuNgoai: str = ""
    NgayChungTu: str = ""
    NhaCungCap: str = ""
    MaSoThue: str = ""
    DienGiai_BoSung: str = ""
    Taxes: list[TaxLine] = []

class ExportRequest(BaseModel):
    template_path: str
    file_name: str = ""
    global_defaults: dict
    invoices: list[InvoiceData]

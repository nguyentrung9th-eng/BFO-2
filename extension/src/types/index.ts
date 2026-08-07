export interface TaxLine {
  rate: string;
  preTax: string;
  tax: string;
  postTax: string;
}

export interface InvoiceData {
  KyHieu: string;
  SoChungTuNgoai: string;
  NgayChungTu: string;
  NhaCungCap: string;
  MaSoThue: string;
  DienGiai_BoSung: string;
  Taxes: TaxLine[];
}

export interface GlobalConfigData {
  TenNguoiThucHien: string;
  MaHoatDong: string;
  TTChiuPhi: string;
  MaChiPhi: string;
  MSNV: string;
  ASM: string;
  HinhThucThanhToan: string;
  KTPT: string;
  GhiChu: string;
}

export interface ExportOptions {
  trichPhi: boolean;
  bfoThanhToan: boolean;
}

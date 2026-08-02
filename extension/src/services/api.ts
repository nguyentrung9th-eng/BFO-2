import type { GlobalConfigData, InvoiceData } from '../types';

export const getDesktopPath = async (): Promise<string> => {
  try {
    const res = await fetch('https://bfo-online-2.up.railway.app/api/desktop-path');
    const data = await res.json();
    if (data.success && data.desktop_path) {
      return data.desktop_path;
    }
  } catch (error) {
    console.error('Error fetching desktop path:', error);
  }
  return '';
};

export const exportExcel = async (
  extractedInvoices: InvoiceData[], 
  globalConfig: GlobalConfigData, 
  fileName: string
): Promise<{ success: boolean; blob?: Blob; error?: string }> => {
  try {
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_path: "",
        file_name: fileName,
        global_defaults: {
          "MaHoatDong": globalConfig.MaHoatDong,
          "TTChiuPhi": globalConfig.TTChiuPhi,
          "MaChiPhi": globalConfig.MaChiPhi,
          "MSNV": globalConfig.MSNV,
          "ASM": globalConfig.ASM,
          "HinhThucThanhToan": globalConfig.HinhThucThanhToan,
          "KTPT": globalConfig.KTPT,
          "GhiChu": globalConfig.GhiChu,
          "TenNguoiThucHien": globalConfig.TenNguoiThucHien
        },
        invoices: extractedInvoices.map((inv: any) => ({
          KyHieu: inv.KyHieu,
          SoChungTuNgoai: inv.SoChungTuNgoai,
          NgayChungTu: inv.NgayChungTu,
          NhaCungCap: inv.NhaCungCap,
          MaSoThue: inv.MaSoThue,
          DienGiai_BoSung: inv.DienGiai_BoSung,
          Taxes: inv.Taxes.map((t: any) => ({
            ThueSuat: t.rate === 'other' ? '' : (t.rate === '0' ? 'KHONGTHUE' : `VAT${t.rate.padStart(2, '0')}%`),
            SoTienTinhThueGTGT: t.preTax,
            SoTienThueVAT: t.tax,
            ThanhTien: t.postTax
          }))
        }))
      })
    });

    if (response.ok) {
      const blob = await response.blob();
      return { success: true, blob };
    } else {
      const result = await response.json();
      return { success: false, error: result.error || result.detail || "Không xác định" };
    }
  } catch (err: any) {
    return { success: false, error: "Lỗi kết nối tới Máy chủ khi xuất Excel!" };
  }
};

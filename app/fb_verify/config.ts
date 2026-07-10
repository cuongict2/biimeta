// =============================================================
// FILE CẤU HÌNH TRUNG TÂM - FB VERIFY TOOL
// Chỉnh sửa các giá trị dưới đây theo môi trường của bạn
// =============================================================

const fbVerifyConfig = {
  // ---------------------------------------------------------------
  // DOMAIN API BIIMETA
  // - Để trống "" hoặc dùng "local" sẽ tự dùng domain hiện tại
  // - Nhập domain ngoài nếu API chạy trên server khác
  // Ví dụ: "https://biimeta.com" hoặc "http://192.168.1.10:3000"
  // ---------------------------------------------------------------
  BIIMETA_DOMAIN: "https://biimeta.duckdns.org",

  // ---------------------------------------------------------------
  // CẤU HÌNH SẢN PHẨM BIIMETA
  // ID sản phẩm acc Facebook không verify (dùng khi tự mua)
  // ---------------------------------------------------------------
  BIIMETA_ACC_PRODUCT_ID: "1636",

  // ID sản phẩm Hotmail (Biimeta)
  BIIMETA_HOTMAIL_PRODUCT_ID: "5814",

  // API Key Biimeta
  BIIMETA_API_KEY: "23c2163ebb47b39c697012ba042ba847",

  // Code import account Biimeta
  BIIMETA_IMPORT_CODE: "6849999b4cb3c",

  // ---------------------------------------------------------------
  // API KEY DONGVANFB
  // ---------------------------------------------------------------
  DVFB_API_KEY: "VNcufFZeTWXisupNZnyjWkih3",

  // ---------------------------------------------------------------
  // PROXY MẶC ĐỊNH (để trống nếu không dùng)
  // ---------------------------------------------------------------
  DEFAULT_PROXY: "23.106.231.9:80:cuongict-rotate:biimeta123",
};

export default fbVerifyConfig;
export type FbVerifyConfig = typeof fbVerifyConfig;

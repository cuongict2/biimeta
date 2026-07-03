import crypto from "crypto";

/**
 * Interface cho dữ liệu Webhook gửi từ Vietcombank
 */
export interface VCBWebhookPayload {
  transaction_id: string; // Mã giao dịch duy nhất từ ngân hàng
  order_id: string;      // Mã đơn hàng tương ứng trong hệ thống (chính là order id)
  amount: number;         // Số tiền giao dịch
  status: string;         // Trạng thái thanh toán (ví dụ: 'SUCCESS')
  timestamp: string;      // Thời gian giao dịch từ ngân hàng
  signature: string;      // Chữ ký số để xác thực tính toàn vẹn
}

/**
 * Tạo chữ ký số (Signature) từ payload để gửi hoặc kiểm tra
 * Sử dụng thuật toán SHA-256 mã hóa với khóa bí mật (HMAC-SHA256)
 */
export function generateVCBSignature(
  payload: Omit<VCBWebhookPayload, "signature">,
  secretKey: string
): string {
  // Sắp xếp các key theo thứ tự alphabet để đảm bảo tính nhất quán của chuỗi data ký
  const sortedKeys = Object.keys(payload).sort() as Array<keyof typeof payload>;
  
  const signString = sortedKeys
    .map((key) => `${key}=${payload[key]}`)
    .join("&");

  return crypto
    .createHmac("sha256", secretKey)
    .update(signString)
    .digest("hex");
}

/**
 * Xác thực dữ liệu webhook nhận từ Vietcombank
 */
export function verifyVCBWebhook(
  payload: VCBWebhookPayload,
  secretKey: string
): boolean {
  const { signature, ...dataToSign } = payload;
  
  if (!signature) {
    return false;
  }

  const expectedSignature = generateVCBSignature(dataToSign, secretKey);
  
  // Sử dụng timingSafeEqual để ngăn chặn tấn công dò thời gian (timing attacks)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}
export type { VCBWebhookPayload as VCBPayload };
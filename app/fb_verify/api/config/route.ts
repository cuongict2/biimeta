import { NextResponse } from "next/server";
import config from "../../config";

// Expose cac config an toan cho phia client (khong expose API key nhay cam)
export async function GET() {
  return NextResponse.json({
    defaultProxy: config.DEFAULT_PROXY,
    accProductId: config.BIIMETA_ACC_PRODUCT_ID,
    hotmailProductId: config.BIIMETA_HOTMAIL_PRODUCT_ID,
  });
}

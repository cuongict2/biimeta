import { NextRequest, NextResponse } from "next/server";
import config from "../../config";

function getBiimetaDomain(req: NextRequest): string {
  return config.BIIMETA_DOMAIN && config.BIIMETA_DOMAIN !== ""
    ? config.BIIMETA_DOMAIN.replace(/\/$/, "")
    : req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account, filter = "1" } = body;

    if (!account) {
      return NextResponse.json({ status: "error", message: "Account data is empty" }, { status: 400 });
    }

    const domain = getBiimetaDomain(req);
    const params = new URLSearchParams({
      code: config.BIIMETA_IMPORT_CODE,
      api_key: config.BIIMETA_API_KEY,
      account,
      filter,
    });

    const url = `${domain}/api/importAccount.php?${params.toString()}`;
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    return NextResponse.json({ status: "success", http_code: res.status, server_response: text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}

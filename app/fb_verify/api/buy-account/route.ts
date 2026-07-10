import { NextRequest, NextResponse } from "next/server";
import config from "../../config";

function getBiimetaDomain(req: NextRequest): string {
  return config.BIIMETA_DOMAIN && config.BIIMETA_DOMAIN !== ""
    ? config.BIIMETA_DOMAIN.replace(/\/$/, "")
    : req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source") || "biimeta";
  const id = searchParams.get("id") || config.BIIMETA_ACC_PRODUCT_ID;

  try {
    let url = "";
    if (source === "biimeta") {
      const domain = getBiimetaDomain(req);
      url = `${domain}/api/buy_product?api_key=${config.BIIMETA_API_KEY}&action=buyProduct&id=${id}&amount=1`;
    } else if (source === "dvfb") {
      url = `https://api.dongvanfb.net/user/buy?account_type=1&quality=1&type=full&apikey=${config.DVFB_API_KEY}`;
    } else {
      return NextResponse.json({ status: "error", message: "Unknown source" }, { status: 400 });
    }

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}

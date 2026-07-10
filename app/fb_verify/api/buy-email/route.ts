import { NextRequest, NextResponse } from "next/server";
import config from "../../config";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source") || "dvfb";
  const tabId = searchParams.get("tab_id") || "default";
  const origin = req.nextUrl.origin;

  try {
    if (source === "emailondeck") {
      const res = await fetch(`${origin}/fb_verify/api/emailondeck?action=new&id=${tabId}`, { cache: "no-store" });
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      const url = `https://api.dongvanfb.net/user/buy?account_type=1&quality=1&type=full&apikey=${config.DVFB_API_KEY}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}

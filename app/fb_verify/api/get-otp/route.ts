import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, refresh_token, client_id, source, tab_id } = body;
    const origin = req.nextUrl.origin;

    if (source === "emailondeck") {
      if (!email) return NextResponse.json({ status: "error", message: "Missing email" }, { status: 400 });
      // Goi internal emailondeck API
      const res = await fetch(`${origin}/fb_verify/api/emailondeck?action=messages&id=${tab_id || "default"}`, { cache: "no-store" });
      const data = await res.json();
      return NextResponse.json(data);
    }

    // DVFB Oauth2
    if (!email || !refresh_token || !client_id) {
      return NextResponse.json({ status: "error", message: "Missing email/refresh_token/client_id" }, { status: 400 });
    }

    const res = await fetch("https://tools.dongvanfb.net/api/get_code_oauth2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, refresh_token, client_id, type: "facebook" }),
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}

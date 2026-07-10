import { NextRequest, NextResponse } from "next/server";

const DEVICE_ID = "8edb19ab-b150-45ce-a98f-4ee5f15-MSYS";
const UA = "Dalvik/2.1.0 (Linux; U; Android 10; SM-G930S Build/QQ3A.200805.001) [FBAN/EMA;FBBV/724844624;FBAV/457.0.0.0.52;FBDV/SM-G930S;FBSV/10;FBCX/msys;FBDM/{density=3.5}]";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const otp = searchParams.get("otp") || "";
  const proxy = searchParams.get("proxy") || "";

  if (!token || !email || !otp) {
    return NextResponse.json({ error: "Missing token/email/otp" }, { status: 400 });
  }

  const type = email.includes("@") ? "EMAIL" : "PHONE";

  const body = new URLSearchParams({
    normalized_contactpoint: email,
    contactpoint_type: type,
    code: otp,
    source: "ANDROID_DIALOG_API",
    surface: "hard_cliff",
    device_id: DEVICE_ID,
    format: "json",
    locale: "vi_VN",
    client_country_code: "VN",
    fb_api_req_friendly_name: "confirmContactpoint",
    fb_api_caller_class: "ConfCodeInputFragment",
  });

  const headers: Record<string, string> = {
    Authorization: `OAuth ${token}`,
    "X-FB-Connection-Type": "WIFI",
    "X-FB-HTTP-Engine": "Liger",
    "X-FB-Client-IP": "True",
    "X-FB-Server-Cluster": "True",
    "X-ASBD-ID": "129477",
    "X-TINCAN": "true",
    "X-Graph-Protocol-Version": "v17.0",
    "X-FB-Friendly-Name": "confirmContactpoint",
    "X-FB-Net-HNI": "45204",
    "X-FB-SIM-HNI": "45204",
    "User-Agent": UA,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Node fetch khong ho tro proxy truc tiep, log proxy de debug
  if (proxy) console.log("[verify-otp] proxy:", proxy);

  try {
    const res = await fetch("https://graph.facebook.com/me/confirm_contactpoint", {
      method: "POST",
      headers,
      body: body.toString(),
    });

    const text = await res.text();
    if (!text) {
      return NextResponse.json({ error: { message: "Empty response from Facebook" } });
    }
    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: { message: "Fetch error: " + msg } }, { status: 500 });
  }
}

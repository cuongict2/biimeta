import { NextRequest, NextResponse } from "next/server";

const DEVICE_ID = "8edb19ab-b150-45ce-a98f-4ee5f15-MSYS";
const FAMILY_DEVICE_ID = "8edb19ab-b150-45ce-a98f-4ee5f15f7cbe";
const UA = "Dalvik/2.1.0 (Linux; U; Android 10; SM-G930S Build/QQ3A.200805.001) [FBAN/EMA;FBBV/724844624;FBAV/457.0.0.0.52;FBDV/SM-G930S;FBSV/10;FBCX/msys;FBDM/{density=3.5}]";

async function warmup(token: string) {
  try {
    await fetch(`https://graph.facebook.com/me?access_token=${token}`, {
      headers: { "User-Agent": UA },
    });
  } catch {}
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  if (!token || !email) {
    return NextResponse.json({ error: "Missing token/email" }, { status: 400 });
  }

  // Warmup
  await warmup(token);
  await sleep(3000 + Math.random() * 4000);

  const type = email.includes("@") ? "EMAIL" : "PHONE";

  const body = new URLSearchParams({
    add_contactpoint: email,
    add_contactpoint_type: type,
    device_id: DEVICE_ID,
    family_device_id: FAMILY_DEVICE_ID,
    locale: "vi_VN",
    client_country_code: "VN",
    access_token: token,
  });

  try {
    const res = await fetch("https://graph.facebook.com/me/edit_registration_contactpoint", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        Connection: "keep-alive",
      },
      body: body.toString(),
    });

    const text = await res.text();
    if (!text) {
      return NextResponse.json({ error: { message: "Empty response from Facebook (proxy died?)" } });
    }
    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: { message: "Fetch error: " + msg } }, { status: 500 });
  }
}

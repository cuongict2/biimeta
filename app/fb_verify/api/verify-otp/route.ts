
import { NextRequest, NextResponse } from "next/server";
import { generateFingerprint, buildFBHeaders, normalizeContactpoint, fbPost } from "../fb-helpers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const otp = searchParams.get("otp") || "";
  const proxy = searchParams.get("proxy") || "";

  if (!token || !email || !otp) {
    return NextResponse.json({ error: "Missing token/email/otp" }, { status: 400 });
  }

  const fp = generateFingerprint(token);
  const { value: contactpoint, type } = normalizeContactpoint(email);
  const headers = buildFBHeaders(fp, token);
  headers["X-FB-Friendly-Name"] = "confirmContactpoint";

  const body = new URLSearchParams({
    normalized_contactpoint: contactpoint,
    contactpoint_type: type,
    code: otp,
    source: "ANDROID_DIALOG_API",
    surface: "hard_cliff",
    device_id: fp.deviceId,
    family_device_id: fp.familyDeviceId,
    locale: "vi_VN",
    client_country_code: "VN",
    format: "json",
    fb_api_req_friendly_name: "confirmContactpoint",
    fb_api_caller_class: "ConfCodeInputFragment",
  });

  if (proxy) console.log("[verify-otp] proxy:", proxy);

  try {
    const res = await fbPost("/me/confirm_contactpoint", headers, body.toString());
    console.log("[verify-otp] Status:", res.status);

    // Neu Facebook yeu cau checkpoint (Integrity required)
    if (res.headers["x-fb-integrity-required"] === "checkpoint" || res.headers["x-fb-integrity-session-id"]) {
      return NextResponse.json({
        error: {
          message: "The user is enrolled in a blocking, logged-in checkpoint",
          code: 190,
          error_subcode: 490,
          type: "OAuthException"
        }
      });
    }

    if (!res.body || res.body.trim().length === 0) {
      return NextResponse.json({ error: { message: "Empty response from Facebook (possibly checkpoint)", code: 190, error_subcode: 490 } });
    }

    try {
      return NextResponse.json(JSON.parse(res.body));
    } catch {
      return NextResponse.json({ error: { message: "Invalid JSON: " + res.body.substring(0, 200) } });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: { message: "Request error: " + msg } }, { status: 500 });
  }
}

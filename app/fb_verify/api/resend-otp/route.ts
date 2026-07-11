import { NextRequest, NextResponse } from "next/server";
import { generateFingerprint, buildFBHeaders, normalizeContactpoint, fbPost } from "../fb-helpers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const proxy = searchParams.get("proxy") || "";

  if (!token || !email) {
    return NextResponse.json({ error: "Missing token/email" }, { status: 400 });
  }

  const fp = generateFingerprint(token);
  const { value: contactpoint, type } = normalizeContactpoint(email);
  
  const headers = buildFBHeaders(fp);
  delete headers["Authorization"];
  headers["X-FB-Friendly-Name"] = "editRegistrationContactpoint";

  const body = new URLSearchParams({
    add_contactpoint: contactpoint,
    add_contactpoint_type: type,
    device_id: fp.deviceId,
    family_device_id: fp.familyDeviceId,
    locale: "vi_VN",
    client_country_code: "VN",
    access_token: token,
    format: "json",
    fb_api_req_friendly_name: "editRegistrationContactpoint",
    fb_api_caller_class: "EditContactPointDialogFragment",
  });

  try {
    // Gui post request qua proxy
    const res = await fbPost("/me/edit_registration_contactpoint", headers, body.toString(), proxy);
    console.log("[resend-otp] Status:", res.status, "Body:", res.body);

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
      return NextResponse.json({ error: { message: "Empty response from Facebook", code: 190 } });
    }

    try {
      const parsed = JSON.parse(res.body);
      if (parsed.result === true || parsed.status === "success") {
        return NextResponse.json({ status: "success", message: "OTP resent successfully" });
      }
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: { message: "Invalid JSON: " + res.body.substring(0, 200) } });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: { message: "Request error: " + msg } }, { status: 500 });
  }
}

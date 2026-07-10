import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Thu muc luu cookie - dung os.tmpdir() de dam bao ghi duoc
const COOKIE_DIR = path.join(os.tmpdir(), "emailondeck_cookies");
if (!fs.existsSync(COOKIE_DIR)) fs.mkdirSync(COOKIE_DIR, { recursive: true });

const UA_LIST = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.184 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.164 Mobile Safari/537.36",
];

function randomUA() { return UA_LIST[Math.floor(Math.random() * UA_LIST.length)]; }

function getCookieFile(id: string) {
  return path.join(COOKIE_DIR, `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
}

// Doc cookie tu file
function loadCookies(id: string): Record<string, string> {
  const file = getCookieFile(id);
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return {}; }
}

// Luu cookie vao file
function saveCookies(id: string, cookies: Record<string, string>) {
  fs.writeFileSync(getCookieFile(id), JSON.stringify(cookies), "utf8");
}

// Parse Set-Cookie header
function parseSetCookie(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  const raw = headers.getSetCookie ? headers.getSetCookie() : [];
  for (const c of raw) {
    const part = c.split(";")[0].trim();
    const eqIdx = part.indexOf("=");
    if (eqIdx > 0) {
      result[part.substring(0, eqIdx).trim()] = part.substring(eqIdx + 1).trim();
    }
  }
  return result;
}

// Serialize cookie sang string de gui len server
function serializeCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}

const BASE_HEADERS = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
  "Referer": "https://www.emailondeck.com/",
  "Origin": "https://www.emailondeck.com",
};

async function fetchWithCookies(url: string, id: string, extraHeaders: Record<string, string> = {}) {
  const cookies = loadCookies(id);
  const res = await fetch(url, {
    headers: {
      ...BASE_HEADERS,
      ...extraHeaders,
      "User-Agent": randomUA(),
      ...(Object.keys(cookies).length > 0 ? { "Cookie": serializeCookies(cookies) } : {}),
    },
    redirect: "follow",
    cache: "no-store",
  });
  // Merge cookies moi vao
  const newCookies = parseSetCookie(res.headers);
  if (Object.keys(newCookies).length > 0) {
    saveCookies(id, { ...cookies, ...newCookies });
  }
  return res;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";
  const id = searchParams.get("id") || "default";

  try {
    if (action === "new") {
      // Xoa cookie cu, tao session moi
      const cookieFile = getCookieFile(id);
      if (fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);

      // Buoc 1: tao session
      await fetchWithCookies("https://www.emailondeck.com/", id);

      // Buoc 2: tao email moi
      const res2 = await fetchWithCookies(
        "https://www.emailondeck.com/ajax/ce-new-email.php?req=del",
        id,
        { "X-Requested-With": "XMLHttpRequest" }
      );
      const text = await res2.text();

      // Trich xuat email
      const emailMatch = text.match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);
      const email = emailMatch ? emailMatch[0] : null;

      if (text.includes("@") || email) {
        return NextResponse.json({ id, email, raw: text });
      } else {
        return NextResponse.json({ id, email: null, raw: text, error: "No email found" });
      }
    }

    if (action === "messages") {
      const cookieFile = getCookieFile(id);
      if (!fs.existsSync(cookieFile)) {
        return NextResponse.json({ error: "invalid id - no cookie found" }, { status: 400 });
      }

      const res = await fetchWithCookies(
        "https://www.emailondeck.com/ajax/messages.php",
        id,
        { "X-Requested-With": "XMLHttpRequest" }
      );
      const html = await res.text();

      // Tim OTP (5-8 chu so)
      const otpMatch = html.match(/\b\d{5,8}\b/);
      if (otpMatch) {
        return NextResponse.json({ otp: otpMatch[0] });
      } else {
        return NextResponse.json({ otp: null });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}

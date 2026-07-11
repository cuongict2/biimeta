import { HttpsProxyAgent } from "https-proxy-agent";
import * as https from "https";
import * as zlib from "zlib";

/**
 * Tao HttpsProxyAgent tu chuoi proxy IP:Port:User:Pass hoac IP:Port
 */
export function getProxyAgent(proxyString?: string): HttpsProxyAgent<string> | undefined {
  if (!proxyString || proxyString.trim().length === 0) return undefined;
  
  try {
    const parts = proxyString.trim().split(":");
    if (parts.length >= 2) {
      const host = parts[0];
      const port = parts[1];
      let auth = "";
      if (parts.length >= 4) {
        auth = `${parts[2]}:${parts[3]}`;
      }
      
      const proxyUrl = auth 
        ? `http://${auth}@${host}:${port}` 
        : `http://${host}:${port}`;
        
      return new HttpsProxyAgent(proxyUrl);
    }
  } catch (e) {
    console.log("[ProxyAgent] Parse error:", e instanceof Error ? e.message : String(e));
  }
  return undefined;
}


import * as crypto from "crypto";

// ===== DANH SACH THIET BI ANDROID THAT =====
const DEVICES = [
  { model: "SM-G991B", brand: "samsung", build: "TP1A.220624.014", android: "13", dpi: 2.75, screen: "360x800" },
  { model: "SM-S908B", brand: "samsung", build: "TP1A.220624.014", android: "13", dpi: 3.0, screen: "384x854" },
  { model: "SM-A536B", brand: "samsung", build: "SP1A.210812.016", android: "12", dpi: 2.0, screen: "412x915" },
  { model: "SM-G930S", brand: "samsung", build: "QQ3A.200805.001", android: "10", dpi: 3.5, screen: "320x996" },
  { model: "Pixel 7", brand: "google", build: "TQ3A.230901.001", android: "14", dpi: 2.75, screen: "412x915" },
  { model: "Pixel 6a", brand: "google", build: "TQ3A.230705.001", android: "13", dpi: 2.75, screen: "412x892" },
  { model: "Redmi Note 12", brand: "xiaomi", build: "SKQ1.220303.001", android: "13", dpi: 2.75, screen: "393x873" },
  { model: "M2101K6G", brand: "xiaomi", build: "RKQ1.200826.002", android: "12", dpi: 2.75, screen: "393x851" },
  { model: "CPH2401", brand: "oppo", build: "TP1A.220905.001", android: "13", dpi: 2.75, screen: "412x915" },
  { model: "V2230A", brand: "vivo", build: "TP1A.220624.014", android: "13", dpi: 2.75, screen: "393x873" },
  { model: "22101316G", brand: "xiaomi", build: "TKQ1.220829.002", android: "13", dpi: 2.75, screen: "393x873" },
  { model: "SM-A546B", brand: "samsung", build: "UP1A.231005.007", android: "14", dpi: 2.625, screen: "384x854" },
];

// ===== PHIEN BAN FB MOI NHAT =====
const FB_VERSIONS = [
  { FBAV: "474.0.0.0.35", FBBV: "748654012" },
  { FBAV: "473.0.0.0.63", FBBV: "746982741" },
  { FBAV: "471.0.0.0.69", FBBV: "744155029" },
  { FBAV: "470.0.0.0.78", FBBV: "742639488" },
  { FBAV: "468.0.0.0.60", FBBV: "740026905" },
  { FBAV: "466.0.0.0.72", FBBV: "737550218" },
  { FBAV: "464.0.0.0.37", FBBV: "735192876" },
  { FBAV: "462.0.0.0.54", FBBV: "732814530" },
  { FBAV: "460.0.0.0.28", FBBV: "730126433" },
  { FBAV: "457.0.0.0.52", FBBV: "724844624" },
];

// Mang HNI Viet Nam (Viettel, Mobi, Vina, Vietnamobile)
const VN_HNI = ["45201", "45202", "45204", "45205", "45206", "45218"];

export interface DeviceFingerprint {
  deviceId: string;
  familyDeviceId: string;
  advertiserId: string;
  userAgent: string;
  device: typeof DEVICES[0];
  fbVersion: typeof FB_VERSIONS[0];
  hni: string;
}


/**
 * Xac dinh loai contactpoint (EMAIL hoac PHONE) va normalize
 * - Email: giu nguyen
 * - Phone: tu dong them + va ma quoc gia neu thieu
 */
export function normalizeContactpoint(input: string, countryCode = "84"): {
  value: string;
  type: "EMAIL" | "PHONE";
} {
  const trimmed = input.trim();
  
  // Neu co @ thi la EMAIL
  if (trimmed.includes("@")) {
    return { value: trimmed, type: "EMAIL" };
  }
  
  // Con lai la PHONE - normalize so dien thoai
  let phone = trimmed.replace(/[\s()\-.]/g, ""); // Xoa khoang trang, dau gach, ngoac
  
  // Neu bat dau bang 0 (VD: 0912345678) -> thay 0 bang +84
  if (phone.startsWith("0")) {
    phone = "+" + countryCode + phone.substring(1);
  }
  // Neu bat dau bang ma quoc gia khong co + (VD: 84912345678)
  else if (phone.startsWith(countryCode) && !phone.startsWith("+")) {
    phone = "+" + phone;
  }
  // Neu chua co + thi them
  else if (!phone.startsWith("+")) {
    phone = "+" + countryCode + phone;
  }
  
  return { value: phone, type: "PHONE" };
}

/**
 * Tao fingerprint ngau nhien hoac co dinh theo token (seed)
 * Neu truyen seed (vd: token), cung 1 token se luon ra cung 1 fingerprint
 */
export function generateFingerprint(seed?: string): DeviceFingerprint {
  const hash = seed ? crypto.createHash("md5").update(seed).digest("hex") : crypto.randomUUID().replace(/-/g, "");
  
  // Chon device + version theo hash (deterministic neu co seed)
  const deviceIdx = parseInt(hash.substring(0, 4), 16) % DEVICES.length;
  const versionIdx = parseInt(hash.substring(4, 8), 16) % FB_VERSIONS.length;
  const hniIdx = parseInt(hash.substring(8, 10), 16) % VN_HNI.length;
  
  const device = DEVICES[deviceIdx];
  const fbVersion = FB_VERSIONS[versionIdx];
  const hni = VN_HNI[hniIdx];
  
  // Tao UUID v4 tu hash
  const deviceId = [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "4" + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join("-");
  
  const familyDeviceId = [
    hash.substring(2, 10),
    hash.substring(10, 14),
    "4" + hash.substring(15, 18),
    ((parseInt(hash.substring(18, 19), 16) & 0x3) | 0x8).toString(16) + hash.substring(19, 22),
    hash.substring(4, 16),
  ].join("-");
  
  const advertiserId = [
    hash.substring(6, 14),
    hash.substring(14, 18),
    "4" + hash.substring(19, 22),
    ((parseInt(hash.substring(22, 23), 16) & 0x3) | 0x8).toString(16) + hash.substring(23, 26),
    hash.substring(8, 20),
  ].join("-");
  
  // User-Agent chuan FBAN (Facebook Android)
  const userAgent = [
    `Dalvik/2.1.0 (Linux; U; Android ${device.android}; ${device.model} Build/${device.build})`,
    `[FBAN/FB4A;FBEV/PROD;FBBV/${fbVersion.FBBV};FBAV/${fbVersion.FBAV};`,
    `FBLC/vi_VN;FBBK/1;FBDV/${device.model};FBSV/${device.android};`,
    `FBCR/Viettel;FBMF/${device.brand};FBBD/${device.brand};`,
    `FBDM/{density=${device.dpi},width=${device.screen.split("x")[0]},height=${device.screen.split("x")[1]}};`,
    `FBPN/com.facebook.katana;FBOP/1;FBCX/msys]`,
  ].join("");
  
  return { deviceId, familyDeviceId, advertiserId, userAgent, device, fbVersion, hni };
}

/**
 * Tao bo headers day du cho request toi Facebook Graph API
 */
export function buildFBHeaders(fp: DeviceFingerprint, token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": fp.userAgent,
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "*/*",
    "Accept-Language": "vi_VN",
    "Connection": "keep-alive",
    "X-FB-Connection-Type": "WIFI",
    "X-FB-Connection-Quality": "EXCELLENT",
    "X-FB-HTTP-Engine": "Liger",
    "X-FB-Client-IP": "True",
    "X-FB-Server-Cluster": "True",
    "X-FB-Friendly-Name": "graphServiceQuery",
    "X-FB-Net-HNI": fp.hni,
    "X-FB-SIM-HNI": fp.hni,
    "X-FB-Device-Group": "7005",
    "X-FB-Background-State": "1",
    "X-ASBD-ID": "129477",
    "X-TINCAN": "true",
  };
  if (token) {
    headers["Authorization"] = `OAuth ${token}`;
  }
  return headers;
}

/**
 * Tao cac params chung cho moi request Facebook
 */
export function buildCommonParams(fp: DeviceFingerprint): Record<string, string> {
  return {
    device_id: fp.deviceId,
    family_device_id: fp.familyDeviceId,
    locale: "vi_VN",
    client_country_code: "VN",
    fb_api_req_friendly_name: "graphServiceQuery",
    format: "json",
  };
}

/**
 * Warmup: gia lap hanh vi tu nhien truoc khi thuc hien action
 */
export async function warmupSession(token: string, fp: DeviceFingerprint): Promise<void> {
  const headers = buildFBHeaders(fp, token);
  
  // Buoc 1: Check profile (nhu app mo len)
  try {
    await fetch(`https://graph.facebook.com/me?fields=id,name&access_token=${token}`, {
      headers,
    });
  } catch {}
  
  // Delay tu nhien 2-4 giay
  await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
}

/**
 * Gui POST request toi Facebook Graph API dung https module (khong dung fetch)
 * Vi Next.js fetch() tu dong them Accept-Encoding: gzip va khong giai nen dung
 */
export function fbPost(
  urlPath: string,
  headers: Record<string, string>,
  body: string,
  proxyString?: string
): Promise<{ status: number; body: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: "graph.facebook.com",
      path: urlPath,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(body).toString(),
      },
    };

    console.log("[fbPost] === START REQUEST ===");
    console.log("[fbPost] URL:", String(options.hostname || "") + String(options.path || ""));
    console.log("[fbPost] Options Headers:", JSON.stringify(options.headers, null, 2));
    console.log("[fbPost] Body:", body);

    const req = https.request(options, (res) => {
      console.log("[fbPost] Response HTTP Status:", res.statusCode);
      console.log("[fbPost] Response Headers:", JSON.stringify(res.headers, null, 2));
      
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks);
        const encoding = res.headers["content-encoding"] || "";
        const respHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (typeof v === "string") respHeaders[k] = v;
        }

        const decode = (buf: Buffer) => {
          const text = buf.toString("utf8");
          console.log("[fbPost] Raw byte length:", buf.length);
          console.log("[fbPost] Decoded text length:", text.length);
          console.log("[fbPost] Decoded response body:", text);
          resolve({ status: res.statusCode || 0, body: text, headers: respHeaders });
        };

        if (encoding === "gzip") {
          zlib.gunzip(raw, (err, result) => {
            if (err) { console.log("[fbPost] gzip error:", err.message); decode(raw); }
            else decode(result);
          });
        } else if (encoding === "deflate") {
          zlib.inflate(raw, (err, result) => {
            if (err) { console.log("[fbPost] deflate error:", err.message); decode(raw); }
            else decode(result);
          });
        } else {
          decode(raw);
        }
      });
    });

    req.on("error", (e) => {
      console.log("[fbPost] Connection error:", e.message);
      reject(e);
    });
    req.write(body);
    req.end();
  });
}

/**
 * Gui GET request toi Facebook Graph API dung https module
 */
export function fbGet(
  url: string,
  headers: Record<string, string>,
  proxyString?: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const agent = getProxyAgent(proxyString);
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: { ...headers, "Accept-Encoding": "identity" },
      ...(agent ? { agent } : {}),
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks);
        const encoding = res.headers["content-encoding"] || "";

        const decode = (buf: Buffer) => {
          resolve({ status: res.statusCode || 0, body: buf.toString("utf8") });
        };

        if (encoding === "gzip") {
          zlib.gunzip(raw, (err, result) => { decode(err ? raw : result); });
        } else if (encoding === "deflate") {
          zlib.inflate(raw, (err, result) => { decode(err ? raw : result); });
        } else {
          decode(raw);
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.end();
  });
}

"use client";

import { useState, useRef } from "react";

type EmailSource = "emailondeck" | "hotmail_dvfb";
type Step = "step1" | "step2";

interface LogEntry { time: string; msg: string; isError: boolean; }

const S: Record<string, React.CSSProperties> = {
  card: { background: "#1a1d26", border: "1px solid #2f333d", borderRadius: 20, padding: 28, boxShadow: "0 15px 35px rgba(0,0,0,0.5)" },
  label: { fontSize: 12, color: "#888", marginBottom: 4, display: "block" },
  input: { width: "100%", background: "#252936", border: "1px solid #2f333d", color: "#fff", borderRadius: 10, padding: "10px 15px", fontSize: 13, boxSizing: "border-box" as const, outline: "none", transition: "border-color 0.2s" },
  select: { width: "100%", background: "#252936", border: "1px solid #2f333d", color: "#fff", borderRadius: 10, padding: "10px 15px", fontSize: 13, boxSizing: "border-box" as const, outline: "none" },
  textarea: { width: "100%", background: "#1e222d", border: "1px dashed #505050", color: "#a0a0a0", borderRadius: 10, padding: "10px 15px", fontSize: 12, fontFamily: "monospace", boxSizing: "border-box" as const, outline: "none", resize: "none" as const },
  btnEmail: { background: "rgba(46,204,113,0.15)", color: "#2ecc71", border: "1px solid rgba(46,204,113,0.3)", borderRadius: 8, padding: "10px 0", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" },
  btnOtp: { background: "rgba(255,152,0,0.15)", color: "#ff9800", border: "1px solid rgba(255,152,0,0.3)", borderRadius: 8, padding: "10px 0", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" },
  btnBuyAcc: { background: "rgba(147,51,234,0.15)", color: "#a855f7", border: "1px solid rgba(147,51,234,0.3)", borderRadius: 8, padding: "10px 0", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" },
  btnPrimary: { background: "#3793ff", color: "#fff", border: "none", borderRadius: 10, padding: "14px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", transition: "opacity 0.2s" },
  btnSuccess: { background: "#2ecc71", color: "#fff", border: "none", borderRadius: 10, padding: "14px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", transition: "opacity 0.2s" },
  btnResend: { background: "rgba(55,147,255,0.15)", color: "#3793ff", border: "1px solid rgba(55,147,255,0.3)", borderRadius: 8, padding: "10px 0", fontWeight: 600, fontSize: 13, cursor: "pointer", width: "100%" },
  btnDanger: { background: "#ff4757", color: "#fff", border: "none", borderRadius: 10, padding: "14px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", transition: "opacity 0.2s" },
  btnPaste: { background: "#dc3545", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnPasteAcc: { background: "rgba(147,51,234,0.8)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  tabActive: { background: "#3793ff", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", flex: 1, transition: "all 0.2s" },
  tabInactive: { background: "transparent", color: "#888", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", flex: 1, transition: "all 0.2s" },
};

function parseRawLine(text: string) {
  const tokenMatch = text.match(/EAAAA[a-zA-Z0-9]+/);
  return {
    token: tokenMatch ? tokenMatch[0] : "",
    uid: text.split("|")[0] || "",
  };
}

export default function ManualVerify() {
  const [step, setStep] = useState<Step>("step1");
  const [fullAccountInput, setFullAccountInput] = useState("");
  const [emailSource, setEmailSource] = useState<EmailSource>("emailondeck");
  const [accSource, setAccSource] = useState("biimeta");
  const [accProductId, setAccProductId] = useState("1636");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [proxy, setProxy] = useState("23.106.231.9:80:cuongict-rotate:biimeta123");
  const [otp, setOtp] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingStep1, setLoadingStep1] = useState(false);
  const [loadingStep2, setLoadingStep2] = useState(false);
  const [loadingBuyAcc, setLoadingBuyAcc] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [loadingRemove, setLoadingRemove] = useState(false);

  const hotmailRef = useRef({ refresh: "", client: "" });
  const tabId = useRef("manual_" + Math.random().toString(36).substring(2, 8));
  const logEndRef = useRef<HTMLDivElement>(null);

  function addLog(msg: string, isError = false) {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-100), { time, msg, isError }]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function applyRawLine(text: string) {
    setFullAccountInput(text);
    const { token: t } = parseRawLine(text);
    if (t) setToken(t);
    const parts = text.split("|");
    if (parts.length >= 4 && parts[0].includes("@")) {
      hotmailRef.current = { refresh: parts[2].trim(), client: parts[3].trim() };
      setEmail(parts[0].trim());
      setEmailSource("hotmail_dvfb");
    }
    setStep("step1");
  }

  async function pasteAndClear() {
    try {
      const text = await navigator.clipboard.readText();
      applyRawLine(text.trim());
      addLog("Đã dán tài khoản thành công!");
    } catch { addLog("Lỗi truy cập Clipboard!", true); }
  }

  async function handleBuyAcc() {
    setLoadingBuyAcc(true);
    addLog(`Đang mua acc từ ${accSource} (ID: ${accProductId})...`);
    try {
      const url = accSource === "dvfb"
        ? "/fb_verify/api/buy-account?source=dvfb"
        : `/fb_verify/api/buy-account?source=biimeta&id=${accProductId}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      let rawLine = "";
      if (accSource === "dvfb") {
        rawLine = data?.data?.list_data?.[0] || "";
      } else {
        rawLine = data?.data?.[0] || "";
      }

      if (rawLine) {
        applyRawLine(rawLine);
        const uid = rawLine.split("|")[0] || "N/A";
        const hasToken = /EAAAA[a-zA-Z0-9]+/.test(rawLine);
        addLog(`Mua acc OK! UID: ${uid} | Token: ${hasToken ? "Có" : "Không có"}`);
      } else {
        addLog("Không mua được acc: " + JSON.stringify(data), true);
      }
    } catch (e) {
      addLog("Lỗi mua acc: " + (e instanceof Error ? e.message : String(e)), true);
    }
    setLoadingBuyAcc(false);
  }

  async function handlePasteAcc() {
    try {
      const text = await navigator.clipboard.readText();
      applyRawLine(text.trim());
      addLog("Đã dán acc từ clipboard!");
    } catch { addLog("Lỗi truy cập Clipboard!", true); }
  }

  async function handleGetEmail() {
    setLoadingEmail(true);
    try {
      if (emailSource === "emailondeck") {
        const res = await fetch(`/fb_verify/api/buy-email?source=emailondeck&tab_id=${tabId.current}`);
        const data = await res.json();
        const em = data.email || data.raw?.split("|")[0];
        if (em) { setEmail(em); addLog(`Email: ${em}`); }
        else addLog("Không lấy được email", true);
      } else {
        const res = await fetch("/fb_verify/api/buy-email?source=dvfb");
        const data = await res.json();
        const raw = data?.data?.list_data?.[0];
        if (raw) {
          const p = raw.split("|");
          hotmailRef.current = { refresh: p[2] || "", client: p[3] || "" };
          setEmail(p[0].trim());
          addLog(`Hotmail: ${p[0].trim()}`);
        } else addLog("Không lấy được Hotmail", true);
      }
    } catch (e) { addLog("Lỗi: " + (e instanceof Error ? e.message : String(e)), true); }
    setLoadingEmail(false);
  }

  async function handleGetOtp() {
    if (!email) { addLog("Vui lòng nhập Email trước!", true); return; }
    setLoadingOtp(true);
    try {
      const res = await fetch("/fb_verify/api/get-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: emailSource, email, refresh_token: hotmailRef.current.refresh, client_id: hotmailRef.current.client, tab_id: tabId.current }),
      });
      const data = await res.json();
      const rawOtp = data.otp || data.code || data.data || "";
      const match = String(rawOtp).match(/\d{5,8}/);
      if (match) { setOtp(match[0]); addLog(`OTP: ${match[0]}`); setStep("step2"); }
      else addLog("Chưa có OTP. Đợi 5-10s rồi thử lại!", true);
    } catch (e) { addLog("Lỗi OTP: " + (e instanceof Error ? e.message : String(e)), true); }
    setLoadingOtp(false);
  }

    async function handleAddMail(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !email) { addLog("Thiếu Token hoặc Email!", true); return; }
    setLoadingStep1(true);
    addLog(`Đang add liên hệ: ${email}...`);
    try {
      const res = await fetch(`/fb_verify/api/add-mail?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&proxy=${encodeURIComponent(proxy)}`);
      const data = await res.json();
      
      if (data?.error) {
        const errCode = Number(data.error.code || 0);
        const subCode = Number(data.error.error_subcode || 0);
        const errMsg = String(data.error.message || "").toLowerCase();
        
        // Neu la loi abuse (368) hoac loi gui tin nhan (1404009) -> van cho qua buoc 2
        if (errCode === 368 || subCode === 1404009 || errMsg.includes("abusive") || errMsg.includes("disallowed")) {
          addLog("⚠️ Lỗi bảo mật Sentry (Abusive) từ Facebook, nhưng mã xác nhận có thể vẫn đã được gửi đi!", false);
          addLog("👉 Chuyển sang Bước 2 để thử nhập OTP...");
          setStep("step2");
        } else {
          addLog(`❌ Lỗi: ${data.error.message || JSON.stringify(data.error)}`, true);
        }
      } else if (data?.result === true) {
        addLog("✅ Gửi yêu cầu thêm liên hệ thành công! Chuyển sang bước 2...");
        setStep("step2");
      } else {
        addLog("Phản hồi: " + JSON.stringify(data, null, 2));
      }
    } catch (e) {
      addLog("❌ Lỗi kết nối: " + (e instanceof Error ? e.message : String(e)), true);
    }
    setLoadingStep1(false);
  }



  async function handleRemoveMail() {
    if (!token || !email) { addLog("Thiếu Token hoặc Email/Phone để xóa!", true); return; }
    const confirmDelete = window.confirm("Bạn có chắc muốn XÓA liên hệ này khỏi tài khoản?");
    if (!confirmDelete) return;
    
    setLoadingRemove(true);
    addLog(`⏳ Đang xóa liên hệ: ${email}...`);
    try {
      const res = await fetch(
        `/fb_verify/api/remove-mail?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&proxy=${encodeURIComponent(proxy)}`
      );
      const data = await res.json();
      if (data?.error) {
        addLog(`❌ Xóa liên hệ lỗi: ${data.error.message || JSON.stringify(data.error)}`, true);
      } else {
        addLog(`✅ Đã xóa liên hệ: ${email} thành công!`);
      }
    } catch (e) {
      addLog("❌ Lỗi: " + (e instanceof Error ? e.message : String(e)), true);
    }
    setLoadingRemove(false);
  }

    async function handleResendOtp() {
    if (!token || !email) { addLog("Thiếu Token hoặc Email!", true); return; }
    setLoadingResend(true);
    addLog("⏳ Yêu cầu gửi lại OTP tới Facebook...");
    try {
      const res = await fetch(
        `/fb_verify/api/resend-otp?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&proxy=${encodeURIComponent(proxy)}`
      );
      const data = await res.json();
      if (data?.error) {
        const errCode = Number(data.error.code || 0);
        const subCode = Number(data.error.error_subcode || 0);
        const errMsg = String(data.error.message || "").toLowerCase();
        
        if (errCode === 368 || subCode === 1404009 || errMsg.includes("abusive") || errMsg.includes("disallowed")) {
          addLog("⚠️ Lỗi bảo mật Sentry (Abusive) từ Facebook, nhưng mã OTP gửi lại có thể vẫn đang được chuyển đi!", false);
        } else {
          addLog(`❌ Gửi lại OTP lỗi: ${data.error.message || JSON.stringify(data.error)}`, true);
        }
      } else {
        addLog("✅ Facebook thông báo đã gửi lại OTP thành công!");
      }
    } catch (e) { 
      addLog("❌ Lỗi: " + (e instanceof Error ? e.message : String(e)), true); 
    }
    setLoadingResend(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !email || !otp) { addLog("Thiếu Token, Email hoặc OTP!", true); return; }
    setLoadingStep2(true);
    addLog(`Xác thực OTP: ${otp}...`);
    try {
      const res = await fetch(`/fb_verify/api/verify-otp?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&otp=${otp}&proxy=${encodeURIComponent(proxy)}`);
      const data = await res.json();
      if (data?.error) {
        const sub = Number(data.error.error_subcode || 0);
        const code = Number(data.error.code || 0);
        const errMsg = data.error.message || JSON.stringify(data.error);
        if (sub === 490 || code === 490) addLog("Checkpoint (282) - Bị chặn!", true);
        else addLog("Lỗi " + (code || "API") + ": " + errMsg, true);
      } else if (data?.result === true || data?.status === "success") {
        addLog("XÁC THỰC THÀNH CÔNG!");
      } else addLog("" + JSON.stringify(data, null, 2));
    } catch (e) { addLog("" + (e instanceof Error ? e.message : String(e)), true); }
    setLoadingStep2(false);
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-1 md:px-4">
      <div style={S.card}>
        <h4 style={{ textAlign: "center", color: "#3793ff", fontWeight: 700, fontSize: 20, marginBottom: 24, marginTop: 0 }}>
          FB AUTOMATION <span style={{ fontSize: 10, background: "#3793ff", color: "#fff", padding: "2px 8px", borderRadius: 4, marginLeft: 6, verticalAlign: "middle" }}>PRO</span>
        </h4>

        {/* === KHU VUC MUA / DAN ACC === */}
        <div style={{ background: "#11141d", border: "1px solid #2f333d", borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#a855f7", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Tài khoản FB (No Verify)</div>

          {/* Nguon mua + Product ID */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={S.label}>Nguồn mua acc:</label>
              <select style={S.select} value={accSource} onChange={(e) => setAccSource(e.target.value)}>
                <option value="biimeta">Biimeta</option>
                <option value="...">...</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Product ID:</label>
              <input type="text" style={S.input} value={accProductId} onChange={(e) => setAccProductId(e.target.value)} placeholder="1636" />
            </div>
          </div>

          {/* Nut mua + Dan */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <button
              style={{ ...S.btnBuyAcc, opacity: loadingBuyAcc ? 0.6 : 1 }}
              onClick={handleBuyAcc}
              disabled={loadingBuyAcc}
            >
              {loadingBuyAcc ? "Đang mua..." : "Mua ACC Tự Động"}
            </button>
            <button style={S.btnPasteAcc} onClick={handlePasteAcc}>
              Clipboard
            </button>
          </div>

          {/* Hien thi acc da lay */}
          <div>
            <label style={S.label}>Account hiện tại:</label>
            <textarea
              style={{ ...S.textarea, height: 48 }}
              placeholder="UID|PASS|TOKEN... sẽ hiển thị ở đây sau khi mua/dán"
              value={fullAccountInput}
              onChange={(e) => applyRawLine(e.target.value)}
            />
          </div>

          {/* Hien thi Token da parse */}
          {token && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#2ecc71" }}>
              Token: {token.substring(0, 20)}...{token.slice(-8)}
            </div>
          )}
        </div>

        {/* Nguon email + tabId */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Nguồn Email:</label>
            <select style={S.select} value={emailSource} onChange={(e) => setEmailSource(e.target.value as EmailSource)}>
              <option value="emailondeck">EmailOnDeck (biimeta)</option>
              <option value="hotmail_dvfb">Hotmail (DongVanFB)</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Tab ID (tự động):</label>
            <input type="text" style={{ ...S.input, color: "#555", fontSize: 11 }} readOnly value={tabId.current} />
          </div>
        </div>

        {/* Nut Email + OTP */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <button style={{ ...S.btnEmail, opacity: loadingEmail ? 0.6 : 1 }} onClick={handleGetEmail} disabled={loadingEmail}>
            {loadingEmail ? "Đang lấy..." : "Lấy Email Mới"}
          </button>
          <button style={{ ...S.btnOtp, opacity: loadingOtp ? 0.6 : 1 }} onClick={handleGetOtp} disabled={loadingOtp}>
            {loadingOtp ? "Dang check..." : "Lấy Mã OTP"}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#11141d", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
          <button style={step === "step1" ? S.tabActive : S.tabInactive} onClick={() => setStep("step1")}>1. THÊM EMAIL</button>
          <button style={step === "step2" ? S.tabActive : S.tabInactive} onClick={() => setStep("step2")}>2. XÁC THỰC OTP</button>
        </div>

        {/* Step 1 */}
        {step === "step1" && (
          <form onSubmit={handleAddMail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={S.label}>Access Token</label>
              <input type="text" style={S.input} required value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAAA..." />
            </div>
            <div>
              <label style={S.label}>Email mới</label>
              <input type="text" style={S.input} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" />
            </div>
            <div>
              <label style={S.label}>Proxy</label>
              <input type="text" style={S.input} value={proxy} onChange={(e) => setProxy(e.target.value)} placeholder="IP:Port:User:Pass" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="submit" style={{ ...S.btnPrimary, opacity: loadingStep1 ? 0.6 : 1 }} disabled={loadingStep1}>
                {loadingStep1 ? "⌛ Đang gửi..." : "➕ Thêm liên hệ"}
              </button>
              <button type="button" style={{ ...S.btnDanger, opacity: loadingRemove ? 0.6 : 1 }} onClick={handleRemoveMail} disabled={loadingRemove}>
                {loadingRemove ? "⌛ Đang xóa..." : "❌ Xóa liên hệ"}
              </button>
            </div>
          </form>
        )}

        {/* Step 2 */}
        {step === "step2" && (
          <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <label style={{ ...S.label, textAlign: "center", display: "block", marginBottom: 8 }}>Mã xác thực OTP</label>
              <input type="text" required
                style={{ ...S.input, textAlign: "center", fontSize: 28, fontWeight: 700, color: "#2ecc71", letterSpacing: 12, padding: "12px 0" }}
                value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="------" maxLength={8} />
            </div>
            <div>
              <label style={S.label}>Proxy</label>
              <input type="text" style={S.input} value={proxy} onChange={(e) => setProxy(e.target.value)} placeholder="IP:Port:User:Pass" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" style={{ ...S.btnResend, opacity: loadingResend ? 0.6 : 1 }} onClick={handleResendOtp} disabled={loadingResend}>
                {loadingResend ? "⌛ Đang gửi..." : "🔄 Gửi lại OTP FB"}
              </button>
              <button type="submit" style={{ ...S.btnSuccess, opacity: loadingStep2 ? 0.6 : 1 }} disabled={loadingStep2}>
                {loadingStep2 ? "⌛ Đang xác nhận..." : "✅ Xác nhận OTP"}
              </button>
            </div>
          </form>
        )}

        {/* Log */}
        <div style={{ marginTop: 20, border: "2px solid #3793ff", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: "#0d1117", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "#888", fontSize: 13 }}>LOG PHẢN HỒI:</span>
            <button onClick={() => setLogs([])} style={{ background: "none", border: "none", color: "#ff4757", cursor: "pointer", fontSize: 12, padding: 0, fontWeight: 600 }}>DỌN DẸP</button>
          </div>
          <div style={{ background: "#000", height: 180, overflowY: "auto", padding: 10, fontFamily: "monospace", fontSize: 12 }}>
            {logs.length === 0 && <span style={{ color: "#333" }}>Chưa có log nào...</span>}
            {logs.map((l, i) => (
              <div key={i} style={{ color: l.isError ? "#ff4757" : "#00ff99" }}>[{l.time}] {l.msg}</div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}


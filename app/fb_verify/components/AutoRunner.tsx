"use client";

import { useState, useRef, useCallback } from "react";

type EmailSource = "emailondeck" | "biimeta_hotmail" | "hotmail_dvfb";

interface RowData {
  id: string; stt: number; icon: string; uid: string;
  email: string; status: string;
  type: "warning" | "success" | "danger" | "info" | "secondary";
  time: string;
}

const S: Record<string, React.CSSProperties> = {
  card: { background: "#1a1d26", border: "1px solid #2f333d", borderRadius: 15, padding: 16 },
  label: { fontSize: 11, color: "#888", marginBottom: 4, display: "block" },
  input: { width: "100%", background: "#252936", border: "1px solid #2f333d", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 13, boxSizing: "border-box" as const, outline: "none" },
  select: { width: "100%", background: "#252936", border: "1px solid #2f333d", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 13, boxSizing: "border-box" as const, outline: "none" },
  btnPrimary: { background: "#3793ff", color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" },
  btnDanger: { background: "transparent", color: "#ff4757", border: "1px solid #ff4757", borderRadius: 8, padding: "9px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" },
  btnSuccess: { background: "#2ecc71", color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" },
  logBox: { height: 180, overflowY: "auto" as const, background: "#000", fontFamily: "monospace", fontSize: 11, padding: 10, borderRadius: 10, border: "1px solid #333", color: "#fff" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12 },
  th: { padding: "6px 8px", textAlign: "left" as const, color: "#555", borderBottom: "1px solid #2f333d", fontWeight: 600 },
  td: { padding: "5px 8px", borderBottom: "1px solid #1e212c" },
  resultBox: { width: "100%", background: "#111", color: "#2ecc71", border: "1px dashed #2ecc71", borderRadius: 8, padding: 8, fontFamily: "monospace", fontSize: 11, resize: "none" as const, boxSizing: "border-box" as const, outline: "none" },
  sectionTitle: { fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 10 },
};

const COLOR_MAP: Record<string, string> = {
  warning: "#f39c12", success: "#2ecc71", danger: "#ff4757", info: "#3793ff", secondary: "#888",
};

function getTimer(start: number) { return Math.floor((Date.now() - start) / 1000) + "s"; }
function getTabId() {
  if (typeof sessionStorage === "undefined") return "tab_default";
  let id = sessionStorage.getItem("tab_id");
  if (!id) { id = "tab_" + Math.random().toString(36).substring(2, 10); sessionStorage.setItem("tab_id", id); }
  return id;
}

export default function AutoRunner() {
  const [accountList, setAccountList] = useState("");
  const [emailSource, setEmailSource] = useState<EmailSource>("emailondeck");
  const [proxy, setProxy] = useState("");
  const [stopIfDie, setStopIfDie] = useState(true);
  const [autoUpload, setAutoUpload] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<{ msg: string; type: string; time: string }[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [finalResult, setFinalResult] = useState("");

  const isRunningRef = useRef(false);
  const accountListRef = useRef("");
  const logEndRef = useRef<HTMLDivElement>(null);
  const sttRef = useRef(0);
  const dieCountRef = useRef(0);
  const emailSourceRef = useRef<EmailSource>("emailondeck");
  const proxyRef = useRef("");
  const stopIfDieRef = useRef(true);
  const autoUploadRef = useRef(true);

  const writeLog = useCallback((msg: string, type = "white") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-200), { msg, type, time }]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const updateRow = useCallback((row: RowData) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = row; return next; }
      return [row, ...prev];
    });
  }, []);

  function parseEmailData(source: EmailSource, data: Record<string, unknown>) {
    try {
      if (source === "emailondeck") {
        const raw = (data as { raw?: string }).raw;
        if (!raw) return null;
        const p = raw.split("|");
        return { email: p[0].trim(), passMail: p[1] || "", refreshToken: "", clientId: "" };
      } else if (source === "biimeta_hotmail") {
        const d = (data as { data?: string[] }).data;
        if (!d?.[0]) return null;
        const p = d[0].split("|");
        return { email: p[0].trim(), passMail: p[1] || "", refreshToken: p[2] || "", clientId: p[3] || "" };
      } else {
        const d = (data as { data?: { list_data?: string[] } }).data;
        if (!d?.list_data?.[0]) return null;
        const p = d.list_data[0].split("|");
        return { email: p[0].trim(), passMail: p[1] || "", refreshToken: p[2] || "", clientId: p[3] || "" };
      }
    } catch { return null; }
  }

  async function buyEmail(source: EmailSource, tabId: string) {
    if (source === "emailondeck") return (await fetch(`/fb_verify/api/buy-email?source=emailondeck&tab_id=${tabId}`)).json();
    if (source === "biimeta_hotmail") return (await fetch(`/fb_verify/api/buy-account?source=biimeta&id=5814`)).json();
    return (await fetch(`/fb_verify/api/buy-email?source=dvfb`)).json();
  }

  async function getOtp(source: EmailSource, email: string, refreshToken: string, clientId: string, tabId: string) {
    const res = await fetch("/fb_verify/api/get-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, email, refresh_token: refreshToken, client_id: clientId, tab_id: tabId }),
    });
    const data = await res.json();
    const rawOtp = data.otp || data.code || data.data || "";
    const m = String(rawOtp).match(/\d{5,8}/);
    return m ? m[0] : "";
  }

  async function uploadAccount(accountString: string) {
    try {
      const res = await fetch("/fb_verify/api/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: accountString, filter: "1" }),
      });
      return (await res.json()).status === "success";
    } catch { return false; }
  }

  async function checkLive(uid: string) {
    try {
      const res = await fetch(`https://graph.facebook.com/${uid}/picture?type=normal&redirect=false`);
      const data = await res.json();
      return !!(data?.data?.height && data?.data?.width);
    } catch { return true; }
  }

  async function runOne(rawLine: string, tabId: string) {
    sttRef.current++;
    const cStt = sttRef.current;
    const uid = rawLine.split("|")[0] || "N/A";
    const tokenMatch = rawLine.match(/EAAAA[a-zA-Z0-9]+/);
    const token = tokenMatch ? tokenMatch[0] : "";
    const rowId = `row-${Date.now()}-${cStt}`;
    const startTime = Date.now();
    const src = emailSourceRef.current;
    const px = proxyRef.current;

    writeLog(`UID: ${uid}`, "white");
    updateRow({ id: rowId, stt: cStt, icon: "⏳", uid, email: "---", status: "Bắt đầu...", type: "warning", time: "0s" });
    if (!token) throw new Error("Sai định dạng token");

    let email = "", passMail = "", refreshToken = "", clientId = "";
    let buyRetry = 0;
    while (isRunningRef.current) {
      buyRetry++;
      updateRow({ id: rowId, stt: cStt, icon: "⏳", uid, email: "---", status: `Đang mua mail (lần ${buyRetry})...`, type: "warning", time: getTimer(startTime) });
      try {
        const data = await buyEmail(src, tabId);
        const parsed = parseEmailData(src, data);
        if (parsed) { email = parsed.email; passMail = parsed.passMail; refreshToken = parsed.refreshToken; clientId = parsed.clientId; writeLog(`Email: ${email}`, "white"); break; }
      } catch { /* retry */ }
      await new Promise((r) => setTimeout(r, 6000));
    }
    if (!email) throw new Error("Không mua được email");

    updateRow({ id: rowId, stt: cStt, icon: "⏳", uid, email, status: "Đang add mail...", type: "warning", time: getTimer(startTime) });
    await fetch(`/fb_verify/api/add-mail?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&proxy=${encodeURIComponent(px)}`);

    await new Promise((r) => setTimeout(r, 5000));
    let otp = "";
    for (let r = 1; r <= 10; r++) {
      if (!isRunningRef.current) break;
      updateRow({ id: rowId, stt: cStt, icon: "⏳", uid, email, status: `Đợi OTP (${r}/10)...`, type: "warning", time: getTimer(startTime) });
      try { otp = await getOtp(src, email, refreshToken, clientId, tabId); if (otp) { updateRow({ id: rowId, stt: cStt, icon: "📩", uid, email, status: `Đã nhận OTP: ${otp}`, type: "success", time: getTimer(startTime) }); break; } }
      catch { writeLog(`Lần ${r}: Lỗi OTP`, "danger"); }
      if (!otp) await new Promise((r) => setTimeout(r, 5000));
    }
    if (!otp) throw new Error("Không lấy được OTP sau 10 lần");

    updateRow({ id: rowId, stt: cStt, icon: "⏳", uid, email, status: `Xác thực OTP: ${otp}`, type: "warning", time: getTimer(startTime) });
    const vRes = await fetch(`/fb_verify/api/verify-otp?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&otp=${otp}&proxy=${encodeURIComponent(px)}`);
    const vData = await vRes.json();

    if (vData?.error) {
      const sub = Number(vData.error.error_subcode), code = Number(vData.error.code);
      if (sub === 490 || code === 490) updateRow({ id: rowId, stt: cStt, icon: "🛡️", uid, email, status: "🛡️ Checkpoint (282)", type: "danger", time: getTimer(startTime) });
      else updateRow({ id: rowId, stt: cStt, icon: "❌", uid, email, status: `Lỗi ${code}: ${vData.error.message}`, type: "danger", time: getTimer(startTime) });
    }
    if (vData?.result === true || vData?.status === "success")
      updateRow({ id: rowId, stt: cStt, icon: "✅", uid, email, status: "Xác thực thành công! Check live...", type: "success", time: getTimer(startTime) });

    await new Promise((r) => setTimeout(r, 7000));
    const isLive = await checkLive(uid);

    if (isLive) {
      updateRow({ id: rowId, stt: cStt, icon: "✅", uid, email, status: "Thành công - LIVE", type: "success", time: getTimer(startTime) });
      writeLog(`UID ${uid}: LIVE`, "success");
      const finalData = `${rawLine}|${email}|${passMail}`;
      setFinalResult((prev) => prev + finalData + "\n");
      dieCountRef.current = 0;
      if (autoUploadRef.current) {
        updateRow({ id: rowId, stt: cStt, icon: "⏳", uid, email, status: "Đang upload...", type: "info", time: getTimer(startTime) });
        const ok = await uploadAccount(finalData);
        updateRow({ id: rowId, stt: cStt, icon: "✅", uid, email, status: ok ? "LIVE + Đã Upload" : "LIVE (Upload lỗi)", type: ok ? "success" : "warning", time: getTimer(startTime) });
        writeLog(`Upload: ${ok ? "OK" : "Lỗi"}`, ok ? "success" : "danger");
      }
    } else {
      updateRow({ id: rowId, stt: cStt, icon: "💀", uid, email, status: "Hoàn thành - DIE", type: "danger", time: getTimer(startTime) });
      writeLog(`UID ${uid}: DIE`, "danger");
      dieCountRef.current++;
    }
  }

  async function startAutomation() {
    if (isRunning) return;
    setFinalResult(""); setRows([]); setLogs([]);
    sttRef.current = 0; dieCountRef.current = 0;
    isRunningRef.current = true; setIsRunning(true);
    writeLog("Khởi tạo phiên làm việc mới...", "success");
    const tabId = getTabId();

    while (isRunningRef.current) {
      try {
        let rawLine = "";
        const lines = accountListRef.current.trim().split("\n").filter((l) => l.length > 0);
        if (lines.length > 0) {
          rawLine = lines[0].trim();
          accountListRef.current = lines.slice(1).join("\n");
          setAccountList(accountListRef.current);
        } else {
          try {
            const r = await fetch("/fb_verify/api/buy-account?source=biimeta&id=1636");
            const j = await r.json();
            if (j.status === "success" && j.data) rawLine = j.data[0];
            else { await new Promise((r) => setTimeout(r, 10000)); continue; }
          } catch { await new Promise((r) => setTimeout(r, 10000)); continue; }
        }
        try { await runOne(rawLine, tabId); }
        catch (err) {
          const uid = rawLine.split("|")[0] || "N/A";
          writeLog(`UID ${uid}: ${err instanceof Error ? err.message : String(err)}`, "danger");
          dieCountRef.current++;
        }
        if (stopIfDieRef.current && dieCountRef.current >= 2) {
          writeLog("PHÁT HIỆN 2 ACC LỖI LIÊN TIẾP!", "warning");
          const cont = window.confirm("Phát hiện 2 acc DIE liên tiếp. Tiếp tục không?");
          if (!cont) { isRunningRef.current = false; writeLog("Đã dừng.", "danger"); break; }
          else { dieCountRef.current = 0; writeLog("Tiếp tục...", "success"); }
        }
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        writeLog("LỖI HỆ THỐNG: " + (e instanceof Error ? e.message : String(e)), "danger");
        isRunningRef.current = false; break;
      }
    }
    isRunningRef.current = false; setIsRunning(false);
  }

  const LOG_COLOR: Record<string, string> = { white: "#fff", success: "#2ecc71", danger: "#ff4757", warning: "#f39c12" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* Col 1: Cấu hình */}
      <div style={S.card} className="col-span-1 lg:col-span-3">
        <div style={{ ...S.sectionTitle, color: "#3793ff" }}>1. Cấu hình</div>
        <textarea
          style={{ ...S.input, height: 90, resize: "vertical", fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}
          placeholder="UID|PASS|TOKEN..."
          value={accountList}
          onChange={(e) => { setAccountList(e.target.value); accountListRef.current = e.target.value; }}
        />
        <label style={S.label}>Nguồn Email:</label>
        <select style={{ ...S.select, marginBottom: 8 }} value={emailSource}
          onChange={(e) => { const v = e.target.value as EmailSource; setEmailSource(v); emailSourceRef.current = v; }}>
          <option value="emailondeck">EmailOnDeck (cuongict)</option>
          <option value="biimeta_hotmail">Hotmail (Biimeta - ID 5814)</option>
          <option value="hotmail_dvfb">Hotmail Oauth2 (DongVanFB)</option>
        </select>
        <label style={S.label}>Proxy (IP:Port:User:Pass):</label>
        <input type="text" style={{ ...S.input, marginBottom: 8 }} value={proxy}
          onChange={(e) => { setProxy(e.target.value); proxyRef.current = e.target.value; }} placeholder="IP:Port:User:Pass" />
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer", fontSize: 13, color: "#f39c12" }}>
          <input type="checkbox" checked={stopIfDie} onChange={(e) => { setStopIfDie(e.target.checked); stopIfDieRef.current = e.target.checked; }} />
          Confirm When Die
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <button style={{ ...S.btnPrimary, opacity: isRunning ? 0.5 : 1 }} onClick={startAutomation} disabled={isRunning}>🚀 BẮT ĐẦU</button>
          <button style={S.btnDanger} onClick={() => { isRunningRef.current = false; writeLog("Đang dừng...", "danger"); }}>🛑 DỪNG</button>
        </div>
        <div style={S.logBox}>
          {logs.map((l, i) => <div key={i} style={{ color: LOG_COLOR[l.type] || "#fff" }}>[{l.time}] {l.msg}</div>)}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* Col 2: Tiến trình */}
      <div style={S.card} className="col-span-1 lg:col-span-6">
        <div style={{ ...S.sectionTitle, textAlign: "center" }}>2. Tiến trình thực thi</div>
        <div style={{ overflowY: "auto", maxHeight: 600 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 40 }}>STT</th>
                <th style={{ ...S.th, width: 36, textAlign: "center" }}>#</th>
                <th style={S.th}>UID</th>
                <th style={S.th}>Email</th>
                <th style={S.th}>Trạng thái</th>
                <th style={{ ...S.th, width: 55 }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={S.td}>{r.stt}</td>
                  <td style={{ ...S.td, textAlign: "center" }}>{r.icon}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: "#e1e1e6" }}>{r.uid}</td>
                  <td style={{ ...S.td, color: "#3793ff" }}>{r.email}</td>
                  <td style={{ ...S.td, color: COLOR_MAP[r.type] }}>{r.status}</td>
                  <td style={{ ...S.td, color: "#555", fontSize: 11 }}>{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Col 3: Kết quả */}
      <div style={S.card} className="col-span-1 lg:col-span-3">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ ...S.sectionTitle, color: "#2ecc71", marginBottom: 0 }}>3. Kết quả</div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888", cursor: "pointer" }}>
            <input type="checkbox" checked={autoUpload} onChange={(e) => { setAutoUpload(e.target.checked); autoUploadRef.current = e.target.checked; }} />
            Auto Upload BiiMeta
          </label>
        </div>
        <textarea style={{ ...S.resultBox, height: 480 }} readOnly value={finalResult} />
        <button style={{ ...S.btnSuccess, marginTop: 8 }} onClick={() => navigator.clipboard.writeText(finalResult).catch(() => {})}>📋 COPY</button>
      </div>
    </div>
  );
}

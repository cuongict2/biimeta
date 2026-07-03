"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "../actions";

export default function CoffeeLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await loginAdmin(username, password);

    if (result.success) {
      router.push("/coffee");
      router.refresh();
    } else {
      setError(result.error || "Đăng nhập thất bại.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Background decoration */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-5%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "35px" }}>
          <div style={{
            width: "80px", height: "80px", borderRadius: "20px",
            background: "linear-gradient(135deg, rgba(74,222,128,0.15), rgba(34,211,238,0.15))",
            border: "1px solid rgba(74,222,128,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontSize: "2.5rem",
            boxShadow: "0 8px 32px rgba(74,222,128,0.1)",
          }}>
            ☕
          </div>
          <h1 style={{
            background: "linear-gradient(135deg, #4ade80, #22d3ee)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontSize: "1.8rem", fontWeight: 800, margin: "0 0 8px 0",
          }}>
            Coffee Dashboard
          </h1>
          <p style={{ color: "#71717a", fontSize: "0.9rem", margin: 0 }}>
            Đăng nhập để quản lý quán
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "35px 30px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}>
          {/* Error message */}
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex", alignItems: "center", gap: "10px",
              color: "#ef4444", fontSize: "0.85rem", fontWeight: 600,
              animation: "shake 0.5s ease",
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Username */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.82rem", fontWeight: 600, marginBottom: "8px" }}>
              👤 Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập..."
              required
              autoFocus
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(0,0,0,0.3)", color: "#fff",
                fontSize: "0.95rem", outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(74,222,128,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(74,222,128,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "25px" }}>
            <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.82rem", fontWeight: 600, marginBottom: "8px" }}>
              🔒 Mật khẩu
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                required
                style={{
                  width: "100%", padding: "14px 50px 14px 16px", borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.3)", color: "#fff",
                  fontSize: "0.95rem", outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(74,222,128,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(74,222,128,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "#71717a",
                  cursor: "pointer", fontSize: "1.1rem", padding: "4px",
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "14px",
              background: loading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #10b981, #059669)",
              border: "none", borderRadius: "12px",
              color: "#fff", fontSize: "1rem", fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 20px rgba(16,185,129,0.3)",
              transition: "all 0.2s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            {loading ? (
              <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> Đang xác thực...</>
            ) : (
              <>🚀 Đăng nhập</>
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: "center", color: "#52525b", fontSize: "0.75rem", marginTop: "25px" }}>
          🔐 Chỉ dành cho quản trị viên
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
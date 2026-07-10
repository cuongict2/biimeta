"use client";

import { useState, use } from "react";
import dynamic from "next/dynamic";

const AutoRunner = dynamic(() => import("./components/AutoRunner"), { ssr: false });
const ManualVerify = dynamic(() => import("./components/ManualVerify"), { ssr: false });

type Tab = "auto" | "manual";

export default function FbVerifyClient({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ tab?: string }>;
}) {
  const searchParams = use(searchParamsPromise);
  const initialTab: Tab = searchParams?.tab === "manual" ? "manual" : "auto";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  return (
    <div style={{ backgroundColor: "#0f111a", minHeight: "100vh", color: "#e1e1e6", fontFamily: "Inter, Segoe UI, sans-serif", paddingTop: 20, paddingBottom: 40 }}>
      <div style={{ paddingLeft: 16, paddingRight: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: "#3793ff", fontWeight: 700, fontSize: 18 }}>
            FB VERIFY TOOL
            <span style={{ fontSize: 10, background: "#3793ff", color: "#fff", padding: "2px 7px", borderRadius: 4, marginLeft: 8, verticalAlign: "middle" }}>PRO</span>
          </h4>

          {/* Tab switcher */}
          <div style={{ display: "flex", background: "#11141d", borderRadius: 12, padding: 4, gap: 4 }}>
            <button
              onClick={() => setActiveTab("auto")}
              style={{
                background: activeTab === "auto" ? "#3793ff" : "transparent",
                color: activeTab === "auto" ? "#fff" : "#888",
                border: "none", borderRadius: 8, padding: "8px 22px",
                fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s"
              }}
            >
              🚀 TỰ ĐỘNG
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              style={{
                background: activeTab === "manual" ? "#3793ff" : "transparent",
                color: activeTab === "manual" ? "#fff" : "#888",
                border: "none", borderRadius: 8, padding: "8px 22px",
                fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s"
              }}
            >
              🖐 THỦ CÔNG
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "auto" ? <AutoRunner /> : <ManualVerify />}
      </div>
    </div>
  );
}

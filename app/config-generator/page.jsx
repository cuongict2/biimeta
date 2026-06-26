"use client";

import React, { useState, useCallback, useRef } from "react";

export default function ConfigGeneratorPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [outputYaml, setOutputYaml] = useState("Chờ dữ liệu...");
  const toastContainerRef = useRef(null);

  const showToast = useCallback((message, type = "success", duration = 3000) => {
    if (!toastContainerRef.current) return;

    const toast = document.createElement("div");
    toast.classList.add("toast");
    if (type === "error") {
      toast.classList.add("error");
    }
    toast.innerHTML = `<span style="font-weight: bold;">${type === "success" ? "✔" : "✖"}</span> ${message}`;

    toastContainerRef.current.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, duration + 500);
  }, []);

  const generateConfig = useCallback(() => {
    if (!jsonInput) {
      showToast("Vui lòng dán dữ liệu JSON vào ô.", "error");
      return;
    }
    try {
      const jsonObj = JSON.parse(jsonInput);
      if (!jsonObj.data || !Array.isArray(jsonObj.data)) {
        showToast("Dữ liệu JSON không hợp lệ: thiếu trường 'data' hoặc không phải mảng.", "error");
        return;
      }

      let yamlOutput = "name: Main Config\nversion: 1.0.0\nschema: v1\nmodels:\n";

      jsonObj.data.forEach((item) => {
        let name = item.id.replace(/\//g, " ").toUpperCase();
        yamlOutput += `  - name: ${name}\n    provider: openai\n    model: ${item.id}\n    apiBase: http://localhost:20128/v1\n    apiKey: sk-1056d36af4d8465f-6mvyql-dc5de0b1\n    roles: [chat, edit]\n\n`;
      });

      setOutputYaml(yamlOutput);
      showToast("Config đã được tạo thành công!");
    } catch (e) {
      showToast("Dữ liệu JSON không hợp lệ! Vui lòng kiểm tra lại cấu trúc.", "error");
    }
  }, [jsonInput, showToast]);

  const copyResult = useCallback(() => {
    if (outputYaml === "Chờ dữ liệu..." || !outputYaml) {
      showToast("Không có cấu hình để sao chép!", "error");
      return;
    }
    navigator.clipboard
      .writeText(outputYaml)
      .then(() => {
        showToast("Đã copy toàn bộ cấu hình vào clipboard!");
      })
      .catch((err) => {
        showToast("Không thể sao chép: " + err, "error");
        console.error("Could not copy text: ", err);
      });
  }, [outputYaml, showToast]);

  return (
    <main className="flex-center-page">
      <div id="toast-container" ref={toastContainerRef}></div>

      <div className="container-wrapper">
        <h2>🚀 9Router Config Generator</h2>
        <p className="description">
          Dán dữ liệu JSON từ <code>http://localhost:20128/v1/models</code> vào ô dưới đây để tạo cấu hình YAML cho 9Router của bạn. Đảm bảo định dạng JSON là chính xác.
        </p>

        <div className="card">
          <textarea
            placeholder="Dán JSON từ http://localhost:20128/v1/models vào đây..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          ></textarea>

          <div className="controls">
            <button className="btn-generate" onClick={generateConfig}>
              Tạo Config
            </button>
            <button className="btn-copy" onClick={copyResult}>
              Copy Kết Quả
            </button>
          </div>
        </div>
      </div>

      <div className="container-wrapper">
        <h3>Kết quả cấu hình YAML</h3>
        <pre>{outputYaml}</pre>
      </div>
    </main>
  );
}
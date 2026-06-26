"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";

const API_URL = "http://localhost:20128/v1/models"; // Define your API endpoint

export default function ConfigGeneratorPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [outputYaml, setOutputYaml] = useState("Chờ dữ liệu...");
  const toastContainerRef = useRef(null); // Ref for the toast container

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
    }, duration + 500); // 500ms for fadeOut animation
  }, []);

  const generateConfig = useCallback((rawData = null) => {
    let dataToProcess;

    if (rawData) {
      dataToProcess = rawData;
    } else {
      if (!jsonInput) {
        showToast("Không có dữ liệu JSON để tạo config. Vui lòng dán hoặc tải từ API.", "error");
        return;
      }
      try {
        dataToProcess = JSON.parse(jsonInput);
      } catch (e) {
        showToast("Dữ liệu JSON không hợp lệ! Vui lòng kiểm tra lại cấu trúc.", "error");
        return;
      }
    }

    try {
      if (!dataToProcess || !Array.isArray(dataToProcess.data)) {
        throw new Error("Cấu trúc dữ liệu không hợp lệ: thiếu trường 'data' hoặc không phải mảng.");
      }

      let yamlOutput = "name: Main Config\nversion: 1.0.0\nschema: v1\nmodels:\n";

      dataToProcess.data.forEach((item) => {
        let name = item.id.replace(/\//g, " ").toUpperCase();
        yamlOutput += `  - name: ${name}\n    provider: openai\n    model: ${item.id}\n    apiBase: http://localhost:20128/v1\n    apiKey: sk-1056d36af4d8465f-6mvyql-dc5de0b1\n    roles: [chat, edit]\n\n`;
      });

      setOutputYaml(yamlOutput);
      if (!rawData) { // Only show success toast if manually generated
        showToast("Config đã được tạo thành công!");
      }
    } catch (e) {
      showToast("Lỗi khi tạo config: " + e.message, "error");
      console.error("Error generating config:", e);
    }
  }, [jsonInput, showToast]);

  const fetchDataAndGenerate = useCallback(async () => {
    setOutputYaml("Đang tải dữ liệu từ API...");
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setJsonInput(JSON.stringify(data, null, 2)); // Display fetched JSON in textarea
      generateConfig(data); // Generate config with fetched data
      showToast("Dữ liệu đã được tải và config đã được tạo!");
    } catch (error) {
      showToast(
        "Không thể tải dữ liệu từ API: " + error.message + "\nVui lòng kiểm tra http://localhost:20128/v1/models có đang chạy không.",
        "error"
      );
      setOutputYaml("Không thể tải dữ liệu.");
      console.error("Error fetching data:", error);
    }
  }, [generateConfig, showToast]);

  const copyResult = useCallback(() => {
    if (outputYaml === "Chờ dữ liệu..." || outputYaml === "Không thể tải dữ liệu." || !outputYaml) {
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

  // Fetch data and generate config when the page loads
  useEffect(() => {
    fetchDataAndGenerate();
  }, [fetchDataAndGenerate]); // Dependency on fetchDataAndGenerate

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
            <button className="btn-generate" onClick={fetchDataAndGenerate}>
              Tải & Tạo Config
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
// ============================================================
// FC MOBILE - FILE I/O (Read/Write tournament.json)
// Safe File Write: ghi vào file tạm rồi rename để tránh corrupt
// ============================================================

import fs from "fs";
import path from "path";
import { TournamentData, DEFAULT_TOURNAMENT_DATA } from "../types";

const DATA_DIR = path.join(process.cwd(), "app", "fc_mobile", "data");
const DATA_FILE = path.join(DATA_DIR, "tournament.json");
const TEMP_FILE = path.join(DATA_DIR, "tournament.tmp.json");
const BACKUP_FILE = path.join(DATA_DIR, "tournament.bak.json");

/**
 * Đảm bảo thư mục data tồn tại.
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Đọc dữ liệu giải đấu từ file JSON.
 * Nếu file chính bị lỗi, thử đọc từ backup.
 */
export function readTournamentData(): TournamentData {
  ensureDataDir();

  // Thử đọc file chính
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const data = JSON.parse(raw) as TournamentData;
      return data;
    } catch {
      console.warn("[data-io] File chính bị lỗi, thử đọc backup...");
    }
  }

  // Thử đọc backup
  if (fs.existsSync(BACKUP_FILE)) {
    try {
      const raw = fs.readFileSync(BACKUP_FILE, "utf-8");
      const data = JSON.parse(raw) as TournamentData;
      // Khôi phục file chính từ backup
      fs.writeFileSync(DATA_FILE, raw, "utf-8");
      console.info("[data-io] Đã khôi phục từ backup.");
      return data;
    } catch {
      console.warn("[data-io] Backup cũng bị lỗi.");
    }
  }

  // Tạo file mới
  writeTournamentData(DEFAULT_TOURNAMENT_DATA);
  return { ...DEFAULT_TOURNAMENT_DATA };
}

/**
 * Ghi dữ liệu giải đấu vào file JSON (Safe Write).
 * Quy trình: Ghi vào .tmp → Backup file cũ → Rename .tmp thành file chính.
 */
export function writeTournamentData(data: TournamentData): void {
  ensureDataDir();

  const content = JSON.stringify(data, null, 2);

  // Bước 1: Ghi vào file tạm
  fs.writeFileSync(TEMP_FILE, content, "utf-8");

  // Bước 2: Backup file cũ (nếu tồn tại)
  if (fs.existsSync(DATA_FILE)) {
    try {
      fs.copyFileSync(DATA_FILE, BACKUP_FILE);
    } catch {
      // Bỏ qua lỗi backup
    }
  }

  // Bước 3: Rename file tạm thành file chính (atomic trên cùng filesystem)
  fs.renameSync(TEMP_FILE, DATA_FILE);
}
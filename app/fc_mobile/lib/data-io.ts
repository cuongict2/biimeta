// ============================================================
// FC MOBILE - FILE I/O (Read/Write tournament.json)
// Safe File Write: ghi vào file tạm rồi rename để tránh corrupt
// ============================================================

import { supabase } from "../../../lib/supabase";
import { TournamentData, DEFAULT_TOURNAMENT_DATA } from "../types";

const TOURNAMENT_ROW_ID = "main";

/**
 * Đọc dữ liệu giải đấu từ Supabase.
 */
export async function readTournamentData(): Promise<TournamentData> {
  try {
    const { data, error } = await supabase
      .from("fc_mobile_tournament")
      .select("data")
      .eq("id", TOURNAMENT_ROW_ID)
      .single();

    if (error || !data) {
      console.warn("[Supabase] Không tìm thấy dữ liệu giải đấu, tiến hành tạo mới...");
      await writeTournamentData(DEFAULT_TOURNAMENT_DATA);
      return { ...DEFAULT_TOURNAMENT_DATA };
    }

    return data.data as TournamentData;
  } catch (err) {
    console.error("[Supabase Error] Lỗi đọc dữ liệu:", err);
    return { ...DEFAULT_TOURNAMENT_DATA };
  }
}

/**
 * Ghi dữ liệu giải đấu vào Supabase.
 */
export async function writeTournamentData(data: TournamentData): Promise<void> {
  try {
    const { error } = await supabase
      .from("fc_mobile_tournament")
      .upsert({
        id: TOURNAMENT_ROW_ID,
        data,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("[Supabase Error] Không thể ghi dữ liệu:", error.message);
      throw error;
    }
  } catch (err) {
    console.error("[Supabase Error] Lỗi ghi dữ liệu:", err);
    throw err;
  }
}
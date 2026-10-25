// ============================================================
// FC MOBILE - FILE I/O (Read/Write tournament.json)
// Safe File Write: ghi v├áo file tß║ím rß╗ôi rename ─æß╗â tr├ính corrupt
// ============================================================

import { supabase } from "../../../lib/supabase";
import { TournamentData, DEFAULT_TOURNAMENT_DATA } from "../types";

const TOURNAMENT_ROW_ID = "main";

/**
 * ─Éß╗ìc dß╗» liß╗çu giß║úi ─æß║Ñu tß╗½ Supabase.
 */
export async function readTournamentData(): Promise<TournamentData> {
  try {
    const { data, error } = await supabase
      .from("fc_mobile_tournament")
      .select("data")
      .eq("id", TOURNAMENT_ROW_ID)
      .single();

    if (error || !data) {
      console.warn("[Supabase] Kh├┤ng t├¼m thß║Ñy dß╗» liß╗çu giß║úi ─æß║Ñu, tiß║┐n h├ánh tß║ío mß╗¢i...");
      await writeTournamentData(DEFAULT_TOURNAMENT_DATA);
      return { ...DEFAULT_TOURNAMENT_DATA };
    }

    return data.data as TournamentData;
  } catch (err) {
    console.error("[Supabase Error] Lß╗ùi ─æß╗ìc dß╗» liß╗çu:", err);
    return { ...DEFAULT_TOURNAMENT_DATA };
  }
}

/**
 * Ghi dß╗» liß╗çu giß║úi ─æß║Ñu v├áo Supabase.
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
      console.error("[Supabase Error] Kh├┤ng thß╗â ghi dß╗» liß╗çu:", error.message);
      throw error;
    }
  } catch (err) {
    console.error("[Supabase Error] Lß╗ùi ghi dß╗» liß╗çu:", err);
    throw err;
  }
}

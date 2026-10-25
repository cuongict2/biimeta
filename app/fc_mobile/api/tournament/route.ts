// ============================================================
// API: /fc_mobile/api/tournament - Tß║ío/Reset giß║úi ─æß║Ñu
// ============================================================

import { NextRequest } from "next/server";
import { readTournamentData, writeTournamentData } from "../../lib/data-io";
import {
  generateRoundRobinSchedule,
  generateFinalsMatches,
  calculateStandings,
} from "../../lib/tournament-logic";
import { DEFAULT_TOURNAMENT_DATA } from "../../types";

// GET - Lß║Ñy to├án bß╗Ö dß╗» liß╗çu giß║úi ─æß║Ñu
export async function GET() {
  const data = await readTournamentData();
  return Response.json(data);
}

// POST - Tß║ío giß║úi ─æß║Ñu mß╗¢i
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { selectedPlayerIds, legs } = body as {
      selectedPlayerIds: string[];
      legs: 1 | 2;
    };

    // Validation
    if (!selectedPlayerIds || selectedPlayerIds.length < 3) {
      return Response.json(
        { error: "Cß║ºn tß╗æi thiß╗âu 3 ng╞░ß╗¥i ch╞íi." },
        { status: 400 }
      );
    }
    if (selectedPlayerIds.length > 8) {
      return Response.json(
        { error: "Tß╗æi ─æa 8 ng╞░ß╗¥i ch╞íi." },
        { status: 400 }
      );
    }
    if (legs !== 1 && legs !== 2) {
      return Response.json(
        { error: "Sß╗æ l╞░ß╗út ─æß║Ñu phß║úi l├á 1 hoß║╖c 2." },
        { status: 400 }
      );
    }

    const data = await readTournamentData();

    // Kiß╗âm tra tß║Ñt cß║ú playerIds tß╗ôn tß║íi
    const existingIds = new Set(data.players.map((p) => p.id));
    for (const pid of selectedPlayerIds) {
      if (!existingIds.has(pid)) {
        return Response.json(
          { error: `Ng╞░ß╗¥i ch╞íi ${pid} kh├┤ng tß╗ôn tß║íi.` },
          { status: 400 }
        );
      }
    }

    // Sinh lß╗ïch thi ─æß║Ñu v├▓ng loß║íi
    const groupMatches = generateRoundRobinSchedule(selectedPlayerIds, legs);

    // Sinh slot chung kß║┐t
    const finalsMatches = generateFinalsMatches();

    // T├¡nh BXH ban ─æß║ºu
    const standings = calculateStandings(selectedPlayerIds, []);

    // Cß║¡p nhß║¡t data
    data.config = {
      legs,
      maxPlayers: 8,
      selectedPlayerIds,
      createdAt: new Date().toISOString(),
      status: "GROUP_STAGE",
    };
    data.matches = [...groupMatches, ...finalsMatches];
    data.standings = standings;

    await writeTournamentData(data);

    return Response.json({
      success: true,
      totalGroupMatches: groupMatches.length,
      totalFinalsMatches: finalsMatches.length,
    });
  } catch (err: any) {
    console.error("[API Tournament POST Error]:", err);
    return Response.json(
      { error: err.message || "Lß╗ùi Server nß╗Öi bß╗Ö", details: err.toString() },
      { status: 500 }
    );
  }
}

// DELETE - Reset giß║úi ─æß║Ñu
export async function DELETE() {
  const data = await readTournamentData();

  // Giß╗» lß║íi danh s├ích ng╞░ß╗¥i ch╞íi, chß╗ë reset giß║úi
  const resetData = {
    ...DEFAULT_TOURNAMENT_DATA,
    players: data.players,
  };

  await writeTournamentData(resetData);
  return Response.json({ success: true, message: "Giß║úi ─æß║Ñu ─æ├ú ─æ╞░ß╗úc reset." });
}

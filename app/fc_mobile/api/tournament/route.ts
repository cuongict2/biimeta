// ============================================================
// API: /fc_mobile/api/tournament - Tạo/Reset giải đấu
// ============================================================

import { NextRequest } from "next/server";
import { readTournamentData, writeTournamentData } from "../../lib/data-io";
import {
  generateRoundRobinSchedule,
  generateFinalsMatches,
  calculateStandings,
} from "../../lib/tournament-logic";
import { DEFAULT_TOURNAMENT_DATA } from "../../types";

// GET - Lấy toàn bộ dữ liệu giải đấu
export async function GET() {
  const data = await readTournamentData();
  return Response.json(data);
}

// POST - Tạo giải đấu mới
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { selectedPlayerIds, legs } = body as {
    selectedPlayerIds: string[];
    legs: 1 | 2;
  };

  // Validation
  if (!selectedPlayerIds || selectedPlayerIds.length < 3) {
    return Response.json(
      { error: "Cần tối thiểu 3 người chơi." },
      { status: 400 }
    );
  }
  if (selectedPlayerIds.length > 8) {
    return Response.json(
      { error: "Tối đa 8 người chơi." },
      { status: 400 }
    );
  }
  if (legs !== 1 && legs !== 2) {
    return Response.json(
      { error: "Số lượt đấu phải là 1 hoặc 2." },
      { status: 400 }
    );
  }

  const data = await readTournamentData();

  // Kiểm tra tất cả playerIds tồn tại
  const existingIds = new Set(data.players.map((p) => p.id));
  for (const pid of selectedPlayerIds) {
    if (!existingIds.has(pid)) {
      return Response.json(
        { error: `Người chơi ${pid} không tồn tại.` },
        { status: 400 }
      );
    }
  }

  // Sinh lịch thi đấu vòng loại
  const groupMatches = generateRoundRobinSchedule(selectedPlayerIds, legs);

  // Sinh slot chung kết
  const finalsMatches = generateFinalsMatches();

  // Tính BXH ban đầu
  const standings = calculateStandings(selectedPlayerIds, []);

  // Cập nhật data
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
}

// DELETE - Reset giải đấu
export async function DELETE() {
  const data = await readTournamentData();

  // Giữ lại danh sách người chơi, chỉ reset giải
  const resetData = {
    ...DEFAULT_TOURNAMENT_DATA,
    players: data.players,
  };

  await writeTournamentData(resetData);
  return Response.json({ success: true, message: "Giải đấu đã được reset." });
}
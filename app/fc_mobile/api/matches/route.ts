// ============================================================
// API: /fc_mobile/api/matches - Cập nhật kết quả trận đấu
// ============================================================

import { NextRequest } from "next/server";
import { readTournamentData, writeTournamentData } from "../../lib/data-io";
import {
  calculateMatchResult,
  calculateStandings,
  areAllGroupMatchesCompleted,
  assignFinalsPlayers,
} from "../../lib/tournament-logic";
import { GameResult } from "../../types";

// GET - Lấy danh sách trận đấu
export async function GET() {
  const data = await readTournamentData();
  return Response.json({ matches: data.matches });
}

// PUT - Cập nhật kết quả 1 trận đấu
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { matchId, games } = body as {
    matchId: string;
    games: GameResult[];
  };

  if (!matchId || !games) {
    return Response.json(
      { error: "matchId và games là bắt buộc." },
      { status: 400 }
    );
  }

  // Tìm trận trước để lấy phase cho việc kiểm tra
  let data = await readTournamentData();
  const matchIndex = data.matches.findIndex((m) => m.id === matchId);

  if (matchIndex === -1) {
    return Response.json(
      { error: "Không tìm thấy trận đấu." },
      { status: 404 }
    );
  }

  const match = data.matches[matchIndex];
  const isGroup = match.phase === "GROUP";

  // Validate games
  const maxGames = isGroup ? 3 : 5;
  if (games.length > maxGames) {
    return Response.json(
      { error: `Trận đấu vòng ${isGroup ? "loại (Bo3)" : "chung kết (Bo5)"} tối đa ${maxGames} game.` },
      { status: 400 }
    );
  }

  for (const game of games) {
    if (game.scoreHome < 0 || game.scoreAway < 0) {
      return Response.json(
        { error: "Tỉ số không được âm." },
        { status: 400 }
      );
    }
    if ((game.goalsHome ?? 0) < 0 || (game.goalsAway ?? 0) < 0) {
      return Response.json(
        { error: "Bàn thắng không được âm." },
        { status: 400 }
      );
    }
    if (!["home", "away", "draw"].includes(game.winner)) {
      return Response.json(
        { error: "Winner phải là home, away hoặc draw." },
        { status: 400 }
      );
    }
    // Đảm bảo goalsHome/goalsAway luôn có giá trị
    game.goalsHome = game.goalsHome ?? 0;
    game.goalsAway = game.goalsAway ?? 0;
  }

  // Tính toán kết quả
  const result = calculateMatchResult(games, isGroup);

  // Cập nhật trận đấu
  data.matches[matchIndex] = {
    ...match,
    games,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    homePoints: result.homePoints,
    awayPoints: result.awayPoints,
    winnerId: result.winnerId
      ? result.winnerId === "home"
        ? match.homePlayerId
        : match.awayPlayerId
      : null,
    status: result.isCompleted ? "COMPLETED" : "IN_PROGRESS",
  };

  // Tính lại BXH nếu là trận vòng loại
  if (match.phase === "GROUP") {
    data.standings = calculateStandings(
      data.config.selectedPlayerIds,
      data.matches
    );

    // Kiểm tra xem tất cả trận vòng loại đã xong chưa
    if (areAllGroupMatchesCompleted(data.matches)) {
      data = assignFinalsPlayers(data);
    }
  }

  // Kiểm tra nếu các trận chung kết hiện có đã xong
  const finals = data.matches.filter(
    (m) => m.phase === "FINAL" || m.phase === "THIRD_PLACE"
  );
  const allFinalsDone = finals.length > 0 && finals.every((m) => m.status === "COMPLETED");
  if (
    allFinalsDone &&
    data.config.status === "FINALS"
  ) {
    data.config.status = "COMPLETED";
  }

  await writeTournamentData(data);

  return Response.json({
    success: true,
    match: data.matches[matchIndex],
    standings: data.standings,
    tournamentStatus: data.config.status,
  });
}
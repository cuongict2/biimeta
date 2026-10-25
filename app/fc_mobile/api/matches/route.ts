// ============================================================
// API: /fc_mobile/api/matches - Cß║¡p nhß║¡t kß║┐t quß║ú trß║¡n ─æß║Ñu
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

// GET - Lß║Ñy danh s├ích trß║¡n ─æß║Ñu
export async function GET() {
  const data = await readTournamentData();
  return Response.json({ matches: data.matches });
}

// PUT - Cß║¡p nhß║¡t kß║┐t quß║ú 1 trß║¡n ─æß║Ñu
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, games } = body as {
      matchId: string;
      games: GameResult[];
    };

    if (!matchId || !games) {
      return Response.json(
        { error: "matchId v├á games l├á bß║»t buß╗Öc." },
        { status: 400 }
      );
    }

    // T├¼m trß║¡n tr╞░ß╗¢c ─æß╗â lß║Ñy phase cho viß╗çc kiß╗âm tra
    let data = await readTournamentData();
    const matchIndex = data.matches.findIndex((m) => m.id === matchId);

    if (matchIndex === -1) {
      return Response.json(
        { error: "Kh├┤ng t├¼m thß║Ñy trß║¡n ─æß║Ñu." },
        { status: 404 }
      );
    }

    const match = data.matches[matchIndex];
    const isGroup = match.phase === "GROUP";

    // Validate games
    const maxGames = isGroup ? 3 : 5;
    if (games.length > maxGames) {
      return Response.json(
        { error: `Trß║¡n ─æß║Ñu v├▓ng ${isGroup ? "loß║íi (Bo3)" : "chung kß║┐t (Bo5)"} tß╗æi ─æa ${maxGames} game.` },
        { status: 400 }
      );
    }

    for (const game of games) {
      if ((game.goalsHome ?? 0) < 0 || (game.goalsAway ?? 0) < 0) {
        return Response.json(
          { error: "B├án thß║»ng/Tß╗ë sß╗æ kh├┤ng ─æ╞░ß╗úc ├óm." },
          { status: 400 }
        );
      }
      // ─Éß║úm bß║úo goalsHome/goalsAway lu├┤n c├│ gi├í trß╗ï sß╗æ nguy├¬n
      game.goalsHome = game.goalsHome ?? 0;
      game.goalsAway = game.goalsAway ?? 0;

      // Tß╗▒ ─æß╗Öng g├ín lß║íi winner dß╗▒a tr├¬n b├án thß║»ng thß╗▒c tß║┐
      if (game.goalsHome > game.goalsAway) game.winner = "home";
      else if (game.goalsAway > game.goalsHome) game.winner = "away";
      else game.winner = "draw";
    }

    // T├¡nh to├ín kß║┐t quß║ú
    const result = calculateMatchResult(games, isGroup);

    // Cß║¡p nhß║¡t trß║¡n ─æß║Ñu
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

    // T├¡nh lß║íi BXH nß║┐u l├á trß║¡n v├▓ng loß║íi
    if (match.phase === "GROUP") {
      data.standings = calculateStandings(
        data.config.selectedPlayerIds,
        data.matches
      );

      // Kiß╗âm tra xem tß║Ñt cß║ú trß║¡n v├▓ng loß║íi ─æ├ú xong ch╞░a
      if (areAllGroupMatchesCompleted(data.matches)) {
        data = assignFinalsPlayers(data);
      }
    }

    // Kiß╗âm tra nß║┐u c├íc trß║¡n chung kß║┐t hiß╗çn c├│ ─æ├ú xong
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
  } catch (err: any) {
    console.error("[API Matches PUT Error]:", err);
    return Response.json(
      { error: err.message || "Lß╗ùi Server nß╗Öi bß╗Ö", details: err.toString() },
      { status: 500 }
    );
  }
}

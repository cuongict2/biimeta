// ============================================================
// FC MOBILE - TOURNAMENT LOGIC (Schedule Generation, Scoring, Standings)
// ============================================================

import {
  Match,
  StandingEntry,
  TournamentData,
  GameResult,
} from "../types";

/**
 * Sinh lịch thi đấu Round Robin bằng thuật toán vòng tròn (Circle Method).
 * Nếu số người chơi lẻ, thêm "BYE" để đảm bảo chẵn.
 */
export function generateRoundRobinSchedule(
  playerIds: string[],
  legs: 1 | 2
): Match[] {
  const matches: Match[] = [];
  const n = playerIds.length;

  const players = [...playerIds];
  const hasEvenPlayers = n % 2 === 0;
  if (!hasEvenPlayers) {
    players.push("BYE");
  }

  const totalPlayers = players.length;
  const rounds = totalPlayers - 1;
  const matchesPerRound = totalPlayers / 2;

  // Thuật toán circle method
  const fixed = players[totalPlayers - 1];
  const rotating = players.slice(0, totalPlayers - 1);

  let matchDay = 1;

  for (let leg = 1; leg <= legs; leg++) {
    const rotatingCopy = [...rotating];

    for (let round = 0; round < rounds; round++) {
      const currentRound = [fixed, ...rotatingCopy];

      for (let i = 0; i < matchesPerRound; i++) {
        const home = currentRound[i];
        const away = currentRound[totalPlayers - 1 - i];

        // Bỏ qua trận có BYE
        if (home === "BYE" || away === "BYE") continue;

        // Lượt về thì đảo sân
        const actualHome = leg === 2 ? away : home;
        const actualAway = leg === 2 ? home : away;

        matches.push({
          id: `GRP-R${leg}-MD${matchDay}-${actualHome}-vs-${actualAway}`,
          phase: "GROUP",
          round: leg,
          homePlayerId: actualHome,
          awayPlayerId: actualAway,
          games: [],
          homeScore: 0,
          awayScore: 0,
          homePoints: 0,
          awayPoints: 0,
          winnerId: null,
          status: "PENDING",
          matchDay,
        });
      }

      matchDay++;
      // Xoay mảng: phần tử cuối lên đầu
      rotatingCopy.unshift(rotatingCopy.pop()!);
    }
  }

  return matches;
}

/**
 * Sinh 2 trận chung kết (Nhất-Nhì, Ba-Tư)
 */
export function generateFinalsMatches(): Match[] {
  return [
    {
      id: "FINAL-1ST-2ND",
      phase: "FINAL",
      round: 0,
      homePlayerId: "",
      awayPlayerId: "",
      games: [],
      homeScore: 0,
      awayScore: 0,
      homePoints: 0,
      awayPoints: 0,
      winnerId: null,
      status: "PENDING",
      matchDay: 0,
    },
    {
      id: "THIRD-PLACE",
      phase: "THIRD_PLACE",
      round: 0,
      homePlayerId: "",
      awayPlayerId: "",
      games: [],
      homeScore: 0,
      awayScore: 0,
      homePoints: 0,
      awayPoints: 0,
      winnerId: null,
      status: "PENDING",
      matchDay: 0,
    },
  ];
}

/**
 * Tính điểm cho 1 trận đấu Bo5 từ danh sách games.
 * Thắng game = 3đ, Hòa game = 1đ, Thua game = 0đ.
 * Trận kết thúc khi 1 bên thắng 3 game.
 */
export function calculateMatchResult(games: GameResult[], isGroupPhase: boolean = true): {
  homeScore: number;
  awayScore: number;
  homePoints: number;
  awayPoints: number;
  totalGoalsHome: number;
  totalGoalsAway: number;
  winnerId: "home" | "away" | null;
  isCompleted: boolean;
} {
  let homeWins = 0;
  let awayWins = 0;
  let totalGoalsHome = 0;
  let totalGoalsAway = 0;

  for (const game of games) {
    totalGoalsHome += game.goalsHome || 0;
    totalGoalsAway += game.goalsAway || 0;

    if (game.winner === "home") {
      homeWins++;
    } else if (game.winner === "away") {
      awayWins++;
    }
  }

  let isCompleted = false;
  let winnerId: "home" | "away" | null = null;
  let homePoints = 0;
  let awayPoints = 0;

  if (isGroupPhase) {
    // Vòng loại: chạm 2 game thắng là kết thúc sớm, hoặc đã đá đủ 3 game
    const hasWinner = homeWins >= 2 || awayWins >= 2;
    const reachedMaxGames = games.length >= 3;

    if (hasWinner) {
      isCompleted = true;
      winnerId = homeWins >= 2 ? "home" : "away";
    } else if (reachedMaxGames) {
      isCompleted = true;
      if (homeWins > awayWins) winnerId = "home";
      else if (awayWins > homeWins) winnerId = "away";
      else winnerId = null; // Hòa
    }

    // Tính điểm trên BXH cho vòng loại
    if (isCompleted) {
      if (winnerId === "home") {
        homePoints = 3;
        awayPoints = 0;
      } else if (winnerId === "away") {
        homePoints = 0;
        awayPoints = 3;
      } else {
        // Hòa
        homePoints = 1;
        awayPoints = 1;
      }
    }
  } else {
    // Chung kết: chạm 3 game thắng là kết thúc sớm, hoặc đấu đủ 5 game
    const hasWinner = homeWins >= 3 || awayWins >= 3;
    const reachedMaxGames = games.length >= 5;

    if (hasWinner) {
      isCompleted = true;
      winnerId = homeWins >= 3 ? "home" : "away";
    } else if (reachedMaxGames) {
      isCompleted = true;
      if (homeWins > awayWins) winnerId = "home";
      else if (awayWins > homeWins) winnerId = "away";
      else winnerId = null;
    }

    if (isCompleted) {
      if (winnerId === "home") {
        homePoints = 3;
        awayPoints = 0;
      } else if (winnerId === "away") {
        homePoints = 0;
        awayPoints = 3;
      }
    }
  }

  return {
    homeScore: homeWins,
    awayScore: awayWins,
    homePoints,
    awayPoints,
    totalGoalsHome,
    totalGoalsAway,
    winnerId,
    isCompleted,
  };
}

/**
 * Tính BXH vòng loại từ danh sách trận đấu đã hoàn thành.
 */
export function calculateStandings(
  playerIds: string[],
  matches: Match[]
): StandingEntry[] {
  const map = new Map<string, StandingEntry>();

  // Khởi tạo
  for (const pid of playerIds) {
    map.set(pid, {
      playerId: pid,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDraw: 0,
      gameDifference: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      rank: 0,
    });
  }

  // Chỉ tính trận GROUP đã COMPLETED
  const groupMatches = matches.filter(
    (m) => m.phase === "GROUP" && m.status === "COMPLETED"
  );

  for (const match of groupMatches) {
    const home = map.get(match.homePlayerId);
    const away = map.get(match.awayPlayerId);
    if (!home || !away) continue;

    home.played++;
    away.played++;

    // Tổng điểm
    home.points += match.homePoints;
    away.points += match.awayPoints;

    // Game stats + Goals
    for (const game of match.games) {
      // Goals
      home.goalsFor += game.goalsHome || 0;
      home.goalsAgainst += game.goalsAway || 0;
      away.goalsFor += game.goalsAway || 0;
      away.goalsAgainst += game.goalsHome || 0;

      if (game.winner === "home") {
        home.gamesWon++;
        away.gamesLost++;
      } else if (game.winner === "away") {
        away.gamesWon++;
        home.gamesLost++;
      } else {
        home.gamesDraw++;
        away.gamesDraw++;
      }
    }

    // Match win/draw/loss
    if (match.winnerId === match.homePlayerId) {
      home.won++;
      away.lost++;
    } else if (match.winnerId === match.awayPlayerId) {
      away.won++;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
    }
  }

  // Tính game difference + goal difference
  for (const entry of map.values()) {
    entry.gameDifference = entry.gamesWon - entry.gamesLost;
    entry.goalDifference = entry.goalsFor - entry.goalsAgainst;
  }

  // Sắp xếp
  const standings = Array.from(map.values());
  standings.sort((a, b) => {
    // 1. Tổng điểm
    if (b.points !== a.points) return b.points - a.points;
    // 2. Hiệu số game
    if (b.gameDifference !== a.gameDifference)
      return b.gameDifference - a.gameDifference;
    // 3. Hiệu số bàn thắng
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    // 4. Đối đầu trực tiếp
    return resolveHeadToHead(a.playerId, b.playerId, groupMatches);
  });

  // Gán rank
  standings.forEach((s, i) => (s.rank = i + 1));

  return standings;
}

/**
 * Giải quyết đối đầu trực tiếp giữa 2 người chơi.
 */
function resolveHeadToHead(
  playerAId: string,
  playerBId: string,
  matches: Match[]
): number {
  let pointsA = 0;
  let pointsB = 0;

  for (const m of matches) {
    if (m.status !== "COMPLETED") continue;

    if (m.homePlayerId === playerAId && m.awayPlayerId === playerBId) {
      pointsA += m.homePoints;
      pointsB += m.awayPoints;
    } else if (m.homePlayerId === playerBId && m.awayPlayerId === playerAId) {
      pointsA += m.awayPoints;
      pointsB += m.homePoints;
    }
  }

  return pointsB - pointsA;
}

/**
 * Kiểm tra xem tất cả trận vòng loại đã hoàn thành chưa.
 */
export function areAllGroupMatchesCompleted(matches: Match[]): boolean {
  const groupMatches = matches.filter((m) => m.phase === "GROUP");
  return (
    groupMatches.length > 0 && groupMatches.every((m) => m.status === "COMPLETED")
  );
}

/**
 * Gán người chơi vào trận chung kết dựa trên BXH.
 */
export function assignFinalsPlayers(
  data: TournamentData
): TournamentData {
  const standings = data.standings;
  if (standings.length < 3) return data;

  const top1 = standings[0].playerId;
  const top2 = standings[1].playerId;

  let updatedMatches = data.matches.map((m) => {
    if (m.phase === "FINAL") {
      return { ...m, homePlayerId: top1, awayPlayerId: top2 };
    }
    return m;
  });

  if (standings.length >= 4) {
    const top3 = standings[2].playerId;
    const top4 = standings[3].playerId;
    updatedMatches = updatedMatches.map((m) => {
      if (m.phase === "THIRD_PLACE") {
        return { ...m, homePlayerId: top3, awayPlayerId: top4 };
      }
      return m;
    });
  } else {
    // Nếu chỉ có 3 người chơi, bỏ trận tranh hạng 3
    updatedMatches = updatedMatches.filter((m) => m.phase !== "THIRD_PLACE");
  }

  return {
    ...data,
    matches: updatedMatches,
    config: { ...data.config, status: "FINALS" },
  };
}
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
 * Sinh lß╗ïch thi ─æß║Ñu Round Robin bß║▒ng thuß║¡t to├ín v├▓ng tr├▓n (Circle Method).
 * Nß║┐u sß╗æ ng╞░ß╗¥i ch╞íi lß║╗, th├¬m "BYE" ─æß╗â ─æß║úm bß║úo chß║╡n.
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

  // Thuß║¡t to├ín circle method
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

        // Bß╗Å qua trß║¡n c├│ BYE
        if (home === "BYE" || away === "BYE") continue;

        // L╞░ß╗út vß╗ü th├¼ ─æß║úo s├ón
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
      // Xoay mß║úng: phß║ºn tß╗¡ cuß╗æi l├¬n ─æß║ºu
      rotatingCopy.unshift(rotatingCopy.pop()!);
    }
  }

  return matches;
}

/**
 * Sinh 2 trß║¡n chung kß║┐t (Nhß║Ñt-Nh├¼, Ba-T╞░)
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
 * T├¡nh ─æiß╗âm cho 1 trß║¡n ─æß║Ñu Bo5 tß╗½ danh s├ích games.
 * Thß║»ng game = 3─æ, H├▓a game = 1─æ, Thua game = 0─æ.
 * Trß║¡n kß║┐t th├║c khi 1 b├¬n thß║»ng 3 game.
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
    const gh = game.goalsHome || 0;
    const ga = game.goalsAway || 0;
    totalGoalsHome += gh;
    totalGoalsAway += ga;

    if (gh > ga) {
      homeWins++;
    } else if (ga > gh) {
      awayWins++;
    }
  }

  let isCompleted = false;
  let winnerId: "home" | "away" | null = null;
  let homePoints = 0;
  let awayPoints = 0;

  if (isGroupPhase) {
    // V├▓ng loß║íi: chß║ím 2 game thß║»ng l├á kß║┐t th├║c sß╗¢m, hoß║╖c ─æ├ú ─æ├í ─æß╗º 3 game
    const hasWinner = homeWins >= 2 || awayWins >= 2;
    const reachedMaxGames = games.length >= 3;

    if (hasWinner) {
      isCompleted = true;
      winnerId = homeWins >= 2 ? "home" : "away";
    } else if (reachedMaxGames) {
      isCompleted = true;
      if (homeWins > awayWins) winnerId = "home";
      else if (awayWins > homeWins) winnerId = "away";
      else winnerId = null; // H├▓a
    }

    // T├¡nh ─æiß╗âm tr├¬n BXH cho v├▓ng loß║íi
    if (isCompleted) {
      if (winnerId === "home") {
        homePoints = 3;
        awayPoints = 0;
      } else if (winnerId === "away") {
        homePoints = 0;
        awayPoints = 3;
      } else {
        // H├▓a
        homePoints = 1;
        awayPoints = 1;
      }
    }
  } else {
    // Chung kß║┐t: chß║ím 3 game thß║»ng l├á kß║┐t th├║c sß╗¢m, hoß║╖c ─æß║Ñu ─æß╗º 5 game
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
 * T├¡nh BXH v├▓ng loß║íi tß╗½ danh s├ích trß║¡n ─æß║Ñu ─æ├ú ho├án th├ánh.
 */
export function calculateStandings(
  playerIds: string[],
  matches: Match[]
): StandingEntry[] {
  const map = new Map<string, StandingEntry>();

  // Khß╗ƒi tß║ío
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

  // Chß╗ë t├¡nh trß║¡n GROUP ─æ├ú COMPLETED
  const groupMatches = matches.filter(
    (m) => m.phase === "GROUP" && m.status === "COMPLETED"
  );

  for (const match of groupMatches) {
    const home = map.get(match.homePlayerId);
    const away = map.get(match.awayPlayerId);
    if (!home || !away) continue;

    home.played++;
    away.played++;

    // Tß╗òng ─æiß╗âm
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

  // T├¡nh game difference + goal difference
  for (const entry of map.values()) {
    entry.gameDifference = entry.gamesWon - entry.gamesLost;
    entry.goalDifference = entry.goalsFor - entry.goalsAgainst;
  }

  // Sß║»p xß║┐p
  const standings = Array.from(map.values());
  standings.sort((a, b) => {
    // 1. Tß╗òng ─æiß╗âm
    if (b.points !== a.points) return b.points - a.points;
    // 2. Hiß╗çu sß╗æ game
    if (b.gameDifference !== a.gameDifference)
      return b.gameDifference - a.gameDifference;
    // 3. Hiß╗çu sß╗æ b├án thß║»ng
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    // 4. ─Éß╗æi ─æß║ºu trß╗▒c tiß║┐p
    return resolveHeadToHead(a.playerId, b.playerId, groupMatches);
  });

  // G├ín rank
  standings.forEach((s, i) => (s.rank = i + 1));

  return standings;
}

/**
 * Giß║úi quyß║┐t ─æß╗æi ─æß║ºu trß╗▒c tiß║┐p giß╗»a 2 ng╞░ß╗¥i ch╞íi.
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
 * Kiß╗âm tra xem tß║Ñt cß║ú trß║¡n v├▓ng loß║íi ─æ├ú ho├án th├ánh ch╞░a.
 */
export function areAllGroupMatchesCompleted(matches: Match[]): boolean {
  const groupMatches = matches.filter((m) => m.phase === "GROUP");
  return (
    groupMatches.length > 0 && groupMatches.every((m) => m.status === "COMPLETED")
  );
}

/**
 * G├ín ng╞░ß╗¥i ch╞íi v├áo trß║¡n chung kß║┐t dß╗▒a tr├¬n BXH.
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
    // Nß║┐u chß╗ë c├│ 3 ng╞░ß╗¥i ch╞íi, bß╗Å trß║¡n tranh hß║íng 3
    updatedMatches = updatedMatches.filter((m) => m.phase !== "THIRD_PLACE");
  }

  return {
    ...data,
    matches: updatedMatches,
    config: { ...data.config, status: "FINALS" },
  };
}

// ============================================================
// FC MOBILE TOURNAMENT MANAGER - TYPE DEFINITIONS
// ============================================================

export type Player = {
  id: string;
  name: string;
  inGameId: string;
  favoriteTeam: string;
  ovr: number;
  avatarUrl: string;
  createdAt: string;
};

export type GameResult = {
  goalsHome: number;  // B├án thß║»ng/Tß╗ë sß╗æ home ghi ─æ╞░ß╗úc trong game
  goalsAway: number;  // B├án thß║»ng/Tß╗ë sß╗æ away ghi ─æ╞░ß╗úc trong game
  winner: "home" | "away" | "draw";
};

export type MatchStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type MatchPhase = "GROUP" | "FINAL" | "THIRD_PLACE";

export type Match = {
  id: string;
  phase: MatchPhase;
  round: number; // 1 = l╞░ß╗út ─æi, 2 = l╞░ß╗út vß╗ü
  homePlayerId: string;
  awayPlayerId: string;
  games: GameResult[]; // Tß╗æi ─æa 5 game (Bo5)
  homeScore: number; // Sß╗æ game thß║»ng cß╗ºa home
  awayScore: number; // Sß╗æ game thß║»ng cß╗ºa away
  homePoints: number; // Tß╗òng ─æiß╗âm home nhß║¡n ─æ╞░ß╗úc
  awayPoints: number; // Tß╗òng ─æiß╗âm away nhß║¡n ─æ╞░ß╗úc
  winnerId: string | null;
  status: MatchStatus;
  matchDay: number; // Ng├áy thi ─æß║Ñu thß╗⌐ mß║Ñy
};

export type StandingEntry = {
  playerId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  gameDifference: number;
  goalsFor: number;       // Tß╗òng b├án thß║»ng ghi ─æ╞░ß╗úc
  goalsAgainst: number;   // Tß╗òng b├án thß║»ng bß╗ï thß╗ºng
  goalDifference: number; // Hiß╗çu sß╗æ b├án thß║»ng
  points: number;
  rank: number;
};

export type TournamentConfig = {
  legs: 1 | 2;
  maxPlayers: number;
  selectedPlayerIds: string[];
  createdAt: string | null;
  status: "NOT_STARTED" | "GROUP_STAGE" | "FINALS" | "COMPLETED";
};

export type TournamentData = {
  config: TournamentConfig;
  players: Player[];
  matches: Match[];
  standings: StandingEntry[];
};

export const DEFAULT_TOURNAMENT_DATA: TournamentData = {
  config: {
    legs: 1,
    maxPlayers: 8,
    selectedPlayerIds: [],
    createdAt: null,
    status: "NOT_STARTED",
  },
  players: [],
  matches: [],
  standings: [],
};

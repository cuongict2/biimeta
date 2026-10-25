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
  goalsHome: number;  // Bàn thắng/Tỉ số home ghi được trong game
  goalsAway: number;  // Bàn thắng/Tỉ số away ghi được trong game
  winner: "home" | "away" | "draw";
};

export type MatchStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type MatchPhase = "GROUP" | "FINAL" | "THIRD_PLACE";

export type Match = {
  id: string;
  phase: MatchPhase;
  round: number; // 1 = lượt đi, 2 = lượt về
  homePlayerId: string;
  awayPlayerId: string;
  games: GameResult[]; // Tối đa 5 game (Bo5)
  homeScore: number; // Số game thắng của home
  awayScore: number; // Số game thắng của away
  homePoints: number; // Tổng điểm home nhận được
  awayPoints: number; // Tổng điểm away nhận được
  winnerId: string | null;
  status: MatchStatus;
  matchDay: number; // Ngày thi đấu thứ mấy
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
  goalsFor: number;       // Tổng bàn thắng ghi được
  goalsAgainst: number;   // Tổng bàn thắng bị thủng
  goalDifference: number; // Hiệu số bàn thắng
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
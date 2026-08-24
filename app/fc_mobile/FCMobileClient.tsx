'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas-pro';
import {
  TournamentData,
  Player,
  Match,
  GameResult,
  DEFAULT_TOURNAMENT_DATA,
} from './types';

// ============================================================
// TYPES FOR UI STATE
// ============================================================
type Tab = "dashboard" | "players" | "matches";

type PlayerFormData = {
  id?: string;
  name: string;
  inGameId: string;
  favoriteTeam: string;
  ovr: number;
  avatarUrl: string;
};

const EMPTY_PLAYER_FORM: PlayerFormData = {
  name: "",
  inGameId: "",
  favoriteTeam: "",
  ovr: 100,
  avatarUrl: "",
};

// ============================================================
// MAIN CLIENT COMPONENT
// ============================================================
export default function FCMobileClient() {
  const [data, setData] = useState<TournamentData>(DEFAULT_TOURNAMENT_DATA);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Player Modal
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerForm, setPlayerForm] = useState<PlayerFormData>(EMPTY_PLAYER_FORM);
  const [editingPlayer, setEditingPlayer] = useState(false);

  // Match Modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchGames, setMatchGames] = useState<GameResult[]>([]);

  // Tournament Setup
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedLegs, setSelectedLegs] = useState<1 | 2>(1);

  // Match Detail Modal (xem lại chi tiết sau khi lưu)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailMatch, setDetailMatch] = useState<Match | null>(null);

  // Bộ lọc trận đấu
  type MatchFilter = "all" | "pending" | "completed";
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");
  const [matchSearch, setMatchSearch] = useState("");

  // Ref cho BXH để chụp ảnh
  const standingsRef = useRef<HTMLDivElement>(null);

  // ---- DATA FETCHING ----
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/fc_mobile/api/tournament");
      const json = await res.json();
      setData(json);
    } catch {
      showToast("Lỗi tải dữ liệu!");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- TOAST ----
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ---- HELPER: Get player name by ID ----
  const getPlayerName = (id: string) => {
    return data.players.find((p) => p.id === id)?.name || "TBD";
  };
  const getPlayer = (id: string) => {
    return data.players.find((p) => p.id === id);
  };

  // ============================================================
  // PLAYER ACTIONS
  // ============================================================
  const handleSavePlayer = async () => {
    if (!playerForm.name.trim() || !playerForm.inGameId.trim()) {
      showToast("Vui lòng nhập Tên và In-game ID!");
      return;
    }

    try {
      const method = editingPlayer ? "PUT" : "POST";
      const res = await fetch("/fc_mobile/api/players", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playerForm),
      });
      const json = await res.json();

      if (!res.ok) {
        showToast(json.error || (json.details ? `Lỗi: ${json.details}` : "Có lỗi xảy ra!"));
        return;
      }

      showToast(editingPlayer ? "Đã cập nhật game thủ!" : "Đã thêm game thủ!");
      setShowPlayerModal(false);
      setPlayerForm(EMPTY_PLAYER_FORM);
      setEditingPlayer(false);
      fetchData();
    } catch {
      showToast("Lỗi kết nối!");
    }
  };

  const handleEditPlayer = (player: Player) => {
    setPlayerForm({
      id: player.id,
      name: player.name,
      inGameId: player.inGameId,
      favoriteTeam: player.favoriteTeam,
      ovr: player.ovr,
      avatarUrl: player.avatarUrl,
    });
    setEditingPlayer(true);
    setShowPlayerModal(true);
  };

  const handleDeletePlayer = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa game thủ này?")) return;

    try {
      const res = await fetch(`/fc_mobile/api/players?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok) {
        showToast(json.error || "Không thể xóa!");
        return;
      }

      showToast("Đã xóa game thủ!");
      fetchData();
    } catch {
      showToast("Lỗi kết nối!");
    }
  };

  // ============================================================
  // TOURNAMENT ACTIONS
  // ============================================================
  const handleCreateTournament = async () => {
    if (selectedPlayerIds.length < 3) {
      showToast("Cần tối thiểu 3 người chơi!");
      return;
    }
    if (selectedPlayerIds.length > 8) {
      showToast("Tối đa 8 người chơi!");
      return;
    }

    try {
      const res = await fetch("/fc_mobile/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPlayerIds,
          legs: selectedLegs,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        showToast(json.error || (json.details ? `Lỗi: ${json.details}` : "Có lỗi xảy ra!"));
        return;
      }

      showToast(
        `Giải đấu đã tạo! ${json.totalGroupMatches} trận vòng loại + ${json.totalFinalsMatches} trận chung kết`
      );
      setActiveTab("dashboard");
      fetchData();
    } catch {
      showToast("Lỗi kết nối!");
    }
  };

  const handleResetTournament = async () => {
    if (!confirm("Bạn có chắc muốn RESET toàn bộ giải đấu? Dữ liệu trận đấu sẽ bị xóa!"))
      return;

    try {
      const res = await fetch("/fc_mobile/api/tournament", { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        showToast(json.error || "Có lỗi xảy ra!");
        return;
      }

      showToast("Giải đấu đã được reset!");
      setSelectedPlayerIds([]);
      fetchData();
    } catch {
      showToast("Lỗi kết nối!");
    }
  };

  // ============================================================
  // MATCH ACTIONS
  // ============================================================
  const handleOpenMatchModal = (match: Match) => {
    setSelectedMatch(match);
    if (match.games.length > 0) {
      setMatchGames([...match.games]);
    } else {
      setMatchGames([{ goalsHome: 0, goalsAway: 0, winner: "draw" }]);
    }
    setShowMatchModal(true);
  };

  const handleAddGame = () => {
    const isGroup = selectedMatch?.phase === "GROUP";
    const maxGames = isGroup ? 3 : 5;
    const targetWins = isGroup ? 2 : 3;

    if (matchGames.length >= maxGames) {
      showToast(`Tối đa ${maxGames} game!`);
      return;
    }
    // Kiểm tra đã có ai thắng chạm chưa
    let hw = 0,
      aw = 0;
    for (const g of matchGames) {
      if (g.winner === "home") hw++;
      if (g.winner === "away") aw++;
    }
    if (hw >= targetWins || aw >= targetWins) {
      showToast("Trận đấu đã kết thúc!");
      return;
    }
    setMatchGames([...matchGames, { goalsHome: 0, goalsAway: 0, winner: "draw" }]);
  };

  const handleRemoveLastGame = () => {
    if (matchGames.length <= 1) return;
    setMatchGames(matchGames.slice(0, -1));
  };

  const handleUpdateGame = (
    index: number,
    field: keyof GameResult,
    value: number | string
  ) => {
    const updated = [...matchGames];
    if (field === "goalsHome") {
      updated[index].goalsHome = value as number;
      // Tự động tính winner dựa trên bàn thắng
      const gh = value as number;
      const ga = updated[index].goalsAway || 0;
      if (gh > ga) updated[index].winner = "home";
      else if (ga > gh) updated[index].winner = "away";
      else updated[index].winner = "draw";
    } else if (field === "goalsAway") {
      updated[index].goalsAway = value as number;
      const gh = updated[index].goalsHome || 0;
      const ga = value as number;
      if (gh > ga) updated[index].winner = "home";
      else if (ga > gh) updated[index].winner = "away";
      else updated[index].winner = "draw";
    } else if (field === "winner") {
      updated[index].winner = value as "home" | "away" | "draw";
    }
    setMatchGames(updated);
  };

  const handleSaveMatch = async () => {
    if (!selectedMatch) return;

    // Tính toán số trận thắng hiện tại
    let hw = 0, aw = 0;
    for (const g of matchGames) {
      if (g.winner === "home") hw++;
      else if (g.winner === "away") aw++;
    }

    const isGroup = selectedMatch.phase === "GROUP";
    if (isGroup) {
      const hasWinner = hw >= 2 || aw >= 2;
      const reachedMaxGames = matchGames.length === 3;
      if (!hasWinner && !reachedMaxGames) {
        showToast("Trận đấu chưa kết thúc! Vòng loại yêu cầu thắng chạm 2 game hoặc đấu đủ 3 game.");
        return;
      }
    } else {
      const hasWinner = hw >= 3 || aw >= 3;
      const reachedMaxGames = matchGames.length === 5;
      if (!hasWinner && !reachedMaxGames) {
        showToast("Trận đấu chưa kết thúc! Chung kết yêu cầu thắng chạm 3 game hoặc đấu đủ 5 game.");
        return;
      }
    }

    try {
      const res = await fetch("/fc_mobile/api/matches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selectedMatch.id,
          games: matchGames,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        showToast(json.error || (json.details ? `Lỗi: ${json.details}` : "Có lỗi xảy ra!"));
        return;
      }

      showToast("Đã cập nhật kết quả trận đấu!");

      if (json.tournamentStatus === "FINALS" && data.config.status === "GROUP_STAGE") {
        showToast("🏆 Vòng loại hoàn tất! Chuyển sang Chung kết!");
      }
      if (json.tournamentStatus === "COMPLETED") {
        showToast("🎉 Giải đấu đã kết thúc!");
      }

      setShowMatchModal(false);
      setSelectedMatch(null);
      fetchData();
    } catch {
      showToast("Lỗi kết nối!");
    }
  };

  // ============================================================
  // DOWNLOAD STANDINGS AS IMAGE
  // ============================================================
  const handleDownloadStandings = async () => {
    if (!standingsRef.current) return;
    try {
      const canvas = await html2canvas(standingsRef.current, {
        backgroundColor: '#0a0e17',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `BXH_FC_Mobile_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Đã tải ảnh BXH!');
    } catch {
      showToast('Lỗi khi tạo ảnh!');
    }
  };

  // ============================================================
  // VIEW MATCH DETAIL (read-only popup)
  // ============================================================
  const handleViewDetail = (match: Match) => {
    setDetailMatch(match);
    setShowDetailModal(true);
  };

  // ============================================================
  // FILTER MATCHES
  // ============================================================
  const getFilteredMatches = (matches: Match[]) => {
    let filtered = matches;
    if (matchFilter === 'pending') {
      filtered = filtered.filter((m) => m.status !== 'COMPLETED');
    } else if (matchFilter === 'completed') {
      filtered = filtered.filter((m) => m.status === 'COMPLETED');
    }
    if (matchSearch.trim()) {
      const q = matchSearch.trim().toLowerCase();
      filtered = filtered.filter((m) => {
        const homeName = getPlayerName(m.homePlayerId).toLowerCase();
        const awayName = getPlayerName(m.awayPlayerId).toLowerCase();
        return homeName.includes(q) || awayName.includes(q);
      });
    }
    return filtered;
  };

  // ============================================================
  // PLAYER SELECTION TOGGLE
  // ============================================================
  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : prev.length < 8
        ? [...prev, playerId]
        : prev
    );
  };

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="fc-pulse text-4xl mb-4">⚽</div>
          <p className="text-[var(--fc-text-muted)] text-lg">Đang tải...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  const groupMatches = data.matches.filter((m) => m.phase === "GROUP");
  const finalsMatches = data.matches.filter(
    (m) => m.phase === "FINAL" || m.phase === "THIRD_PLACE"
  );
  const isNotStarted = data.config.status === "NOT_STARTED";

  return (
    <>
      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 200,
            background: "linear-gradient(135deg, #d4af37, #10b981)",
            color: "#000",
            padding: "12px 24px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: "0.9rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
          className="fc-animate-in"
        >
          {toast}
        </div>
      )}

      {/* HEADER */}
      <header className="fc-header px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚽</span>
            <h1 className="fc-header-title text-2xl font-extrabold tracking-tight">
              FC Mobile Tournament
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`fc-badge ${
              data.config.status === "NOT_STARTED"
                ? "fc-badge-pending"
                : data.config.status === "COMPLETED"
                ? "fc-badge-completed"
                : "fc-badge-finals"
            }`}>
              {data.config.status === "NOT_STARTED" && "Chưa bắt đầu"}
              {data.config.status === "GROUP_STAGE" && "Vòng loại"}
              {data.config.status === "FINALS" && "Chung kết"}
              {data.config.status === "COMPLETED" && "Hoàn thành"}
            </span>
          </div>
        </div>

        {/* TABS */}
        <div className="max-w-7xl mx-auto flex gap-1 mt-4">
          {(["dashboard", "players", "matches"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`fc-tab ${activeTab === tab ? "fc-tab-active" : ""}`}
            >
              {tab === "dashboard" && "📊 Dashboard"}
              {tab === "players" && "🎮 Game Thủ"}
              {tab === "matches" && "🏟️ Trận Đấu"}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ======== TAB: DASHBOARD ======== */}
        {activeTab === "dashboard" && (
          <div className="fc-animate-in">
            {/* TOURNAMENT SETUP - Only when NOT_STARTED */}
            {isNotStarted && (
              <section className="mb-8">
                <div className="fc-card">
                  <h3
                    style={{
                      color: "var(--fc-gold)",
                      fontSize: "1.4rem",
                      marginBottom: 20,
                      textAlign: "center",
                    }}
                  >
                    ⚙️ Cấu Hình Giải Đấu
                  </h3>

                  {data.players.length < 3 ? (
                    <p
                      style={{
                        textAlign: "center",
                        color: "var(--fc-text-muted)",
                      }}
                    >
                      Cần thêm ít nhất 3 game thủ. Hiện có:{" "}
                      <strong>{data.players.length}</strong>
                      <br />
                      <button
                        className="fc-btn fc-btn-gold mt-4"
                        onClick={() => setActiveTab("players")}
                      >
                        Thêm Game Thủ
                      </button>
                    </p>
                  ) : (
                    <>
                      {/* Chọn người chơi */}
                      <div className="mb-6">
                        <label className="fc-label mb-3 block">
                          Chọn người chơi tham gia (3-8 người):{" "}
                          <strong className="text-[var(--fc-gold)]">
                            {selectedPlayerIds.length} đã chọn
                          </strong>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {data.players.map((p) => (
                            <label
                              key={p.id}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                selectedPlayerIds.includes(p.id)
                                  ? "bg-[rgba(212,175,55,0.15)] border border-[var(--fc-gold)]"
                                  : "bg-[var(--fc-dark)] border border-[var(--fc-border)] hover:border-[var(--fc-gold)]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="fc-checkbox"
                                checked={selectedPlayerIds.includes(p.id)}
                                onChange={() => togglePlayerSelection(p.id)}
                              />
                              <div>
                                <div className="font-bold text-sm">{p.name}</div>
                                <div className="text-xs text-[var(--fc-text-muted)]">
                                  OVR {p.ovr}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Chọn số lượt */}
                      <div className="mb-6">
                        <label className="fc-label mb-2 block">
                          Số lượt đấu vòng loại:
                        </label>
                        <div className="flex gap-4">
                          <label
                            className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                              selectedLegs === 1
                                ? "bg-[rgba(212,175,55,0.15)] border border-[var(--fc-gold)]"
                                : "bg-[var(--fc-dark)] border border-[var(--fc-border)]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="legs"
                              checked={selectedLegs === 1}
                              onChange={() => setSelectedLegs(1)}
                              style={{ accentColor: "var(--fc-gold)" }}
                            />
                            <span className="font-semibold">1 lượt (Lượt đi)</span>
                          </label>
                          <label
                            className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                              selectedLegs === 2
                                ? "bg-[rgba(212,175,55,0.15)] border border-[var(--fc-gold)]"
                                : "bg-[var(--fc-dark)] border border-[var(--fc-border)]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="legs"
                              checked={selectedLegs === 2}
                              onChange={() => setSelectedLegs(2)}
                              style={{ accentColor: "var(--fc-gold)" }}
                            />
                            <span className="font-semibold">
                              2 lượt (Lượt đi & về)
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-4 justify-center">
                        <button
                          className="fc-btn fc-btn-gold"
                          onClick={handleCreateTournament}
                          disabled={selectedPlayerIds.length < 3}
                        >
                          🏆 Tạo Giải Đấu
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* RESET BUTTON - when tournament active */}
            {!isNotStarted && (
              <div className="flex justify-end mb-4">
                <button className="fc-btn fc-btn-red" onClick={handleResetTournament}>
                  🗑️ Reset Giải Đấu
                </button>
              </div>
            )}

            {/* STANDINGS TABLE */}
            {!isNotStarted && data.standings.length > 0 && (
              <section className="mb-8 fc-animate-in">
                <div ref={standingsRef} className="fc-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div
                    style={{
                      padding: "20px 24px",
                      borderBottom: "1px solid var(--fc-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <h3
                      style={{
                        color: "var(--fc-gold)",
                        fontSize: "1.3rem",
                        margin: 0,
                        textAlign: "left",
                      }}
                    >
                      📊 Bảng Xếp Hạng Vòng Loại
                    </h3>
                    <button
                      className="fc-btn fc-btn-outline"
                      style={{ padding: "6px 14px", fontSize: "0.75rem" }}
                      onClick={handleDownloadStandings}
                    >
                      📸 Tải ảnh BXH
                    </button>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="fc-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th style={{ textAlign: "left" }}>Game Thủ</th>
                          <th>Trận</th>
                          <th>T</th>
                          <th>H</th>
                          <th>B</th>
                          <th>GW</th>
                          <th>GL</th>
                          <th>GD</th>
                          <th>GF</th>
                          <th>GA</th>
                          <th>+/-</th>
                          <th>Điểm</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.standings.map((s) => {
                          const player = getPlayer(s.playerId);
                          const rankClass =
                            s.rank === 1
                              ? "fc-rank-1"
                              : s.rank === 2
                              ? "fc-rank-2"
                              : s.rank === 3
                              ? "fc-rank-3"
                              : "";
                          return (
                            <tr key={s.playerId}>
                              <td className={rankClass}>
                                {s.rank <= 3 ? ["🥇", "🥈", "🥉"][s.rank - 1] : s.rank}
                              </td>
                              <td style={{ textAlign: "left", fontWeight: 600 }}>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {player?.avatarUrl ? (
                                      <img
                                        src={player.avatarUrl}
                                        alt=""
                                        style={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: "50%",
                                          objectFit: "cover",
                                        }}
                                      />
                                    ) : (
                                      "👤"
                                    )}
                                  </span>
                                  <span>{player?.name || s.playerId}</span>
                                </div>
                              </td>
                              <td>{s.played}</td>
                              <td style={{ color: "var(--fc-emerald)" }}>{s.won}</td>
                              <td>{s.drawn}</td>
                              <td style={{ color: "var(--fc-red)" }}>{s.lost}</td>
                              <td>{s.gamesWon}</td>
                              <td>{s.gamesLost}</td>
                              <td
                                style={{
                                  color:
                                    s.gameDifference > 0
                                      ? "var(--fc-emerald)"
                                      : s.gameDifference < 0
                                      ? "var(--fc-red)"
                                      : "inherit",
                                  fontWeight: 700,
                                }}
                              >
                                {s.gameDifference > 0
                                  ? `+${s.gameDifference}`
                                  : s.gameDifference}
                              </td>
                              <td>{s.goalsFor}</td>
                              <td>{s.goalsAgainst}</td>
                              <td
                                style={{
                                  color:
                                    s.goalDifference > 0
                                      ? "var(--fc-emerald)"
                                      : s.goalDifference < 0
                                      ? "var(--fc-red)"
                                      : "inherit",
                                  fontWeight: 700,
                                }}
                              >
                                {s.goalDifference > 0
                                  ? `+${s.goalDifference}`
                                  : s.goalDifference}
                              </td>
                              <td
                                style={{
                                  fontWeight: 800,
                                  fontSize: "1.1rem",
                                  color: "var(--fc-gold)",
                                }}
                              >
                                {s.points}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* FINALS SECTION */}
            {(data.config.status === "FINALS" ||
              data.config.status === "COMPLETED") && (
              <section className="mb-8 fc-animate-in">
                <div className="fc-card">
                  <h3
                    style={{
                      color: "var(--fc-gold)",
                      fontSize: "1.3rem",
                      marginBottom: 20,
                      textAlign: "center",
                    }}
                  >
                    🏆 Vòng Chung Kết
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {finalsMatches.map((match) => {
                      const homeName = getPlayerName(match.homePlayerId);
                      const awayName = getPlayerName(match.awayPlayerId);
                      const label =
                        match.phase === "FINAL"
                          ? "🥇 Chung Kết - Tranh Nhất Nhì"
                          : "🥉 Tranh Hạng Ba - Tư";

                      return (
                        <div
                          key={match.id}
                          className="fc-match-card finals"
                          style={{ flexDirection: "column", cursor: "pointer" }}
                          onClick={() => handleOpenMatchModal(match)}
                        >
                          <div
                            className="text-center text-sm font-bold mb-3"
                            style={{ color: "var(--fc-gold)" }}
                          >
                            {label}
                          </div>
                          <div className="flex items-center justify-between w-full">
                            <div className="text-center flex-1">
                              <div className="font-bold text-lg">{homeName}</div>
                            </div>
                            <div className="text-center px-4">
                              {match.status === "COMPLETED" ? (
                                <div className="fc-match-score">
                                  <span
                                    style={{
                                      color:
                                        match.homeScore > match.awayScore
                                          ? "var(--fc-emerald)"
                                          : "var(--fc-red)",
                                    }}
                                  >
                                    {match.homeScore}
                                  </span>
                                  <span
                                    style={{
                                      color: "var(--fc-text-muted)",
                                      margin: "0 8px",
                                      fontSize: "1rem",
                                    }}
                                  >
                                    -
                                  </span>
                                  <span
                                    style={{
                                      color:
                                        match.awayScore > match.homeScore
                                          ? "var(--fc-emerald)"
                                          : "var(--fc-red)",
                                    }}
                                  >
                                    {match.awayScore}
                                  </span>
                                </div>
                              ) : (
                                <span className="fc-match-vs">VS</span>
                              )}
                            </div>
                            <div className="text-center flex-1">
                              <div className="font-bold text-lg">{awayName}</div>
                            </div>
                          </div>
                          <span
                            className={`fc-badge mt-2 ${
                              match.status === "COMPLETED"
                                ? "fc-badge-completed"
                                : "fc-badge-pending"
                            }`}
                          >
                            {match.status === "COMPLETED" ? "Đã đấu" : "Chưa đấu"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* GROUP MATCHES SCHEDULE (Dashboard view) */}
            {!isNotStarted && groupMatches.length > 0 && (
              <section className="fc-animate-in">
                <div className="fc-card" style={{ padding: "20px 24px" }}>
                  <h3
                    style={{
                      color: "var(--fc-gold)",
                      fontSize: "1.3rem",
                      marginBottom: 16,
                      textAlign: "left",
                    }}
                  >
                    📅 Lịch Thi Đấu Vòng Loại
                  </h3>
                  <div className="space-y-3">
                    {groupMatches.map((match) => (
                      <div
                        key={match.id}
                        className={`fc-match-card ${match.status === "COMPLETED" ? "completed" : "pending"}`}
                      >
                        <div className="flex-1 text-right font-semibold">
                          {getPlayerName(match.homePlayerId)}
                        </div>
                        <div className="text-center px-4" style={{ minWidth: 80 }}>
                          {match.status === "COMPLETED" ? (
                            <span className="fc-match-score" style={{ fontSize: "1.3rem" }}>
                              <span
                                style={{
                                  color:
                                    match.homeScore > match.awayScore
                                      ? "var(--fc-emerald)"
                                      : "var(--fc-red)",
                                }}
                              >
                                {match.homeScore}
                              </span>
                              <span style={{ color: "var(--fc-text-muted)", margin: "0 6px" }}>
                                -
                              </span>
                              <span
                                style={{
                                  color:
                                    match.awayScore > match.homeScore
                                      ? "var(--fc-emerald)"
                                      : "var(--fc-red)",
                                }}
                              >
                                {match.awayScore}
                              </span>
                            </span>
                          ) : (
                            <span className="fc-match-vs">VS</span>
                          )}
                        </div>
                        <div className="flex-1 font-semibold">
                          {getPlayerName(match.awayPlayerId)}
                        </div>
                        <span
                          className={`fc-badge ${
                            match.status === "COMPLETED"
                              ? "fc-badge-completed"
                              : "fc-badge-pending"
                          }`}
                        >
                          {match.status === "COMPLETED" ? "✅" : "⏳"}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--fc-text-muted)" }}
                        >
                          R{match.round} / MD{match.matchDay}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ======== TAB: PLAYERS ======== */}
        {activeTab === "players" && (
          <div className="fc-animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2
                style={{
                  color: "var(--fc-gold)",
                  fontSize: "1.6rem",
                  margin: 0,
                  textAlign: "left",
                }}
              >
                🎮 Quản Lý Game Thủ ({data.players.length})
              </h2>
              <button
                className="fc-btn fc-btn-gold"
                onClick={() => {
                  setPlayerForm(EMPTY_PLAYER_FORM);
                  setEditingPlayer(false);
                  setShowPlayerModal(true);
                }}
              >
                + Thêm Game Thủ
              </button>
            </div>

            {data.players.length === 0 ? (
              <div className="fc-card text-center py-16">
                <div className="text-5xl mb-4">🎮</div>
                <p style={{ color: "var(--fc-text-muted)", fontSize: "1.1rem" }}>
                  Chưa có game thủ nào. Hãy thêm game thủ để bắt đầu!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {data.players.map((player) => (
                  <div key={player.id} className="fc-player-card">
                    <div className="fc-player-avatar">
                      {player.avatarUrl ? (
                        <img src={player.avatarUrl} alt={player.name} />
                      ) : (
                        "👤"
                      )}
                    </div>
                    <h4
                      style={{
                        fontWeight: 800,
                        fontSize: "1.15rem",
                        marginBottom: 4,
                        color: "#fff",
                      }}
                    >
                      {player.name}
                    </h4>
                    <p
                      style={{
                        color: "var(--fc-text-muted)",
                        fontSize: "0.85rem",
                        margin: "2px 0",
                      }}
                    >
                      ID: {player.inGameId}
                    </p>
                    {player.favoriteTeam && (
                      <p
                        style={{
                          color: "var(--fc-text-muted)",
                          fontSize: "0.8rem",
                          margin: "2px 0",
                        }}
                      >
                        ⚽ {player.favoriteTeam}
                      </p>
                    )}
                    <div className="fc-ovr-badge">{player.ovr}</div>
                    <div className="flex gap-2 justify-center mt-4">
                      <button
                        className="fc-btn fc-btn-outline"
                        style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                        onClick={() => handleEditPlayer(player)}
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        className="fc-btn fc-btn-red"
                        style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                        onClick={() => handleDeletePlayer(player.id)}
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======== TAB: MATCHES ======== */}
        {activeTab === "matches" && (
          <div className="fc-animate-in">
            <h2
              style={{
                color: "var(--fc-gold)",
                fontSize: "1.6rem",
                marginBottom: 16,
                textAlign: "left",
              }}
            >
              🏟️ Nhập Kết Quả Trận Đấu
            </h2>

            {isNotStarted ? (
              <div className="fc-card text-center py-16">
                <div className="text-5xl mb-4">🏟️</div>
                <p style={{ color: "var(--fc-text-muted)", fontSize: "1.1rem" }}>
                  Chưa tạo giải đấu. Hãy vào Dashboard để cấu hình và tạo giải!
                </p>
                <button
                  className="fc-btn fc-btn-gold mt-4"
                  onClick={() => setActiveTab("dashboard")}
                >
                  Đi tới Dashboard
                </button>
              </div>
            ) : (
              <>
                {/* BỘ LỌC */}
                <div className="fc-card mb-6" style={{ padding: "16px 20px" }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-2">
                      {(["all", "pending", "completed"] as MatchFilter[]).map((f) => (
                        <button
                          key={f}
                          className={`fc-btn ${matchFilter === f ? "fc-btn-gold" : "fc-btn-outline"}`}
                          style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                          onClick={() => setMatchFilter(f)}
                        >
                          {f === "all" && "Tất cả"}
                          {f === "pending" && "⏳ Chưa đá"}
                          {f === "completed" && "✅ Đã xong"}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1" style={{ minWidth: 200 }}>
                      <input
                        className="fc-input"
                        placeholder="🔍 Tìm theo tên game thủ..."
                        value={matchSearch}
                        onChange={(e) => setMatchSearch(e.target.value)}
                        style={{ padding: "8px 14px" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Group Matches */}
                {groupMatches.length > 0 && (
                  <section className="mb-8">
                    <h3
                      style={{
                        color: "var(--fc-text)",
                        fontSize: "1.2rem",
                        marginBottom: 16,
                        textAlign: "left",
                      }}
                    >
                      📋 Vòng Loại ({groupMatches.filter((m) => m.status === "COMPLETED").length}/
                      {groupMatches.length} trận)
                    </h3>
                    {getFilteredMatches(groupMatches).length === 0 ? (
                      <p style={{ color: "var(--fc-text-muted)", textAlign: "center", padding: 20 }}>
                        Không có trận đấu phù hợp bộ lọc.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {getFilteredMatches(groupMatches).map((match) => (
                          <div
                            key={match.id}
                            className={`fc-match-card ${match.status === "COMPLETED" ? "completed" : "pending"}`}
                            style={{ cursor: "pointer" }}
                            onClick={() => match.status === "COMPLETED" ? handleViewDetail(match) : handleOpenMatchModal(match)}
                          >
                            <div className="flex-1 text-right font-semibold">
                              {getPlayerName(match.homePlayerId)}
                            </div>
                            <div className="text-center px-4" style={{ minWidth: 80 }}>
                              {match.status === "COMPLETED" ? (
                                <span className="fc-match-score" style={{ fontSize: "1.3rem" }}>
                                  <span style={{ color: match.homeScore > match.awayScore ? "var(--fc-emerald)" : "var(--fc-red)" }}>
                                    {match.homeScore}
                                  </span>
                                  <span style={{ color: "var(--fc-text-muted)", margin: "0 6px" }}>-</span>
                                  <span style={{ color: match.awayScore > match.homeScore ? "var(--fc-emerald)" : "var(--fc-red)" }}>
                                    {match.awayScore}
                                  </span>
                                </span>
                              ) : (
                                <span className="fc-match-vs">VS</span>
                              )}
                            </div>
                            <div className="flex-1 font-semibold">
                              {getPlayerName(match.awayPlayerId)}
                            </div>
                            <div className="flex gap-2">
                              {match.status === "COMPLETED" && (
                                <button
                                  className="fc-btn fc-btn-outline"
                                  style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                                  onClick={(e) => { e.stopPropagation(); handleViewDetail(match); }}
                                >
                                  👁️
                                </button>
                              )}
                              <button
                                className="fc-btn fc-btn-emerald"
                                style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                                onClick={(e) => { e.stopPropagation(); handleOpenMatchModal(match); }}
                              >
                                {match.status === "COMPLETED" ? "📝 Sửa" : "✏️ Nhập"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Finals Matches */}
                {finalsMatches.length > 0 &&
                  finalsMatches.some((m) => m.homePlayerId) && (
                    <section>
                      <h3
                        style={{
                          color: "var(--fc-gold)",
                          fontSize: "1.2rem",
                          marginBottom: 16,
                          textAlign: "left",
                        }}
                      >
                        🏆 Chung Kết
                      </h3>
                      <div className="space-y-3">
                        {finalsMatches
                          .filter((m) => m.homePlayerId)
                          .map((match) => (
                            <div
                              key={match.id}
                              className="fc-match-card finals"
                              style={{ cursor: "pointer" }}
                              onClick={() => match.status === "COMPLETED" ? handleViewDetail(match) : handleOpenMatchModal(match)}
                            >
                              <div className="text-sm font-bold" style={{ color: "var(--fc-gold)" }}>
                                {match.phase === "FINAL" ? "🥇 CK" : "🥉 H3"}
                              </div>
                              <div className="flex-1 text-right font-semibold">
                                {getPlayerName(match.homePlayerId)}
                              </div>
                              <div className="text-center px-4" style={{ minWidth: 80 }}>
                                {match.status === "COMPLETED" ? (
                                  <span className="fc-match-score" style={{ fontSize: "1.3rem" }}>
                                    <span style={{ color: match.homeScore > match.awayScore ? "var(--fc-emerald)" : "var(--fc-red)" }}>
                                      {match.homeScore}
                                    </span>
                                    <span style={{ color: "var(--fc-text-muted)", margin: "0 6px" }}>-</span>
                                    <span style={{ color: match.awayScore > match.homeScore ? "var(--fc-emerald)" : "var(--fc-red)" }}>
                                      {match.awayScore}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="fc-match-vs">VS</span>
                                )}
                              </div>
                              <div className="flex-1 font-semibold">
                                {getPlayerName(match.awayPlayerId)}
                              </div>
                              <div className="flex gap-2">
                                {match.status === "COMPLETED" && (
                                  <button
                                    className="fc-btn fc-btn-outline"
                                    style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                                    onClick={(e) => { e.stopPropagation(); handleViewDetail(match); }}
                                  >
                                    👁️
                                  </button>
                                )}
                                <button
                                  className="fc-btn fc-btn-gold"
                                  style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                                  onClick={(e) => { e.stopPropagation(); handleOpenMatchModal(match); }}
                                >
                                  {match.status === "COMPLETED" ? "📝 Sửa" : "✏️ Nhập"}
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </section>
                  )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ======== PLAYER MODAL ======== */}
      {showPlayerModal && (
        <div
          className="fc-modal-overlay"
          onClick={() => setShowPlayerModal(false)}
        >
          <div className="fc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingPlayer ? "✏️ Chỉnh Sửa Game Thủ" : "➕ Thêm Game Thủ"}</h3>

            <div className="space-y-4">
              <div>
                <label className="fc-label">Tên *</label>
                <input
                  className="fc-input"
                  placeholder="Nhập tên game thủ..."
                  value={playerForm.name}
                  onChange={(e) =>
                    setPlayerForm({ ...playerForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="fc-label">In-game ID *</label>
                <input
                  className="fc-input"
                  placeholder="Nhập ID trong game..."
                  value={playerForm.inGameId}
                  onChange={(e) =>
                    setPlayerForm({ ...playerForm, inGameId: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="fc-label">Đội bóng yêu thích</label>
                <input
                  className="fc-input"
                  placeholder="VD: Real Madrid, Man City..."
                  value={playerForm.favoriteTeam}
                  onChange={(e) =>
                    setPlayerForm({ ...playerForm, favoriteTeam: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="fc-label">OVR / Chỉ số đội hình</label>
                <input
                  className="fc-input"
                  type="number"
                  min={0}
                  max={200}
                  value={playerForm.ovr}
                  onChange={(e) =>
                    setPlayerForm({
                      ...playerForm,
                      ovr: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="fc-label">Avatar URL</label>
                <input
                  className="fc-input"
                  placeholder="https://..."
                  value={playerForm.avatarUrl}
                  onChange={(e) =>
                    setPlayerForm({ ...playerForm, avatarUrl: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-center">
              <button className="fc-btn fc-btn-gold" onClick={handleSavePlayer}>
                💾 Lưu
              </button>
              <button
                className="fc-btn fc-btn-outline"
                onClick={() => setShowPlayerModal(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======== MATCH MODAL ======== */}
      {showMatchModal && selectedMatch && (
        <div
          className="fc-modal-overlay"
          onClick={() => setShowMatchModal(false)}
        >
          <div className="fc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              🎮 Nhập Kết Quả Trận Đấu ({selectedMatch?.phase === "GROUP" ? "Bo3 Vòng Loại" : "Bo5 Chung Kết"})
            </h3>
            <div
              className="text-center mb-4"
              style={{ color: "var(--fc-text-muted)", fontSize: "0.9rem" }}
            >
              <strong style={{ color: "var(--fc-emerald)" }}>
                {getPlayerName(selectedMatch.homePlayerId)}
              </strong>
              {" "}
              vs{" "}
              <strong style={{ color: "var(--fc-blue)" }}>
                {getPlayerName(selectedMatch.awayPlayerId)}
              </strong>
            </div>
            <p
              style={{
                textAlign: "center",
                fontSize: "0.8rem",
                color: "var(--fc-text-muted)",
                marginBottom: 16,
              }}
            >
              Thắng game = 3đ | Hòa game = 1đ | Thua game = 0đ
            </p>

            {/* Games List */}
            <div className="space-y-3 mb-4">
              {matchGames.map((game, index) => {
                // Tính tổng game wins hiện tại
                let homeWinsSoFar = 0;
                let awayWinsSoFar = 0;
                for (let i = 0; i <= index; i++) {
                  if (matchGames[i].winner === "home") homeWinsSoFar++;
                  if (matchGames[i].winner === "away") awayWinsSoFar++;
                }

                return (
                  <div
                    key={index}
                    style={{
                      background: "var(--fc-black)",
                      borderRadius: 10,
                      padding: "12px 16px",
                      border: "1px solid var(--fc-border)",
                    }}
                  >
                    <div
                      className="text-sm font-bold mb-2"
                      style={{ color: "var(--fc-gold)" }}
                    >
                      Game {index + 1}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="fc-label" style={{ fontSize: "0.7rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          ⚽ {getPlayerName(selectedMatch.homePlayerId)}
                        </label>
                        <input
                          className="fc-input text-center font-bold"
                          type="number"
                          min={0}
                          value={game.goalsHome ?? 0}
                          onChange={(e) =>
                            handleUpdateGame(index, "goalsHome", parseInt(e.target.value) || 0)
                          }
                          style={{ fontSize: "0.95rem", padding: "6px 8px" }}
                        />
                      </div>
                      <div
                        className="text-center px-1 font-bold"
                        style={{
                          color: game.winner === "draw" ? "var(--fc-text-muted)" : "var(--fc-gold)",
                          fontSize: "0.9rem", paddingTop: 20,
                        }}
                      >
                        {game.winner === "home" ? "◀" : game.winner === "away" ? "▶" : "-"}
                      </div>
                      <div className="flex-1">
                        <label className="fc-label" style={{ fontSize: "0.7rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          ⚽ {getPlayerName(selectedMatch.awayPlayerId)}
                        </label>
                        <input
                          className="fc-input text-center font-bold"
                          type="number"
                          min={0}
                          value={game.goalsAway ?? 0}
                          onChange={(e) =>
                            handleUpdateGame(index, "goalsAway", parseInt(e.target.value) || 0)
                          }
                          style={{ fontSize: "0.95rem", padding: "6px 8px" }}
                        />
                      </div>
                    </div>


                    <div
                      className="mt-2 text-xs"
                      style={{ color: "var(--fc-text-muted)" }}
                    >
                      Tổng: {homeWinsSoFar} - {awayWinsSoFar}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Game buttons */}
            <div className="flex gap-2 justify-center mb-4">
              <button
                className="fc-btn fc-btn-emerald"
                style={{ padding: "6px 16px", fontSize: "0.8rem" }}
                onClick={handleAddGame}
              >
                + Thêm Game
              </button>
              {matchGames.length > 1 && (
                <button
                  className="fc-btn fc-btn-red"
                  style={{ padding: "6px 16px", fontSize: "0.8rem" }}
                  onClick={handleRemoveLastGame}
                >
                  - Xóa Game Cuối
                </button>
            )}
            </div>

            {/* Summary */}
            {(() => {
              const isGroup = selectedMatch?.phase === "GROUP";
              const targetWins = isGroup ? 2 : 3;
              const maxGames = isGroup ? 3 : 5;

              let hw = 0,
                aw = 0,
                hp = 0,
                ap = 0;
              for (const g of matchGames) {
                if (g.winner === "home") {
                  hw++;
                  hp += 3;
                } else if (g.winner === "away") {
                  aw++;
                  ap += 3;
                } else {
                  hp += 1;
                  ap += 1;
                }
              }
              // Điều kiện kết thúc: chạm targetWins hoặc đấu đủ maxGames (cho phép hòa ở vòng loại)
              const isFinished = hw >= targetWins || aw >= targetWins || (isGroup && matchGames.length >= maxGames);

              return (
                <div
                  style={{
                    background: isFinished
                      ? "rgba(16,185,129,0.1)"
                      : "rgba(212,175,55,0.1)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    textAlign: "center",
                    border: `1px solid ${
                      isFinished ? "var(--fc-emerald)" : "var(--fc-gold)"
                    }`,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: "1.3rem" }}>
                    <span style={{ color: "var(--fc-emerald)" }}>{hw}</span>
                    <span
                      style={{
                        color: "var(--fc-text-muted)",
                        margin: "0 10px",
                      }}
                    >
                      -
                    </span>
                    <span style={{ color: "var(--fc-blue)" }}>{aw}</span>
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--fc-text-muted)" }}
                  >
                    Điểm: {hp} - {ap}
                    {isFinished && (
                      <span style={{ color: "var(--fc-emerald)", marginLeft: 8 }}>
                        {hw === aw ? "🤝 Trận đấu hòa (Chia điểm)!" : "✅ Trận đấu kết thúc!"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3 justify-center">
              <button className="fc-btn fc-btn-gold" onClick={handleSaveMatch}>
                💾 Lưu Kết Quả
              </button>
              <button
                className="fc-btn fc-btn-outline"
                onClick={() => setShowMatchModal(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ======== MATCH DETAIL MODAL (Read-Only) ======== */}
      {showDetailModal && detailMatch && (
        <div
          className="fc-modal-overlay"
          onClick={() => setShowDetailModal(false)}
        >
          <div className="fc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 Chi Tiết Trận Đấu</h3>
            <div
              className="text-center mb-4"
              style={{ color: "var(--fc-text-muted)", fontSize: "0.9rem" }}
            >
              <strong style={{ color: "var(--fc-emerald)" }}>
                {getPlayerName(detailMatch.homePlayerId)}
              </strong>
              {" "}vs{" "}
              <strong style={{ color: "var(--fc-blue)" }}>
                {getPlayerName(detailMatch.awayPlayerId)}
              </strong>
            </div>

            {/* Tổng kết trận */}
            <div
              style={{
                background: "rgba(16,185,129,0.1)",
                borderRadius: 10,
                padding: "12px 16px",
                textAlign: "center",
                border: "1px solid var(--fc-emerald)",
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: "1.5rem" }}>
                <span style={{ color: "var(--fc-emerald)" }}>{detailMatch.homeScore}</span>
                <span style={{ color: "var(--fc-text-muted)", margin: "0 12px" }}>-</span>
                <span style={{ color: "var(--fc-blue)" }}>{detailMatch.awayScore}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--fc-text-muted)" }}>
                Điểm: {detailMatch.homePoints} - {detailMatch.awayPoints}
                {detailMatch.winnerId && (
                  <span style={{ color: "var(--fc-gold)", marginLeft: 8 }}>
                    🏆 {getPlayerName(detailMatch.winnerId)}
                  </span>
                )}
              </div>
            </div>

            {/* Chi tiết từng game */}
            <div className="space-y-3 mb-4">
              {detailMatch.games.map((game, index) => (
                <div
                  key={index}
                  style={{
                    background: "var(--fc-black)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    border: "1px solid var(--fc-border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold" style={{ color: "var(--fc-gold)" }}>
                      Game {index + 1}
                    </span>
                    <span className={`fc-badge ${game.winner === "home" ? "fc-badge-completed" : game.winner === "away" ? "fc-badge-finals" : "fc-badge-pending"}`}>
                      {game.winner === "home"
                        ? getPlayerName(detailMatch.homePlayerId)
                        : game.winner === "away"
                        ? getPlayerName(detailMatch.awayPlayerId)
                        : "Hòa"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <div className="font-bold text-lg" style={{ color: "var(--fc-text)" }}>{game.goalsHome ?? 0}</div>
                    </div>
                    <div className="text-center px-4 font-bold" style={{ color: "var(--fc-text-muted)", fontSize: "0.9rem" }}>vs</div>
                    <div className="text-center flex-1">
                      <div className="font-bold text-lg" style={{ color: "var(--fc-text)" }}>{game.goalsAway ?? 0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tổng bàn thắng */}
            {(() => {
              let totalGH = 0, totalGA = 0;
              for (const g of detailMatch.games) {
                totalGH += g.goalsHome ?? 0;
                totalGA += g.goalsAway ?? 0;
              }
              return (
                <div style={{
                  background: "rgba(212,175,55,0.1)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  textAlign: "center",
                  border: "1px solid var(--fc-gold)",
                  marginBottom: 16,
                }}>
                  <div className="text-xs" style={{ color: "var(--fc-text-muted)", marginBottom: 4 }}>Tổng bàn thắng</div>
                  <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>
                    <span style={{ color: "var(--fc-emerald)" }}>⚽ {totalGH}</span>
                    <span style={{ color: "var(--fc-text-muted)", margin: "0 10px" }}>-</span>
                    <span style={{ color: "var(--fc-blue)" }}>⚽ {totalGA}</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3 justify-center">
              <button
                className="fc-btn fc-btn-emerald"
                onClick={() => {
                  setShowDetailModal(false);
                  handleOpenMatchModal(detailMatch);
                }}
              >
                📝 Sửa kết quả
              </button>
              <button
                className="fc-btn fc-btn-outline"
                onClick={() => setShowDetailModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// ============================================================
// API: /fc_mobile/api/players - CRUD Players
// ============================================================

import { NextRequest } from "next/server";
import { readTournamentData, writeTournamentData } from "../../lib/data-io";
import { Player } from "../../types";

// GET - Lấy danh sách người chơi
export async function GET() {
  const data = readTournamentData();
  return Response.json({ players: data.players });
}

// POST - Thêm người chơi mới
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, inGameId, favoriteTeam, ovr, avatarUrl } = body;

  if (!name || !inGameId) {
    return Response.json(
      { error: "Tên và In-game ID là bắt buộc." },
      { status: 400 }
    );
  }

  const data = readTournamentData();

  const newPlayer: Player = {
    id: `P-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    inGameId,
    favoriteTeam: favoriteTeam || "",
    ovr: ovr || 0,
    avatarUrl: avatarUrl || "",
    createdAt: new Date().toISOString(),
  };

  data.players.push(newPlayer);
  writeTournamentData(data);

  return Response.json({ player: newPlayer }, { status: 201 });
}

// PUT - Cập nhật thông tin người chơi
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, inGameId, favoriteTeam, ovr, avatarUrl } = body;

  if (!id) {
    return Response.json({ error: "ID là bắt buộc." }, { status: 400 });
  }

  const data = readTournamentData();
  const index = data.players.findIndex((p) => p.id === id);

  if (index === -1) {
    return Response.json(
      { error: "Không tìm thấy người chơi." },
      { status: 404 }
    );
  }

  data.players[index] = {
    ...data.players[index],
    name: name ?? data.players[index].name,
    inGameId: inGameId ?? data.players[index].inGameId,
    favoriteTeam: favoriteTeam ?? data.players[index].favoriteTeam,
    ovr: ovr ?? data.players[index].ovr,
    avatarUrl: avatarUrl ?? data.players[index].avatarUrl,
  };

  writeTournamentData(data);
  return Response.json({ player: data.players[index] });
}

// DELETE - Xóa người chơi
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "ID là bắt buộc." }, { status: 400 });
  }

  const data = readTournamentData();

  // Kiểm tra nếu giải đấu đang diễn ra và player đang tham gia
  if (
    data.config.status !== "NOT_STARTED" &&
    data.config.selectedPlayerIds.includes(id)
  ) {
    return Response.json(
      { error: "Không thể xóa người chơi đang tham gia giải đấu." },
      { status: 400 }
    );
  }

  data.players = data.players.filter((p) => p.id !== id);
  data.config.selectedPlayerIds = data.config.selectedPlayerIds.filter(
    (pid) => pid !== id
  );

  writeTournamentData(data);
  return Response.json({ success: true });
}
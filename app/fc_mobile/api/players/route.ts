// ============================================================
// API: /fc_mobile/api/players - CRUD Players
// ============================================================

import { NextRequest } from "next/server";
import { readTournamentData, writeTournamentData } from "../../lib/data-io";
import { Player } from "../../types";

// GET - Lß║Ñy danh s├ích ng╞░ß╗¥i ch╞íi
export async function GET() {
  const data = await readTournamentData();
  return Response.json({ players: data.players });
}

// POST - Th├¬m ng╞░ß╗¥i ch╞íi mß╗¢i
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, inGameId, favoriteTeam, ovr, avatarUrl } = body;

    if (!name || !inGameId) {
      return Response.json(
        { error: "T├¬n v├á In-game ID l├á bß║»t buß╗Öc." },
        { status: 400 }
      );
    }

  const data = await readTournamentData();

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
    await writeTournamentData(data);

  return Response.json({ player: newPlayer }, { status: 201 });
  } catch (err: any) {
    console.error("[API Players POST Error]:", err);
    return Response.json(
      { error: err.message || "Lß╗ùi Server nß╗Öi bß╗Ö", details: err.toString() },
      { status: 500 }
    );
  }
}

// PUT - Cß║¡p nhß║¡t th├┤ng tin ng╞░ß╗¥i ch╞íi
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, inGameId, favoriteTeam, ovr, avatarUrl } = body;

  if (!id) {
    return Response.json({ error: "ID l├á bß║»t buß╗Öc." }, { status: 400 });
  }

  const data = await readTournamentData();
  const index = data.players.findIndex((p) => p.id === id);

  if (index === -1) {
    return Response.json(
      { error: "Kh├┤ng t├¼m thß║Ñy ng╞░ß╗¥i ch╞íi." },
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

  await writeTournamentData(data);
  return Response.json({ player: data.players[index] });
}

// DELETE - X├│a ng╞░ß╗¥i ch╞íi
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "ID l├á bß║»t buß╗Öc." }, { status: 400 });
  }

  const data = await readTournamentData();

  // Kiß╗âm tra nß║┐u giß║úi ─æß║Ñu ─æang diß╗àn ra v├á player ─æang tham gia
  if (
    data.config.status !== "NOT_STARTED" &&
    data.config.selectedPlayerIds.includes(id)
  ) {
    return Response.json(
      { error: "Kh├┤ng thß╗â x├│a ng╞░ß╗¥i ch╞íi ─æang tham gia giß║úi ─æß║Ñu." },
      { status: 400 }
    );
  }

  data.players = data.players.filter((p) => p.id !== id);
  data.config.selectedPlayerIds = data.config.selectedPlayerIds.filter(
    (pid) => pid !== id
  );

  await writeTournamentData(data);
  return Response.json({ success: true });
}

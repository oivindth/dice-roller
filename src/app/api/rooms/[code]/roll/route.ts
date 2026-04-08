import { cookies } from "next/headers";
import { db } from "@/db";
import { rooms, players, rolls } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { rollDice, resolveRoundIfComplete } from "@/lib/game-logic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const cookieStore = await cookies();
  const playerId = cookieStore.get("playerId")?.value;

  if (!playerId) {
    return Response.json({ error: "Player not identified" }, { status: 401 });
  }

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.shareCode, code),
  });

  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.status !== "rolling") {
    return Response.json(
      { error: "Game is not in rolling phase" },
      { status: 400 }
    );
  }

  const player = await db.query.players.findFirst({
    where: and(eq(players.id, playerId), eq(players.roomId, room.id)),
  });

  if (!player) {
    return Response.json(
      { error: "Player not found in this room" },
      { status: 404 }
    );
  }

  if (player.isEliminated) {
    return Response.json(
      { error: "Player has been eliminated" },
      { status: 400 }
    );
  }

  const existingRoll = await db.query.rolls.findFirst({
    where: and(
      eq(rolls.playerId, playerId),
      eq(rolls.roomId, room.id),
      eq(rolls.round, room.currentRound)
    ),
  });

  if (existingRoll) {
    return Response.json(
      { error: "Player has already rolled this round" },
      { status: 400 }
    );
  }

  const value = rollDice();

  await db.insert(rolls).values({
    id: generateId(),
    playerId,
    roomId: room.id,
    round: room.currentRound,
    value,
  });

  await resolveRoundIfComplete(room.id);

  return Response.json({ value, round: room.currentRound });
}

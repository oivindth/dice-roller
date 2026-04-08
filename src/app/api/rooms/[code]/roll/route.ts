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

  const value = rollDice();

  // Wrap everything in a transaction to prevent race conditions
  const result = await db.transaction(async (tx) => {
    const room = await tx.query.rooms.findFirst({
      where: eq(rooms.shareCode, code),
    });

    if (!room) {
      return { error: "Room not found", status: 404 };
    }

    if (room.status !== "rolling") {
      return { error: "Game is not in rolling phase", status: 400 };
    }

    const player = await tx.query.players.findFirst({
      where: and(eq(players.id, playerId), eq(players.roomId, room.id)),
    });

    if (!player) {
      return { error: "Player not found in this room", status: 404 };
    }

    if (player.isEliminated) {
      return { error: "Player has been eliminated", status: 400 };
    }

    const existingRoll = await tx.query.rolls.findFirst({
      where: and(
        eq(rolls.playerId, playerId),
        eq(rolls.roomId, room.id),
        eq(rolls.round, room.currentRound)
      ),
    });

    if (existingRoll) {
      return { error: "Player has already rolled this round", status: 400 };
    }

    await tx.insert(rolls).values({
      id: generateId(),
      playerId,
      roomId: room.id,
      round: room.currentRound,
      value,
    });

    await resolveRoundIfComplete(tx, room.id);

    return { value, round: room.currentRound };
  });

  if ("error" in result) {
    return Response.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return Response.json(result);
}

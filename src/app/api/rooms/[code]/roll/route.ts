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

  try {
    const result = db.transaction((tx) => {
      const [room] = tx.select().from(rooms).where(eq(rooms.shareCode, code)).all();

      if (!room) {
        return { error: "Room not found", status: 404 } as const;
      }

      if (room.status !== "rolling") {
        return { error: "Game is not in rolling phase", status: 400 } as const;
      }

      const [player] = tx.select().from(players).where(
        and(eq(players.id, playerId), eq(players.roomId, room.id))
      ).all();

      if (!player) {
        return { error: "Player not found in this room", status: 404 } as const;
      }

      if (player.isEliminated) {
        return { error: "Player has been eliminated", status: 400 } as const;
      }

      const [existingRoll] = tx.select().from(rolls).where(
        and(
          eq(rolls.playerId, playerId),
          eq(rolls.roomId, room.id),
          eq(rolls.round, room.currentRound)
        )
      ).all();

      if (existingRoll) {
        return { error: "Player has already rolled this round", status: 400 } as const;
      }

      tx.insert(rolls).values({
        id: generateId(),
        playerId,
        roomId: room.id,
        round: room.currentRound,
        value,
      }).run();

      resolveRoundIfComplete(tx, room.id);

      return { value, round: room.currentRound } as const;
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result);
  } catch (e) {
    console.error("Roll error:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

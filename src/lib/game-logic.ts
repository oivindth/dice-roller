import { db } from "@/db";
import { rooms, players, rolls } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * After every roll, check if the round is complete and resolve it.
 */
export async function resolveRoundIfComplete(roomId: string) {
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });
  if (!room || room.status !== "rolling") return;

  const activePlayers = await db.query.players.findMany({
    where: and(eq(players.roomId, roomId), eq(players.isEliminated, false)),
  });

  const currentRoundRolls = await db.query.rolls.findMany({
    where: and(eq(rolls.roomId, roomId), eq(rolls.round, room.currentRound)),
  });

  // Not everyone has rolled yet
  if (currentRoundRolls.length < activePlayers.length) return;

  const maxValue = Math.max(...currentRoundRolls.map((r) => r.value));
  const winners = currentRoundRolls.filter((r) => r.value === maxValue);
  const losers = currentRoundRolls.filter((r) => r.value < maxValue);

  // Eliminate losers
  for (const loser of losers) {
    await db
      .update(players)
      .set({ isEliminated: true })
      .where(eq(players.id, loser.playerId));
  }

  if (winners.length === 1) {
    await db
      .update(rooms)
      .set({ status: "complete" })
      .where(eq(rooms.id, roomId));
  } else {
    await db
      .update(rooms)
      .set({ currentRound: room.currentRound + 1 })
      .where(eq(rooms.id, roomId));
  }
}

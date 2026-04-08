import { db } from "@/db";
import { rooms, players, rolls } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "@/db/schema";

type Tx = BetterSQLite3Database<typeof schema>;

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * After every roll, check if the round is complete and resolve it.
 * Must be called within the same transaction as the roll insert.
 */
export async function resolveRoundIfComplete(tx: Tx, roomId: string) {
  const room = await tx.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });
  if (!room || room.status !== "rolling") return;

  const activePlayers = await tx.query.players.findMany({
    where: and(eq(players.roomId, roomId), eq(players.isEliminated, false)),
  });

  const currentRoundRolls = await tx.query.rolls.findMany({
    where: and(eq(rolls.roomId, roomId), eq(rolls.round, room.currentRound)),
  });

  // Not everyone has rolled yet
  if (currentRoundRolls.length < activePlayers.length) return;

  const maxValue = Math.max(...currentRoundRolls.map((r) => r.value));
  const winners = currentRoundRolls.filter((r) => r.value === maxValue);
  const losers = currentRoundRolls.filter((r) => r.value < maxValue);

  // Eliminate losers
  for (const loser of losers) {
    await tx
      .update(players)
      .set({ isEliminated: true })
      .where(eq(players.id, loser.playerId));
  }

  if (winners.length === 1) {
    // We have a winner!
    await tx
      .update(rooms)
      .set({ status: "complete" })
      .where(eq(rooms.id, roomId));
  } else {
    // Tie — advance to next round for tied players
    await tx
      .update(rooms)
      .set({ currentRound: room.currentRound + 1 })
      .where(eq(rooms.id, roomId));
  }
}

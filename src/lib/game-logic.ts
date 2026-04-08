import { rooms, players, rolls } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any;

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * After every roll, check if the round is complete and resolve it.
 * Must be called within the same synchronous transaction as the roll insert.
 */
export function resolveRoundIfComplete(tx: Tx, roomId: string) {
  const [room] = tx.select().from(rooms).where(eq(rooms.id, roomId)).all();
  if (!room || room.status !== "rolling") return;

  const activePlayers = tx.select().from(players).where(
    and(eq(players.roomId, roomId), eq(players.isEliminated, false))
  ).all();

  const currentRoundRolls = tx.select().from(rolls).where(
    and(eq(rolls.roomId, roomId), eq(rolls.round, room.currentRound))
  ).all();

  // Not everyone has rolled yet
  if (currentRoundRolls.length < activePlayers.length) return;

  const maxValue = Math.max(...currentRoundRolls.map((r: { value: number }) => r.value));
  const losers = currentRoundRolls.filter((r: { value: number }) => r.value < maxValue);
  const winners = currentRoundRolls.filter((r: { value: number }) => r.value === maxValue);

  for (const loser of losers) {
    tx.update(players)
      .set({ isEliminated: true })
      .where(eq(players.id, loser.playerId))
      .run();
  }

  if (winners.length === 1) {
    tx.update(rooms)
      .set({ status: "complete" })
      .where(eq(rooms.id, roomId))
      .run();
  } else {
    tx.update(rooms)
      .set({ currentRound: room.currentRound + 1 })
      .where(eq(rooms.id, roomId))
      .run();
  }
}

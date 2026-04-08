import { cookies } from "next/headers";
import { db } from "@/db";
import { rooms, players, rolls } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.shareCode, code),
  });

  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  const roomPlayers = await db.query.players.findMany({
    where: eq(players.roomId, room.id),
  });

  const roomRolls = await db.query.rolls.findMany({
    where: eq(rolls.roomId, room.id),
  });

  const cookieStore = await cookies();
  const currentPlayerId = cookieStore.get("playerId")?.value ?? null;

  return Response.json({
    room,
    players: roomPlayers,
    rolls: roomRolls,
    currentPlayerId,
  });
}

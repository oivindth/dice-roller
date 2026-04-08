import { cookies } from "next/headers";
import { db } from "@/db";
import { rooms, players } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
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

  const cookieStore = await cookies();
  const playerId = cookieStore.get("playerId")?.value;

  if (playerId !== room.creatorPlayerId) {
    return Response.json(
      { error: "Only the room creator can start the game" },
      { status: 403 }
    );
  }

  if (room.status !== "waiting") {
    return Response.json(
      { error: "Game has already started" },
      { status: 400 }
    );
  }

  const roomPlayers = await db.query.players.findMany({
    where: eq(players.roomId, room.id),
  });

  if (roomPlayers.length < 2) {
    return Response.json(
      { error: "At least 2 players are required to start" },
      { status: 400 }
    );
  }

  await db
    .update(rooms)
    .set({ status: "rolling" })
    .where(eq(rooms.id, room.id));

  return Response.json({ success: true });
}

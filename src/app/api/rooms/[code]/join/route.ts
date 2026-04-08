import { cookies } from "next/headers";
import { db } from "@/db";
import { rooms, players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const name = body.name || "Player";

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.shareCode, code),
  });

  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.status !== "waiting") {
    return Response.json(
      { error: "Room is not accepting new players" },
      { status: 400 }
    );
  }

  const playerId = generateId();

  await db.insert(players).values({
    id: playerId,
    roomId: room.id,
    name,
  });

  const cookieStore = await cookies();
  cookieStore.set("playerId", playerId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return Response.json({ playerId, name });
}

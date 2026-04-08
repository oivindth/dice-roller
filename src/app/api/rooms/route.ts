import { cookies } from "next/headers";
import { db } from "@/db";
import { rooms, players } from "@/db/schema";
import { generateId, generateShareCode } from "@/lib/utils";

export async function POST(request: Request) {
  const body = await request.json();
  const roomName = body.name || "My Room";
  const playerName = body.playerName || "Host";

  const roomId = generateId();
  const shareCode = generateShareCode();
  const playerId = generateId();

  await db.insert(rooms).values({
    id: roomId,
    name: roomName,
    shareCode,
    creatorPlayerId: playerId,
  });

  await db.insert(players).values({
    id: playerId,
    roomId,
    name: playerName,
  });

  const cookieStore = await cookies();
  cookieStore.set("playerId", playerId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return Response.json({ shareCode, roomId });
}

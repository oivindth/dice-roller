import { cookies } from "next/headers";
import { db } from "@/db";
import { rooms, players } from "@/db/schema";
import { generateId, generateShareCode } from "@/lib/utils";

export async function POST(request: Request) {
  const body = await request.json();
  const roomName = body.name || "My Room";
  const playerName = body.playerName || "Host";
  const hostPlays = body.hostPlays !== false;
  const diceMax = [6, 20, 100].includes(body.diceMax) ? body.diceMax : 6;

  const roomId = generateId();
  const shareCode = generateShareCode();
  const creatorId = generateId();

  await db.insert(rooms).values({
    id: roomId,
    name: roomName,
    shareCode,
    diceMax,
    creatorPlayerId: creatorId,
  });

  if (hostPlays) {
    await db.insert(players).values({
      id: creatorId,
      roomId,
      name: playerName,
    });
  }

  const cookieStore = await cookies();
  cookieStore.set("playerId", creatorId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({ shareCode, roomId });
}

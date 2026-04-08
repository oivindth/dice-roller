"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!roomName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName.trim(), playerName: playerName.trim() || "Host" }),
      });

      if (!res.ok) {
        throw new Error("Failed to create room");
      }

      const data = await res.json();
      router.push(`/room/${data.shareCode}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-7xl mb-4" aria-hidden>
            🎲
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white mb-3">
            Dice Roller
          </h1>
          <p className="text-gray-400 text-lg">
            Roll dice with friends. Ties re-roll. Last one standing wins.
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="roomName"
                className="text-sm font-semibold text-gray-300 uppercase tracking-wide"
              >
                Room Name
              </label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Friday Game Night"
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                required
                maxLength={60}
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="playerName"
                className="text-sm font-semibold text-gray-300 uppercase tracking-wide"
              >
                Your Name
              </label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. John"
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                maxLength={40}
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !roomName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg px-6 py-3 transition-colors duration-150 mt-2"
            >
              {loading ? "Creating room..." : "Create Room"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          Share the link with friends after creating a room.
        </p>
      </div>
    </main>
  );
}

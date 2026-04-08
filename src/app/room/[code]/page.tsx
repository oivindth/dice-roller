"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import ShareLink from "@/components/ShareLink";
import DiceDisplay from "@/components/DiceDisplay";

interface Room {
  id: string;
  name: string;
  shareCode: string;
  status: "waiting" | "rolling" | "complete";
  currentRound: number;
  creatorPlayerId: string | null;
  createdAt: number;
}

interface Player {
  id: string;
  roomId: string;
  name: string;
  isEliminated: boolean;
  joinedAt: number;
}

interface Roll {
  id: string;
  playerId: string;
  roomId: string;
  round: number;
  value: number;
  rolledAt: number;
}

interface RoomState {
  room: Room;
  players: Player[];
  rolls: Roll[];
  currentPlayerId: string | null;
}

export default function RoomPage() {
  const params = useParams();
  const code = params.code as string;

  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [rolledValue, setRolledValue] = useState<number | null>(null);
  const [showRollAnim, setShowRollAnim] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [rollError, setRollError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRoundRef = useRef<number | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Room not found.");
        } else {
          setError("Failed to load room.");
        }
        return;
      }
      const data: RoomState = await res.json();
      setState(data);
      setError(null);
    } catch {
      setError("Network error. Retrying...");
    }
  }, [code]);

  useEffect(() => {
    fetchState();
    intervalRef.current = setInterval(fetchState, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchState]);

  // Reset roll state when the round advances (tiebreaker)
  useEffect(() => {
    if (state && state.room.currentRound !== prevRoundRef.current) {
      if (prevRoundRef.current !== null) {
        setRolledValue(null);
        setShowRollAnim(false);
      }
      prevRoundRef.current = state.room.currentRound;
    }
  }, [state]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${code}`
      : `/room/${code}`;

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinName.trim()) return;
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: joinName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setJoinError(data.error || "Failed to join.");
      } else {
        await fetchState();
      }
    } catch {
      setJoinError("Network error.");
    } finally {
      setJoining(false);
    }
  }

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/start`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setStartError(data.error || "Failed to start.");
      } else {
        await fetchState();
      }
    } catch {
      setStartError("Network error.");
    } finally {
      setStarting(false);
    }
  }

  async function handleRoll() {
    setRolling(true);
    setShowRollAnim(true);
    setRolledValue(null);
    setRollError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/roll`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRollError(data.error || "Failed to roll.");
        setShowRollAnim(false);
      } else {
        const data = await res.json();
        // Let the spinning play briefly before showing the result
        setTimeout(() => {
          setShowRollAnim(false);
          setRolledValue(data.value);
          setRolling(false);
          fetchState();
        }, 1200);
        return;
      }
    } catch {
      setRollError("Network error.");
      setShowRollAnim(false);
    }
    setRolling(false);
  }

  if (error && !state) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center min-h-screen px-4">
        <div className="bg-gray-800 rounded-xl p-8 text-center max-w-sm w-full shadow">
          <p className="text-red-400 font-semibold text-lg">{error}</p>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center min-h-screen px-4">
        <div className="text-gray-400 text-lg animate-pulse">Loading room...</div>
      </main>
    );
  }

  const { room, players, rolls, currentPlayerId } = state;

  const currentPlayer = players.find((p) => p.id === currentPlayerId) ?? null;
  const isCreator = currentPlayerId === room.creatorPlayerId;
  const isInRoom = currentPlayer !== null;

  return (
    <main className="flex flex-1 flex-col items-start justify-start min-h-screen px-4 py-10">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">
              Room
            </p>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {room.name}
            </h1>
          </div>
          <button
            onClick={() => fetchState()}
            className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg p-2 transition-colors"
            title="Refresh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
        </div>

        {/* Waiting Status */}
        {room.status === "waiting" && (
          <>
            <div className="bg-gray-800 rounded-xl p-6 shadow flex flex-col gap-4">
              {isCreator && (
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Invite Friends
                  </h2>
                  <ShareLink url={shareUrl} />
                </div>
              )}

              {!isInRoom && !isCreator && (
                <form onSubmit={handleJoin} className="flex flex-col gap-3 border-t border-gray-700 pt-4">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                    Join this Room
                  </h2>
                  <input
                    type="text"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="Your name"
                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    required
                    maxLength={40}
                    disabled={joining}
                  />
                  {joinError && (
                    <p className="text-red-400 text-sm font-medium">{joinError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={joining || !joinName.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg px-6 py-3 transition-colors duration-150"
                  >
                    {joining ? "Joining..." : "Join Room"}
                  </button>
                </form>
              )}
            </div>

            <div className="bg-gray-800 rounded-xl p-6 shadow flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                  Players ({players.length})
                </h2>
                {players.length < 2 && (
                  <span className="text-xs text-amber-400 font-medium">
                    Need at least 2 players
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-2">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 bg-gray-700 rounded-lg px-4 py-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                    <span className="text-white font-medium">{p.name}</span>
                    {p.id === room.creatorPlayerId && (
                      <span className="ml-auto text-xs text-indigo-400 font-semibold uppercase tracking-wide">
                        Host
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {isCreator && (
                <div className="border-t border-gray-700 pt-4 flex flex-col gap-2">
                  {startError && (
                    <p className="text-red-400 text-sm font-medium">{startError}</p>
                  )}
                  <button
                    onClick={handleStart}
                    disabled={starting || players.length < 2}
                    className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg px-6 py-3 transition-colors duration-150 w-full"
                  >
                    {starting ? "Starting..." : "Start Rolling"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Rolling Status */}
        {room.status === "rolling" && (
          <>
            <div className="bg-indigo-900/40 border border-indigo-700/50 rounded-xl px-6 py-4">
              <p className="text-indigo-300 font-bold text-lg">
                Round {room.currentRound}
              </p>
            </div>

            {currentPlayer && !currentPlayer.isEliminated && (
              <div className="bg-gray-800 rounded-xl p-6 shadow flex flex-col items-center gap-6">
                {(() => {
                  const myRoll = rolls.find(
                    (r) => r.playerId === currentPlayerId && r.round === room.currentRound
                  );
                  const hasRolled = !!myRoll;
                  const displayValue = hasRolled ? myRoll.value : rolledValue;
                  const isAnimating = showRollAnim;

                  return (
                    <>
                      <DiceDisplay
                        value={displayValue ?? undefined}
                        rolling={isAnimating}
                      />
                      {!hasRolled && !rolledValue && (
                        <>
                          <button
                            onClick={handleRoll}
                            disabled={rolling}
                            className="bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-2xl font-black rounded-xl px-12 py-6 transition-colors duration-150 shadow-lg"
                          >
                            {rolling ? "Rolling..." : "Roll Dice"}
                          </button>
                          {rollError && (
                            <p className="text-red-400 text-sm font-medium">{rollError}</p>
                          )}
                        </>
                      )}
                      {hasRolled && (
                        <p className="text-gray-400 text-sm font-medium">
                          You rolled a{" "}
                          <span className="text-white font-bold">{myRoll.value}</span>{" "}
                          — waiting for others...
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {currentPlayer?.isEliminated && (
              <div className="bg-gray-800 rounded-xl p-6 shadow text-center">
                <p className="text-gray-500 font-semibold text-lg">
                  You were eliminated. Watching the game...
                </p>
              </div>
            )}

            {!isInRoom && (
              <div className="bg-gray-800 rounded-xl p-6 shadow text-center">
                <p className="text-gray-500 font-semibold">
                  Game in progress. You&apos;re spectating.
                </p>
              </div>
            )}

            <div className="bg-gray-800 rounded-xl p-6 shadow flex flex-col gap-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Round {room.currentRound} Results
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-700">
                    <th className="pb-2 font-semibold">Player</th>
                    <th className="pb-2 font-semibold text-right">Roll</th>
                  </tr>
                </thead>
                <tbody>
                  {players
                    .filter((p) => !p.isEliminated)
                    .map((p) => {
                      const roll = rolls.find(
                        (r) => r.playerId === p.id && r.round === room.currentRound
                      );
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-gray-700/50"
                        >
                          <td className="py-3 font-medium text-white">
                            {p.name}
                            {p.id === currentPlayerId && (
                              <span className="ml-2 text-xs text-indigo-400 font-semibold">
                                (you)
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {roll ? (
                              <span className="text-white font-bold text-lg">{roll.value}</span>
                            ) : (
                              <span className="text-gray-500 italic">Rolling...</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Complete Status */}
        {room.status === "complete" && (
          <>
            <div className="bg-gray-800 rounded-xl p-8 shadow text-center flex flex-col items-center gap-4">
              <div className="text-5xl" aria-hidden>
                🏆
              </div>
              <h2 className="text-3xl font-black text-white">Game Over!</h2>
              {(() => {
                const winner = players.find((p) => !p.isEliminated);
                return winner ? (
                  <p className="text-xl text-indigo-300 font-bold">
                    {winner.name} wins!
                    {winner.id === currentPlayerId && (
                      <span className="ml-2 text-green-400">That&apos;s you!</span>
                    )}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Full results table */}
            <div className="bg-gray-800 rounded-xl p-6 shadow flex flex-col gap-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Full Results
              </h2>
              {(() => {
                const maxRound = Math.max(...rolls.map((r) => r.round), 1);
                const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[360px]">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-700">
                          <th className="pb-2 font-semibold pr-4">Player</th>
                          {rounds.map((r) => (
                            <th key={r} className="pb-2 font-semibold text-center px-2">
                              R{r}
                            </th>
                          ))}
                          <th className="pb-2 font-semibold text-center px-2">
                            Result
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((p) => {
                          const winner = !p.isEliminated;
                          return (
                            <tr
                              key={p.id}
                              className={`border-b border-gray-700/50 ${p.isEliminated ? "opacity-50" : ""}`}
                            >
                              <td className="py-3 pr-4 font-medium text-white whitespace-nowrap">
                                {winner && <span className="mr-1.5" aria-hidden>🏆</span>}
                                {p.name}
                                {p.id === currentPlayerId && (
                                  <span className="ml-2 text-xs text-indigo-400 font-semibold">
                                    (you)
                                  </span>
                                )}
                              </td>
                              {rounds.map((r) => {
                                const roll = rolls.find(
                                  (ro) => ro.playerId === p.id && ro.round === r
                                );
                                // Find highest value in this round
                                const roundRolls = rolls.filter((ro) => ro.round === r);
                                const maxVal = roundRolls.length
                                  ? Math.max(...roundRolls.map((ro) => ro.value))
                                  : null;
                                const isWinningRoll =
                                  roll && maxVal !== null && roll.value === maxVal;
                                return (
                                  <td
                                    key={r}
                                    className={`py-3 text-center px-2 font-bold ${
                                      isWinningRoll
                                        ? "text-green-400"
                                        : roll
                                        ? "text-gray-300"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {roll ? roll.value : "—"}
                                  </td>
                                );
                              })}
                              <td className="py-3 text-center px-2">
                                {winner ? (
                                  <span className="text-green-400 font-bold text-xs uppercase tracking-wide">
                                    Winner
                                  </span>
                                ) : (
                                  <span className="text-red-500 font-bold text-xs uppercase tracking-wide">
                                    Eliminated
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

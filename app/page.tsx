"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createRoom, joinRoom, rememberPlayer, getRememberedPlayer, getRoom, getStoredName, setStoredName } from "@/shared/api";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/shared/types";

import DecoCards from "@/components/DecoCards";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [nameReady, setNameReady] = useState(false);
  const router = useRouter();

  // Load stored name on mount
  useEffect(() => {
    const stored = getStoredName();
    if (stored) {
      setPlayerName(stored);
      setNameReady(true);
    }
  }, []);

  function saveName() {
    const trimmed = playerName.trim();
    if (!trimmed) return;
    setStoredName(trimmed);
    setPlayerName(trimmed);
    setNameReady(true);
  }

  async function startGame(noOfPlayers: number) {
    const name = playerName.trim();
    if (!name) return;
    const res = await createRoom({ name, noOfPlayers, isAdmin: true });
    if (!res.room_id) {
      alert("Could not create the room. Try again.");
      return;
    }
    await joinRoom({ room_id: res.room_id, player_name: name });
    rememberPlayer(res.room_id, { name, admin: true });
    router.push(`/Room?id=${encodeURIComponent(res.room_id)}`);
  }

  async function enterRoom() {
    const code = roomCode.trim();
    if (!code) return;

    const remembered = getRememberedPlayer(code);
    if (remembered) {
      try {
        const room = await getRoom(code);
        const alreadyIn = room.players.some((p: any) => p.name === remembered.name);
        if (alreadyIn) {
          if (room.phase === "lobby") {
            router.push(`/Room?id=${encodeURIComponent(code)}`);
          } else {
            router.push(`/Game?id=${encodeURIComponent(code)}`);
          }
          return;
        }
      } catch {
        // Room doesn't exist, fall through
      }
    }

    // Use the stored name — no more window.prompt
    const name = playerName.trim();
    if (!name) return;
    try {
      await joinRoom({ room_id: code, player_name: name });
      rememberPlayer(code, { name, admin: false });
      router.push(`/Room?id=${encodeURIComponent(code)}`);
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("already in this room") || msg.includes("already taken") || msg.includes("name")) {
        const newName = window.prompt(`The name "${name}" is already taken in Room ${code}.\nPlease enter a different name:`);
        if (newName?.trim()) {
          const cleanNew = newName.trim();
          setStoredName(cleanNew);
          setPlayerName(cleanNew);
          try {
            await joinRoom({ room_id: code, player_name: cleanNew });
            rememberPlayer(code, { name: cleanNew, admin: false });
            router.push(`/Room?id=${encodeURIComponent(code)}`);
            return;
          } catch (retryErr: any) {
            alert(retryErr.message || "Failed to join room.");
          }
        }
        return;
      }
      alert(err.message || `Room ${code} has been closed`);
    }
  }

  return (
    <main className="relative flex min-h-full w-full items-center justify-center px-4 py-6 sm:py-10 my-auto">
      <DecoCards />

      {/* Main card */}
      <div
        className="relative z-10 w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900/90 p-5 sm:p-8 my-auto shadow-[0_8px_60px_rgba(0,0,0,0.5)] animate-card-deal"
        style={{ backdropFilter: "blur(20px)" }}
      >
        {/* Brand header */}
        <div className="mb-4 sm:mb-8 text-center">
          <div className="mx-auto mb-2 sm:mb-4 flex h-14 sm:h-20 w-20 sm:w-28 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/80 shadow-lg">
            <div className="text-xl sm:text-3xl leading-none flex items-center gap-1.5">
              <span className="text-slate-300">♠</span>
              <span className="text-slate-400">♣</span>
              <span className="text-red-500">♥</span>
              <span className="text-red-400">♦</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-widest text-white uppercase">
            CABO
          </h1>
          <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-slate-500 tracking-wide">
            Memory, tactics & rapid card swaps
          </p>
        </div>

        {/* Step 1: Name input (only if no name stored) */}
        {!nameReady ? (
          <div className="space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              What's your name?
            </label>
            <input
              autoFocus
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
              placeholder="Enter your name"
              className="w-full rounded-2xl border border-slate-700/70 bg-slate-950/80 px-4 py-3.5 text-center text-sm text-white placeholder:text-slate-600 placeholder:text-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              onClick={saveName}
              disabled={!playerName.trim()}
              className="w-full rounded-2xl bg-emerald-600 px-5 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 transition-all hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        ) : (
          /* Step 2: Create / Join (name already set) */
          <div className="space-y-4">
            {/* Welcome badge */}
            <div className="text-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Playing as
              </span>
              <p className="text-sm font-bold text-white mt-0.5">{playerName}</p>
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="w-full rounded-2xl bg-emerald-600 px-5 py-3.5 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 transition-all hover:bg-emerald-500 hover:shadow-emerald-800/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              Create a Room
            </button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-slate-800" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-600">
                or join room
              </span>
              <span className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={roomCode}
                onChange={(e) =>
                  setRoomCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && roomCode.length === 6) enterRoom();
                }}
                placeholder="Enter 6-digit room code"
                className="w-full rounded-2xl border border-slate-700/70 bg-slate-950/80 px-4 py-3.5 text-center font-mono text-base tracking-widest text-emerald-400 placeholder:text-slate-600 placeholder:font-sans placeholder:text-xs placeholder:tracking-normal outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />

              <button
                onClick={enterRoom}
                disabled={roomCode.length !== 6}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 transition-all hover:bg-slate-700 hover:text-white hover:border-slate-600 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-slate-800 disabled:hover:border-slate-700"
              >
                Join Room
              </button>
            </div>
          </div>
        )}

        {/* Subtle bottom accent */}
        <div className="mt-6 flex justify-center gap-3 text-[10px] text-slate-700 tracking-wider">
          <span>♠</span><span>♣</span><span>♥</span><span>♦</span>
        </div>
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onStart={startGame}
        />
      )}
    </main>
  );
}

function CreateRoomModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (noOfPlayers: number) => Promise<void>;
}) {
  const [noOfPlayers, setNoOfPlayers] = useState(MIN_PLAYERS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      await onStart(noOfPlayers);
    } catch {
      setError("Could not create the room. Try again.");
      setSubmitting(false);
    }
  }

  const sizes = Array.from(
    { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
    (_, i) => MIN_PLAYERS + i,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-slate-700/60 bg-slate-900 p-6 sm:p-8 shadow-[0_8px_60px_rgba(0,0,0,0.6)] animate-card-deal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-black tracking-wide text-white">Create New Room</h2>
          <span className="rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800/50">
            Admin
          </span>
        </div>

        <label className="mt-5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Total Players ({MIN_PLAYERS}–{MAX_PLAYERS})
        </label>
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:gap-2">
          {sizes.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNoOfPlayers(n)}
              className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                noOfPlayers === n
                  ? "border-emerald-500 bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-xs font-semibold text-rose-400 bg-rose-950/50 p-2.5 rounded-xl border border-rose-900/50">{error}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-800 py-3 text-xs font-bold text-slate-400 transition hover:bg-slate-700 hover:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex-1 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Starting…" : "Start Game"}
          </button>
        </div>
      </div>
    </div>
  );
}

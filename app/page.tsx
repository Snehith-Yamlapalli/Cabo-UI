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
    const trimmed = playerName.trim().slice(0, 30);
    if (!trimmed) return;
    setStoredName(trimmed);
    setPlayerName(trimmed);
    setNameReady(true);
  }

  async function startGame(noOfPlayers: number) {
    const name = playerName.trim().slice(0, 30);
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
      const room = await getRoom(code);
      if (room && room.phase !== "lobby") {
        router.push(`/Game?id=${encodeURIComponent(code)}`);
      } else {
        router.push(`/Room?id=${encodeURIComponent(code)}`);
      }
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("full")) {
        alert(`Room ${code} is full!`);
        return;
      }
      if (msg.includes("already in this room") || msg.includes("already taken") || msg.includes("name")) {
        const newName = window.prompt(`The name "${name}" is already taken in Room ${code}.\nPlease enter a different name:`);
        if (newName?.trim()) {
          const cleanNew = newName.trim();
          setStoredName(cleanNew);
          setPlayerName(cleanNew);
          try {
            await joinRoom({ room_id: code, player_name: cleanNew });
            rememberPlayer(code, { name: cleanNew, admin: false });
            const room = await getRoom(code);
            if (room && room.phase !== "lobby") {
              router.push(`/Game?id=${encodeURIComponent(code)}`);
            } else {
              router.push(`/Room?id=${encodeURIComponent(code)}`);
            }
            return;
          } catch (retryErr: any) {
            alert(retryErr.message || "Failed to join room.");
          }
        }
        return;
      }
      alert(err.message || `Room ${code} has been closed or does not exist`);
    }
  }

  return (
    <main className="relative flex min-h-full w-full items-center justify-center px-4 py-6 sm:py-10 my-auto">
      <DecoCards />

      {/* Main card */}
      <div
        className="relative z-10 w-full max-w-sm rounded-3xl gold-card-border bg-[#0a162b]/95 p-5 sm:p-8 my-auto shadow-[0_12px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl animate-card-deal"
      >
        {/* Brand header */}
        <div className="mb-4 sm:mb-8 text-center">
          <div className="mx-auto mb-2 sm:mb-4 flex h-14 sm:h-20 w-20 sm:w-28 items-center justify-center rounded-2xl border border-amber-500/30 bg-[#112240]/90 shadow-lg">
            <div className="text-xl sm:text-3xl leading-none flex items-center gap-1.5">
              <span className="text-amber-400">♠</span>
              <span className="text-amber-400">♣</span>
              <span className="text-amber-400">♥</span>
              <span className="text-amber-400">♦</span>
            </div>
          </div>
          <h1
            className="text-4xl sm:text-6xl font-black tracking-[0.18em] text-gold-metallic font-logo uppercase drop-shadow-lg py-1"
            style={{ fontFamily: "'Cinzel Decorative', serif" }}
          >
            CABO
          </h1>
          <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-slate-400 tracking-wide">
            Memory, tactics & rapid card swaps
          </p>
        </div>

        {/* Step 1: Name input (only if no name stored) */}
        {!nameReady ? (
          <div className="space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              What's your name?
            </label>
            <input
              autoFocus
              type="text"
              maxLength={30}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 30))}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
              placeholder="Enter your name (max 30 chars)"
              className="w-full rounded-2xl border border-amber-500/30 bg-[#060e1a]/90 px-4 py-3.5 text-center text-sm text-white placeholder:text-slate-600 placeholder:text-xs outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30"
            />
            <button
              onClick={saveName}
              disabled={!playerName.trim()}
              className="w-full rounded-2xl btn-gold-metallic px-5 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        ) : (
          /* Step 2: Create / Join (name already set) */
          <div className="space-y-4">
            {/* Playing as Name Badge with Change Name action */}
            <div className="glass-panel bg-[#0d1c33]/90 border border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xl">
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                  Playing as
                </span>
                <span className="text-base sm:text-lg font-black text-gold-metallic tracking-wide truncate max-w-[170px] sm:max-w-[210px]">
                  {playerName}
                </span>
              </div>
              <button
                onClick={() => setNameReady(false)}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-[#112240] hover:bg-[#1a2f54] border border-amber-500/30 text-amber-200 hover:text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow cursor-pointer"
                title="Change Name"
              >
                <span>Change</span>
                <span className="text-[11px]">✏️</span>
              </button>
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="w-full rounded-2xl btn-gold-metallic px-5 py-3.5 sm:py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all"
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
                className="w-full rounded-2xl border border-amber-900/30 bg-[#0a1020]/80 px-4 py-3.5 text-center font-mono text-base tracking-widest text-amber-400 placeholder:text-slate-600 placeholder:font-sans placeholder:text-xs placeholder:tracking-normal outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />

              <button
                onClick={enterRoom}
                disabled={roomCode.length !== 6}
                className="w-full rounded-2xl border border-amber-900/40 bg-[#141d35] px-5 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 transition-all hover:bg-[#1a2540] hover:text-white hover:border-amber-800/60 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-[#141d35] disabled:hover:border-amber-900/40"
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
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onStart(noOfPlayers);
    } catch {
      setError("Could not create the room. Try again.");
      setSubmitting(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !submitting) {
        e.preventDefault();
        submit();
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [noOfPlayers, submitting, onClose]);

  const sizes = Array.from(
    { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
    (_, i) => MIN_PLAYERS + i,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 sm:p-6 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl gold-card-border bg-[#0a162b]/95 p-6 sm:p-8 shadow-[0_12px_60px_rgba(0,0,0,0.7)] animate-card-deal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
          <h2 className="text-xl font-black tracking-wider text-gold-metallic font-logo">Create New Room</h2>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-gold-metallic border border-amber-500/40">
            Admin
          </span>
        </div>

        <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-gold-metallic font-logo">
          Total Players ({MIN_PLAYERS}–{MAX_PLAYERS})
        </label>
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:gap-2">
          {sizes.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNoOfPlayers(n)}
              className={`rounded-xl py-2.5 text-xs font-extrabold transition-all cursor-pointer ${
                noOfPlayers === n
                  ? "btn-gold-metallic scale-105"
                  : "border border-amber-500/30 bg-[#060e1a]/90 text-amber-200 hover:border-amber-400 hover:bg-[#112240]"
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
            className="flex-1 rounded-2xl border border-amber-500/30 bg-[#112240] py-3 text-xs font-bold text-amber-200 transition hover:bg-[#1a2f54] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex-1 rounded-2xl btn-gold-metallic py-3 text-xs font-extrabold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Starting…" : "Start Game"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom, joinRoom, rememberPlayer } from "@/shared/api";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/shared/types";


export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  async function startGame(name: string, noOfPlayers: number, isAdmin: boolean) {
    const res = await createRoom({ name, noOfPlayers, isAdmin });
    if (!res.room_id) {
      alert("Could not create the room. Try again.");
      return;
    }
    // The creator isn't auto-seated, so join the room we just made.
    await joinRoom({ room_id: res.room_id, player_name: name });
    // Remember that I'm the admin of this room (drives the Start button).
    rememberPlayer(res.room_id, { name, admin: true });
    router.push(`/Room?id=${encodeURIComponent(res.room_id)}`);
  }

  async function enterRoom() {
    const code = roomCode.trim();
    const name = window.prompt("Enter your name");
    if (!name?.trim()) return;
    try {
      // Actually join on the backend so we show up in everyone's lobby poll.
      await joinRoom({ room_id: code, player_name: name.trim() });
      rememberPlayer(code, { name: name.trim(), admin: false });
      router.push(`/Room?id=${encodeURIComponent(code)}`);
    } catch (err: any) {
      alert(`Could not join room: ${err.message || 'Room not found'}`);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-8 flex h-20 w-48 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg shadow-indigo-600/30">
            ♠️♣️♥️♦️
          </div>
          <h1 className="text-2xl leading-relaxed text-slate-900">
            Welcome to Cabu
          </h1>
          <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
            Create a room or join an existing one to get started.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full rounded-xl bg-indigo-600 px-4 py-4 text-xs leading-relaxed text-white shadow-sm transition active:scale-[0.98] hover:bg-indigo-700"
          >
            Create a Room
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              or
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={roomCode}
            onChange={(e) =>
              setRoomCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="Enter 6-digit room code"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />

          <button
            onClick={enterRoom}
            disabled={roomCode.length !== 6}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-xs leading-relaxed text-slate-700 transition active:scale-[0.98] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
          >
            Join a Room
          </button>
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
  onStart: (name: string, noOfPlayers: number, isAdmin: boolean) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [noOfPlayers, setNoOfPlayers] = useState(MIN_PLAYERS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await onStart(name.trim(), noOfPlayers, true);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base leading-relaxed text-slate-900">New Room</h2>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          You&apos;ll be the admin of this room.
        </p>

        <label className="mt-6 block text-[10px] uppercase tracking-wider text-slate-400">
          Your name
        </label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />

        <label className="mt-5 block text-[10px] uppercase tracking-wider text-slate-400">
          Players ({MIN_PLAYERS}–{MAX_PLAYERS})
        </label>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {sizes.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNoOfPlayers(n)}
              className={`rounded-lg border px-0 py-2 text-xs transition ${
                noOfPlayers === n
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-[10px] leading-relaxed text-red-500">{error}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs leading-relaxed text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || submitting}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-xs leading-relaxed text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            {submitting ? "Starting…" : "Start Game"}
          </button>
        </div>
      </div>
    </div>
  );
}

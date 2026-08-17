"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DecoCards from "@/components/DecoCards";
import RoomClosedModal from "@/components/RoomClosedModal";
import { getRememberedPlayer, connectGameSocket, getRoom, startGame, forgetPlayer, toggleReady } from "@/shared/api";
import { MAX_PLAYERS, type ApiPlayer } from "@/shared/types";

function RoomView() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const router = useRouter();

  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [noOfPlayers, setNoOfPlayers] = useState(MAX_PLAYERS);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);

  function triggerCountdown() {
    setCountdown((prev) => (prev === null ? 3 : prev));
  }

  // Handle 3-2-1 countdown timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      router.push(`/Game?id=${encodeURIComponent(id)}`);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, id, router]);

  useEffect(() => {
    if (!id) return;
    let isCancelled = false;

    // 1. Initial REST fetch on mount so state renders with 0ms delay
    getRoom(id)
      .then((room) => {
        if (isCancelled) return;
        setPlayers(room.players);
        setNoOfPlayers(room.max_players);
        if (room.phase !== "lobby") {
          router.push(`/Game?id=${encodeURIComponent(id)}`);
        }
      })
      .catch((err) => {
        const msg = (err?.message || "").toLowerCase();
        if (err?.status === 404 || msg.includes("404") || msg.includes("not found") || msg.includes("closed")) {
          setRoomClosed(true);
        }
      });

    // 2. Real-time WebSocket connection for live state pushes
    const cleanupWs = connectGameSocket(id, {
      onState: (room) => {
        if (isCancelled) return;
        setPlayers(room.players);
        setNoOfPlayers(room.max_players);
        if (room.phase !== "lobby") {
          router.push(`/Game?id=${encodeURIComponent(id)}`);
        }
      },
      onRoomEnded: () => {
        setRoomClosed(true);
      },
    });

    return () => {
      isCancelled = true;
      cleanupWs();
    };
  }, [id, router]);

  const myName = getRememberedPlayer(id)?.name ?? null;
  const me = players.find((p) => p.name === myName);
  const isAdmin = !!myName && players.some((p) => p.name === myName && p.is_admin);

  const nonAdmins = players.filter((p) => !p.is_admin);
  const allNonAdminsReady = nonAdmins.length > 0 && nonAdmins.every((p) => p.is_ready);

  // Admin first, then everyone else.
  const seated = [...players].sort(
    (a, b) => Number(b.is_admin) - Number(a.is_admin),
  );
  const emptySeats = Math.max(0, noOfPlayers - seated.length);

  async function handleStart() {
    try {
      const res = await startGame(id);
      triggerCountdown();
    } catch (err) {
      console.error("[start] failed:", err);
      alert(
        `Could not start the game: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async function handleToggleReady() {
    if (!me || !id) return;
    try {
      await toggleReady(id, me.id, !me.is_ready);
    } catch (err) {
      console.error("[ready] toggle failed:", err);
    }
  }

  if (!id) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <p className="text-xs leading-relaxed text-slate-500">
          No room code provided
        </p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-full w-full flex-col items-center justify-center px-4 py-6 sm:py-10 my-auto">
      <DecoCards />

      {/* 3-2-1 Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4 animate-pulse">
            Get Ready! Game Starting In...
          </p>
          <div className="text-7xl sm:text-9xl font-black text-amber-400 animate-bounce drop-shadow-[0_0_25px_rgba(245,158,11,0.7)]">
            {countdown > 0 ? countdown : "GO!"}
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-slate-700/60 bg-slate-900/90 p-5 sm:p-8 my-auto shadow-[0_8px_60px_rgba(0,0,0,0.5)]">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Room Code
          </p>
          <p className="mt-1 text-3xl font-black tracking-widest text-emerald-400 font-mono">{id}</p>
          <p className="mt-2 text-xs font-medium text-slate-400">
            {seated.length} of {noOfPlayers} players joined
          </p>
        </div>

        <ul className="mt-6 space-y-2.5">
          {seated.map((p) => {
            const isMe = p.name === myName;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-950/80 px-4 py-3.5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-emerald-400 border border-slate-700">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    {p.name}
                    {isMe && <span className="text-[9px] text-slate-500 font-normal">(You)</span>}
                  </p>
                </div>
                {p.is_admin ? (
                  <span className="rounded-full bg-amber-950/60 border border-amber-800/50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                    Admin
                  </span>
                ) : p.is_ready ? (
                  <span className="rounded-full bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    ✓ Ready
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    Not Ready
                  </span>
                )}
              </li>
            );
          })}

          {Array.from({ length: emptySeats }, (_, i) => (
            <li
              key={`e-${i}`}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-3.5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-slate-600 border border-slate-800">
                ?
              </span>
              <span className="flex-1 text-xs font-medium text-slate-600">
                Waiting for player…
              </span>
            </li>
          ))}
        </ul>

        {isAdmin ? (
          <button
            onClick={handleStart}
            disabled={seated.length < 2 || !allNonAdminsReady}
            className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 transition-all hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:bg-emerald-600"
          >
            {seated.length < 2
              ? "Waiting for 2+ Players..."
              : !allNonAdminsReady
              ? "Waiting for Players to Ready Up..."
              : "Start the Game"}
          </button>
        ) : (
          <button
            onClick={handleToggleReady}
            className={`mt-6 w-full rounded-2xl px-5 py-4 text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] ${
              me?.is_ready
                ? "bg-slate-800 text-amber-300 border border-amber-500/40 hover:bg-slate-700"
                : "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500"
            }`}
          >
            {me?.is_ready ? "Cancel Ready" : "Ready Up!"}
          </button>
        )}
        {roomClosed && <RoomClosedModal id={id} />}
      </div>
    </main>
  );
}

export default function Room() {
  return (
    <Suspense>
      <RoomView />
    </Suspense>
  );
}

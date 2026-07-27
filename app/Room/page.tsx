"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getRememberedPlayer, getRoom, startGame } from "@/shared/api";
import { MAX_PLAYERS, type ApiPlayer } from "@/shared/types";

function RoomView() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const router = useRouter();

  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [noOfPlayers, setNoOfPlayers] = useState(MAX_PLAYERS);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // Poll the room state every 2s so new players appear "live".
    async function poll() {
      try {
        const room = await getRoom(id);
        if (cancelled) return;
        setPlayers(room.players);
        setNoOfPlayers(room.max_players);
        // Once the game leaves the lobby, everyone moves to the table.
        if (room.phase !== "lobby") {
          router.push(`/Game?id=${encodeURIComponent(id)}`);
        }
      } catch (err: any) {
        if (err.message && err.message.includes("404")) {
          alert("Room not found or the game has ended.");
          router.push("/");
          return;
        }
        // ignore transient errors; next tick retries
      }
    }

    poll(); // run immediately, then on an interval
    const timer = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id, router]);

  // Am I the admin? Match the name we stored locally against the polled
  // players. Derived from `players` (empty on first render) so the server and
  // client agree on the initial HTML — avoids a hydration mismatch.
  const myName = getRememberedPlayer(id)?.name ?? null;
  const isAdmin =
    !!myName && players.some((p) => p.name === myName && p.is_admin);

  // Admin first, then everyone else.
  const seated = [...players].sort(
    (a, b) => Number(b.is_admin) - Number(a.is_admin),
  );
  const emptySeats = Math.max(0, noOfPlayers - seated.length);

  async function handleStart() {
    try {
      console.log("[start] calling /game/start for room", id);
      const res = await startGame(id);
      console.log("[start] success", res);
      // Poll will see phase !== "lobby" and move everyone to /Game;
      // navigate the admin straight away too.
      router.push(`/Game?id=${encodeURIComponent(id)}`);
    } catch (err) {
      console.error("[start] failed:", err);
      alert(
        `Could not start the game: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (!id) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <p className="text-[10px] leading-relaxed text-slate-500">
          No room code provided
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">
            Room Code
          </p>
          <p className="mt-1 text-2xl tracking-widest text-slate-900">{id}</p>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
            {seated.length} of {noOfPlayers} players joined
          </p>
        </div>

        <ul className="mt-8 space-y-3">
          {seated.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-4"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-700">
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 text-xs leading-relaxed text-slate-900">
                {p.name}
              </span>
              {p.is_admin && (
                <span className="rounded-full bg-indigo-600 px-2 py-1 text-[9px] uppercase tracking-wider text-white">
                  Admin
                </span>
              )}
            </li>
          ))}

          {Array.from({ length: emptySeats }, (_, i) => (
            <li
              key={`e-${i}`}
              className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-400">
                ?
              </span>
              <span className="flex-1 text-xs leading-relaxed text-slate-400">
                Waiting for player…
              </span>
            </li>
          ))}
        </ul>
        {isAdmin && (
          <button
            onClick={handleStart}
            disabled={seated.length < 2}
            className="mt-8 w-full rounded-xl bg-indigo-600 px-4 py-4 text-xs leading-relaxed text-white shadow-sm transition active:scale-[0.98] hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            Start the Game
          </button>
        )}
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

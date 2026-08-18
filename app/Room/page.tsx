"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import DecoCards from "@/components/DecoCards";
import RoomClosedModal from "@/components/RoomClosedModal";
import {
  getRememberedPlayer,
  connectGameSocket,
  getRoom,
  startGame,
  forgetPlayer,
  toggleReady,
  getStoredName,
  setStoredName,
  rememberPlayer,
  joinRoom,
  getPlayerId,
  destroyRoom,
  leaveRoom,
} from "@/shared/api";
import { MAX_PLAYERS, type ApiPlayer } from "@/shared/types";

function RoomView() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const router = useRouter();

  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [noOfPlayers, setNoOfPlayers] = useState(MAX_PLAYERS);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);

  // Name check modal state for direct room link access
  const [showNameModal, setShowNameModal] = useState(false);
  const [joinNameInput, setJoinNameInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const [showEndGameModal, setShowEndGameModal] = useState(false);

  async function handleLeaveRoom() {
    if (!id) return;
    const targetPlayer = me || (remembered?.id ? players.find((p) => p.id === remembered.id) : null);
    if (targetPlayer?.id) {
      try {
        await leaveRoom(id, targetPlayer.id);
      } catch (err) {
        console.error("[leave] failed:", err);
      }
    }
    forgetPlayer(id);
    router.push("/");
  }

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

  function refreshRoomState() {
    if (!id) return;
    getRoom(id)
      .then((room) => {
        setPlayers(room.players);
        setNoOfPlayers(room.max_players);
        if (room.phase !== "lobby") {
          router.push(`/Game?id=${encodeURIComponent(id)}`);
        }
      })
      .catch((err) => {
        console.error("[Room] Refresh room state failed:", err);
      });
  }

  // Name check: verify if player has joined this room or has a stored name
  useEffect(() => {
    if (!id) return;

    const remembered = getRememberedPlayer(id);
    if (remembered?.name) {
      // Player already remembered for this room
      return;
    }

    const storedName = getStoredName();
    if (storedName) {
      // User has a stored name, attempt auto-join
      joinRoom({ room_id: id, player_name: storedName })
        .then((res: any) => {
          rememberPlayer(id, { name: storedName, id: res.player_id }, res.max_players);
          refreshRoomState();
        })
        .catch((err) => {
          console.error("[Room] Auto-join with stored name failed:", err);
          setJoinNameInput(storedName);
          setShowNameModal(true);
        });
    } else {
      // No name in storage — must prompt user for name before joining
      setShowNameModal(true);
    }
  }, [id]);

  async function handleJoinSubmit() {
    const trimmed = joinNameInput.trim().slice(0, 10);
    if (!trimmed || !id || isJoining) return;
    setIsJoining(true);
    setJoinError("");

    try {
      setStoredName(trimmed);
      const res: any = await joinRoom({
        room_id: id,
        player_name: trimmed,
      });
      rememberPlayer(id, { name: trimmed, id: res.player_id }, res.max_players);
      setShowNameModal(false);
      refreshRoomState();
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("400") || msg.includes("full") || msg.includes("capacity")) {
        setJoinError("Room is full or capacity reached");
      } else {
        setJoinError(msg);
      }
    } finally {
      setIsJoining(false);
    }
  }

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

  const remembered = getRememberedPlayer(id);
  const myName = remembered?.name ?? getStoredName() ?? null;
  const me = players.find(
    (p) =>
      (remembered?.id && p.id === remembered.id) ||
      (myName && p.name.trim().toLowerCase() === myName.trim().toLowerCase()),
  );
  const isAdmin = !!me && (me.is_admin || !!remembered?.admin);

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
      toast.error(
        `Could not start the game: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async function handleToggleReady() {
    if (!id) return;
    const targetPlayer = me || (remembered?.id ? players.find((p) => p.id === remembered.id) : null);
    if (!targetPlayer) return;
    try {
      await toggleReady(id, targetPlayer.id, !targetPlayer.is_ready);
    } catch (err) {
      console.error("[ready] toggle failed:", err);
    }
  }

  async function handleShareLink() {
    if (!id) return;
    const url = `${window.location.origin}/Room?id=${encodeURIComponent(id)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join CABO Game Room",
          text: `Join my CABO game room (Room Code: ${id})!`,
          url: url,
        });
        return;
      } catch (e) {
        // Fallback to clipboard if share sheet is cancelled or fails
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Room link copied to clipboard! Share it with friends.");
    } catch (e) {
      toast.error(`Room URL: ${url}`);
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
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-4 animate-pulse">
            Get Ready! Game Starting In...
          </p>
          <div className="text-7xl sm:text-9xl font-black text-amber-400 animate-bounce drop-shadow-[0_0_25px_rgba(245,158,11,0.7)]">
            {countdown > 0 ? countdown : "GO!"}
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-sm rounded-3xl gold-card-border bg-[#0a162b]/95 p-5 sm:p-8 my-auto shadow-[0_12px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        {/* Top-Left Close/Leave Room Button (Red X) */}
        <button
          onClick={() => setShowEndGameModal(true)}
          className="absolute top-4 left-4 sm:top-5 sm:left-5 w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/50 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center text-xs sm:text-sm font-black tracking-wider z-20"
          title={isAdmin ? "Close Room" : "Return to Home Page"}
        >
          X
        </button>

        {/* Top-Right Share Button */}
        <button
          onClick={handleShareLink}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#112240] hover:bg-[#1a2f54] text-amber-300 hover:text-white border border-amber-500/40 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center text-xs sm:text-sm z-20"
          title="Share Room Link"
        >
          🔗
        </button>

        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Room Code
          </p>
          <p className="mt-1 text-3xl sm:text-4xl font-black tracking-widest text-gold-metallic font-mono">{id}</p>
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
                className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-[#060e1a]/90 px-4 py-3.5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#112240] text-xs font-black text-gold-metallic border border-amber-500/40">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {p.name} {isMe && "(You)"}
                  </p>
                </div>
                {p.is_admin ? (
                  <span className="rounded-full bg-amber-950/80 border border-amber-500/50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-300">
                    Admin
                  </span>
                ) : p.is_ready ? (
                  <span className="rounded-full bg-amber-950/80 border border-amber-500/50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-400">
                    ✓ Ready
                  </span>
                ) : (
                  <span className="rounded-full bg-[#112240] border border-amber-900/40 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Not Ready
                  </span>
                )}
              </li>
            );
          })}

          {Array.from({ length: emptySeats }, (_, i) => (
            <li
              key={`e-${i}`}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-amber-900/30 bg-[#060e1a]/40 px-4 py-3.5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0a162b] text-xs font-bold text-slate-600 border border-amber-900/20">
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
            className="mt-6 w-full rounded-2xl btn-gold-metallic px-5 py-4 text-xs font-extrabold uppercase tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-40"
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
            className={`mt-6 w-full rounded-2xl px-5 py-4 text-xs font-extrabold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] ${
              me?.is_ready
                ? "bg-[#112240] text-amber-300 border border-amber-500/50 hover:bg-[#1a2f54]"
                : "btn-gold-metallic"
            }`}
          >
            {me?.is_ready ? "Cancel Ready" : "Ready Up!"}
          </button>
        )}
        {roomClosed && <RoomClosedModal id={id} />}
      </div>

      {/* Admin / Player Exit Confirmation Modal */}
      {showEndGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl gold-card-border bg-[#0a162b]/95 p-6 sm:p-8 shadow-[0_12px_60px_rgba(0,0,0,0.7)] animate-card-deal text-center border border-rose-900/40">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-950/60 border border-rose-600/40 flex items-center justify-center text-3xl shadow-lg">
              {isAdmin ? "👑" : "🚪"}
            </div>

            <h2 className="mt-4 text-lg sm:text-xl font-black tracking-wider text-rose-400 font-sans">
              {isAdmin
                ? "Are you sure you want to close the room?"
                : "Are you sure you want to return to home page?"}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {isAdmin
                ? `As Room Admin, closing Room #${id} will terminate the room for all connected players and return everyone to the home page.`
                : `Leaving Room #${id} will remove you from the player list.`}
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={async () => {
                  if (isAdmin) {
                    if (id) {
                      try { await destroyRoom(id); } catch (e) { console.error("End room failed", e); }
                    }
                    forgetPlayer(id);
                    window.location.href = "/";
                  } else {
                    await handleLeaveRoom();
                  }
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-rose-700 hover:bg-rose-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-rose-950/50 transition hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isAdmin ? "🛑 Yes, Close Room" : "🚪 Yes, Return Home"}</span>
              </button>

              <button
                onClick={() => setShowEndGameModal(false)}
                className="w-full py-3 px-4 rounded-2xl border border-slate-700/60 bg-slate-900/80 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                Cancel & Stay in Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enter Name Modal when joining directly via link without session name */}
      {showNameModal && !roomClosed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-sm rounded-3xl gold-card-border bg-[#0a162b]/95 p-6 sm:p-8 shadow-[0_12px_60px_rgba(0,0,0,0.7)] animate-card-deal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <span className="text-3xl">🃏</span>
              <h2 className="mt-2 text-xl font-black tracking-wider text-gold-metallic font-logo">
                Join Room #{id}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Please enter your name to join the game
              </p>
            </div>

            <div className="space-y-4">
              <input
                autoFocus
                type="text"
                maxLength={10}
                value={joinNameInput}
                onChange={(e) => setJoinNameInput(e.target.value.slice(0, 10))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoinSubmit();
                }}
                placeholder="Enter your name (max 10 chars)"
                className="w-full rounded-2xl border border-amber-500/30 bg-[#060e1a]/90 px-4 py-3.5 text-center text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30"
              />

              {joinError && (
                <p className="text-xs font-semibold text-rose-400 bg-rose-950/50 p-2.5 rounded-xl border border-rose-900/50 text-center">
                  {joinError}
                </p>
              )}

              <button
                onClick={handleJoinSubmit}
                disabled={!joinNameInput.trim() || isJoining}
                className="w-full rounded-2xl btn-gold-metallic px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider transition disabled:opacity-40 cursor-pointer"
              >
                {isJoining ? "Joining Room..." : "Join Room"}
              </button>
            </div>
          </div>
        </div>
      )}
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

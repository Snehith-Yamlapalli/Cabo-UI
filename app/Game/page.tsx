"use client";
import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import DecoCards from "@/components/DecoCards";
import RoomClosedModal from "@/components/RoomClosedModal";
import RulesModal from "@/components/RulesModal";
import {
  getRememberedPlayer,
  connectGameSocket,
  getRoom,
  drawFromDeck,
  drawFromDiscard,
  discardPicked,
  replaceCard,
  endTurn,
  callCabo,
  startGame,
  toggleReady,
  stickyCard,
  giveCard,
  powerLook,
  powerSwap,
  powerDiscard,
  leaveRoom,
  destroyRoom,
  forgetPlayer,
  getStoredName,
  setStoredName,
  rememberPlayer,
  joinRoom,
  getPlayerId,
} from "@/shared/api";
import { suitSymbol } from "@/shared/game/cards";
import type { ApiCard, ApiPlayer, ApiRoomState, ApiStickyResolution } from "@/shared/types";

/* ─────────────────────── Responsive hook ─────────────────────── */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function check() {
      setIsMobile(window.innerHeight < 600 || window.innerWidth < 850);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

/* ─────────────────────── Game Actions Context ─────────────────────── */

type GameActions = {
  canDraw: boolean;       // It's my turn and pending_action is "draw"
  canDiscard: boolean;    // I've picked a card (pending_action is "discard")
  canCallCabo: boolean;   // It's my turn, haven't drawn yet, and Cabo hasn't been called
  pickedCard: ApiCard | null;
  onDrawDeck: () => void;
  onDrawDiscard: () => void;
  onDiscardPicked: () => void;
  onReplaceCard: (cardId: string) => void;
  onCallCabo: () => void;
  onStartNextRound: () => void;
  onToggleReady: () => void;
  onToggleScorecard: () => void;
  onSticky: (cardId: string) => void;
  onGiveCard: (cardId: string) => void;
  onPowerLook: (cardId: string) => void;
  onPowerSwap: (card1Id: string, card2Id: string) => void;
  onPowerDiscard: (cardId: string) => void;
  onExitGame: () => void;
  onEndGame: () => void;
};

/* ─────────────────────────── Card View ─────────────────────────── */

function CardView({
  card,
  size = "md",
  compact = false,
  onClick,
  clickable = false,
  index,
  isGlowing = false,
}: {
  card: ApiCard | null;
  size?: "xs" | "sm" | "md" | "lg";
  compact?: boolean;
  onClick?: () => void;
  clickable?: boolean;
  index?: number;
  isGlowing?: boolean;
}) {
  const DIMS: Record<string, { w: number; h: number; corner: number; center: number }> = compact
    ? {
        xs: { w: 32, h: 46, corner: 5, center: 12 },
        sm: { w: 38, h: 54, corner: 6, center: 14 },
        md: { w: 50, h: 70, corner: 8, center: 16 },
        lg: { w: 62, h: 88, corner: 10, center: 20 },
      }
    : {
        xs: { w: 38, h: 54, corner: 6, center: 14 },
        sm: { w: 50, h: 70, corner: 8, center: 16 },
        md: { w: 72, h: 100, corner: 10, center: 24 },
        lg: { w: 88, h: 124, corner: 12, center: 28 },
      };
  const d = DIMS[size] ?? DIMS.md;
  const radius = compact ? 5 : 10;
  const cursorClass = clickable ? "cursor-pointer ring-2 ring-amber-400/70 hover:ring-amber-300 hover:scale-105 transition-transform" : "";
  const glowClass = isGlowing ? "animate-card-glow" : "";

  const BADGE_DIMS: Record<string, { sizeClass: string; fontClass: string }> = compact
    ? {
        xs: { sizeClass: "w-2.5 h-2.5", fontClass: "text-[5.5px]" },
        sm: { sizeClass: "w-3 h-3", fontClass: "text-[6.5px]" },
        md: { sizeClass: "w-3.5 h-3.5", fontClass: "text-[7.5px]" },
        lg: { sizeClass: "w-4 h-4", fontClass: "text-[8.5px]" },
      }
    : {
        xs: { sizeClass: "w-3 h-3", fontClass: "text-[6.5px]" },
        sm: { sizeClass: "w-3.5 h-3.5", fontClass: "text-[7.5px]" },
        md: { sizeClass: "w-4 h-4", fontClass: "text-[8.5px]" },
        lg: { sizeClass: "w-4.5 h-4.5", fontClass: "text-[9.5px]" },
      };
  const badge = BADGE_DIMS[size] ?? BADGE_DIMS.md;

  if (!card) {
    return (
      <div
        className={`card-shadow card-back-pattern animate-card-deal card-interactive relative flex items-center justify-center transition-all duration-500 ${cursorClass} ${glowClass}`}
        style={{ width: d.w, height: d.h, borderRadius: radius }}
        onClick={clickable ? onClick : undefined}
      >
        {index !== undefined && (
          <div className={`absolute -top-1 -right-1 bg-slate-900/90 text-white font-bold rounded-full ${badge.sizeClass} ${badge.fontClass} flex items-center justify-center shadow z-10 border border-white/10`}>
            {index + 1}
          </div>
        )}
        <div
          className="absolute inset-[2px] rounded border flex items-center justify-center"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        >
          <span
            className="text-white/70 font-bold tracking-[0.12em]"
            style={{ fontSize: Math.max(4, d.corner - 2) }}
          >
            CABO
          </span>
        </div>
      </div>
    );
  }

  const isRed = card.color === "red";
  const textColor = isRed ? "#dc2626" : "#1e293b";

  return (
    <div
      className={`card-shadow animate-card-deal card-interactive relative flex flex-col justify-between bg-[#fffef8] transition-all duration-500 ${cursorClass} ${glowClass}`}
      style={{ width: d.w, height: d.h, color: textColor, borderRadius: radius, padding: compact ? 1 : 4 }}
      onClick={clickable ? onClick : undefined}
    >
      {index !== undefined && (
        <div className={`absolute -top-1 -right-1 bg-slate-900/90 text-white font-bold rounded-full ${badge.sizeClass} ${badge.fontClass} flex items-center justify-center shadow-lg z-10 border border-white/10`}>
          {index + 1}
        </div>
      )}
      <div className="flex flex-col items-center self-start leading-none" style={{ fontSize: d.corner }}>
        <span className="font-bold">{card.rank}</span>
        <span>{suitSymbol(card.suit)}</span>
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center leading-none opacity-75"
        style={{ fontSize: d.center }}
      >
        {suitSymbol(card.suit)}
      </div>
      <div className="flex flex-col items-center self-end rotate-180 leading-none" style={{ fontSize: d.corner }}>
        <span className="font-bold">{card.rank}</span>
        <span>{suitSymbol(card.suit)}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── Hand ─────────────────────────── */

function getCardValue(c: ApiCard | null): number {
  if (!c) return 0;
  if (c.rank === "A") return 1;
  if (c.rank === "J") return 11;
  if (c.rank === "Q") return 12;
  if (c.rank === "K") return 13;
  return parseInt(c.rank, 10) || 0;
}

function Hand({
  player,
  cards,
  myId,
  isTurn,
  isYou,
  cardSize = "sm",
  compact = false,
  layout = "grid",
  onCardClick,
  cardsClickable = false,
  isFinished = false,
  glowingCards = {},
}: {
  player: ApiPlayer;
  cards: (ApiCard | null)[];
  myId: string | null;
  isTurn: boolean;
  isYou: boolean;
  cardSize?: "xs" | "sm" | "md" | "lg";
  compact?: boolean;
  layout?: "grid" | "row";
  onCardClick?: (cardId: string) => void;
  cardsClickable?: boolean;
  isFinished?: boolean;
  glowingCards?: Record<string, boolean>;
}) {
  const [now, setNow] = useState(Date.now() / 1000);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(interval);
  }, []);

  const isDisconnected = (player as any).is_disconnected;
  const isCabo = (player as any).called_cabo;
  const gap = compact ? "gap-0.5" : "gap-1.5";
  const pad = compact ? "p-1" : "p-2 sm:p-3";

  // Trim trailing nulls beyond 4 cards so 5th+ empty slots disappear when not in use
  let effectiveCards = [...cards];
  while (effectiveCards.length > 4 && effectiveCards[effectiveCards.length - 1] === null) {
    effectiveCards.pop();
  }

  // Determine grid column class and display order for horizontal expansion:
  // 1-4 cards: 2 cols (1 2 / 3 4)
  // 5-6 cards: 3 cols (1 2 5 / 3 4 6)
  // 7-8 cards: 4 cols (1 2 5 7 / 3 4 6 8)
  let colsClass = "grid-cols-2";
  let displayItems: { card: ApiCard | null; origIndex: number }[] = [];

  if (layout === "row") {
    displayItems = effectiveCards.map((c, i) => ({ card: c, origIndex: i }));
  } else {
    if (effectiveCards.length <= 4) {
      colsClass = "grid-cols-2";
      displayItems = effectiveCards.map((c, i) => ({ card: c, origIndex: i }));
    } else if (effectiveCards.length === 5) {
      colsClass = "grid-cols-3";
      // Order: 1 | 2 | 5 (top row) over 3 | 4 (bottom row) -> indices [0, 1, 4, 2, 3]
      const order = [0, 1, 4, 2, 3];
      displayItems = order
        .filter((idx) => idx < effectiveCards.length)
        .map((idx) => ({ card: effectiveCards[idx], origIndex: idx }));
    } else if (effectiveCards.length === 6) {
      colsClass = "grid-cols-3";
      // Order: 1 | 2 | 5 (top row) over 3 | 4 | 6 (bottom row) -> indices [0, 1, 4, 2, 3, 5]
      const order = [0, 1, 4, 2, 3, 5];
      displayItems = order
        .filter((idx) => idx < effectiveCards.length)
        .map((idx) => ({ card: effectiveCards[idx], origIndex: idx }));
    } else if (effectiveCards.length === 7) {
      colsClass = "grid-cols-4";
      // Order: 1 | 2 | 5 | 7 (top row) over 3 | 4 | 6 (bottom row) -> indices [0, 1, 4, 6, 2, 3, 5]
      const order = [0, 1, 4, 6, 2, 3, 5];
      displayItems = order
        .filter((idx) => idx < effectiveCards.length)
        .map((idx) => ({ card: effectiveCards[idx], origIndex: idx }));
    } else {
      colsClass = "grid-cols-4";
      // Order: 1 | 2 | 5 | 7 (top row) over 3 | 4 | 6 | 8 (bottom row) -> indices [0, 1, 4, 6, 2, 3, 5, 7]
      const order = [0, 1, 4, 6, 2, 3, 5, 7];
      displayItems = order
        .filter((idx) => idx < effectiveCards.length)
        .map((idx) => ({ card: effectiveCards[idx], origIndex: idx }));
    }
  }

  const cardGrid = layout === "row" ? `flex ${gap}` : `grid ${colsClass} ${gap}`;

  const currentRoundSum = cards.reduce((sum, c) => sum + getCardValue(c), 0);

  return (
    <div
      className={`glass-panel flex flex-col items-center ${compact ? "gap-0.5" : "gap-1"} rounded-xl ${pad} transition-all ${
        isTurn ? "animate-turn-pulse border border-amber-400/60" : "border border-transparent"
      } ${isDisconnected ? "opacity-50" : ""}`}
    >
      {displayItems.length === 0 ? (
        <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/60 text-center shadow-lg">
          <p className="text-[8px] sm:text-[9px] font-extrabold text-amber-400 uppercase tracking-wider animate-pulse">
            Joined Room
          </p>
          <p className="text-[7px] sm:text-[8px] text-slate-400 mt-0.5 font-medium">
            Joins in Next Round
          </p>
        </div>
      ) : (
        <div className={cardGrid}>
          {displayItems.map(({ card: c, origIndex: i }) => {
            if (c === null) {
              // Render an empty dashed slot matching exact card dimensions
              const DIMS: Record<string, { w: number; h: number }> = compact
                ? { sm: { w: 40, h: 56 }, md: { w: 56, h: 78 }, lg: { w: 68, h: 96 } }
                : { sm: { w: 56, h: 78 }, md: { w: 80, h: 112 }, lg: { w: 96, h: 134 } };
              const d = DIMS[cardSize] ?? DIMS.md;

              return (
                <div
                  key={`empty-${i}`}
                  className="border-2 border-dashed border-slate-600/30 rounded-xl relative flex items-center justify-center opacity-50"
                  style={{ width: d.w, height: d.h, borderRadius: compact ? 5 : 10 }}
                >
                  <span className="text-slate-500 font-bold text-[9px] uppercase tracking-widest">Empty</span>
                  <div className={`absolute -top-1 -right-1 bg-slate-800/80 text-slate-400 font-bold rounded-full ${compact ? "w-2.5 h-2.5 text-[5.5px]" : "w-3.5 h-3.5 text-[7.5px]"} flex items-center justify-center border border-white/5`}>
                    {i + 1}
                  </div>
                </div>
              );
            }

            const isTimedReveal = Boolean(c.reveal_end_time);
            const isRevealActive = isTimedReveal ? (c.reveal_end_time! > now) : true;
            const isCardVisibleToMe = Boolean(
              myId && c.visible_to?.some((id) => String(id).toLowerCase() === String(myId).toLowerCase())
            );
            const faceUp = isFinished || (isCardVisibleToMe && isRevealActive);

            return (
              <CardView
                key={c.id}
                card={faceUp ? c : null}
                size={cardSize}
                compact={compact}
                clickable={cardsClickable}
                onClick={() => onCardClick?.(c.id)}
                index={i}
                isGlowing={glowingCards[c.id]}
              />
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-center flex-wrap gap-1">
        <span
          className={`truncate leading-none ${isYou ? "text-amber-400 font-bold" : "text-slate-300"}`}
          style={{ fontSize: compact ? 7 : isYou ? 11 : 9 }}
        >
          {isYou ? "You" : player.name}
        </span>
        {player.is_admin && (
          <span className="shrink-0 rounded-full bg-amber-600/80 px-1 py-px text-[5px] uppercase tracking-wider text-white">
            Admin
          </span>
        )}
        {isCabo && (
          <span className="shrink-0 rounded-full bg-amber-500/80 px-1 py-px text-[5px] uppercase tracking-wider text-white animate-glow-pulse">
            Cabo
          </span>
        )}
        {isTurn && !isFinished && (
          <span className="shrink-0 rounded-full bg-amber-500/80 px-1 py-px text-[5px] uppercase tracking-wider text-white">
            Turn
          </span>
        )}
        {isDisconnected && (
          <span className="shrink-0 rounded-full bg-slate-500/80 px-1 py-px text-[5px] uppercase tracking-wider text-white">
            Away
          </span>
        )}
        {isFinished && (
          <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[7px] sm:text-[9px] font-extrabold text-white shadow shadow-amber-900/50 border border-amber-300/40">
            Round: {currentRoundSum} | Total: {player.score}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Action Buttons ─────────────────────────── */

function DiscardButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${compact ? "px-3 py-1 text-[8px]" : "px-5 py-2 text-xs"} font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-105 active:scale-95 transition-all`}
    >
      Discard
    </button>
  );
}

function CaboButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${compact ? "px-3 py-1 text-[8px]" : "px-5 py-2 text-xs"} font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95 transition-all animate-pulse`}
    >
      Call Cabo!
    </button>
  );
}

function NextRoundButton({
  isAdmin,
  isReady,
  allNonAdminsReady,
  onStart,
  onToggleReady,
  compact = false,
}: {
  isAdmin: boolean;
  isReady: boolean;
  allNonAdminsReady: boolean;
  onStart: () => void;
  onToggleReady: () => void;
  compact?: boolean;
}) {
  if (isAdmin) {
    return (
      <button
        onClick={onStart}
        disabled={!allNonAdminsReady}
        className={`${compact ? "px-3 py-1 text-[8px]" : "px-4 py-2 text-xs"} font-extrabold uppercase tracking-wider rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 disabled:shadow-none animate-pulse`}
      >
        {!allNonAdminsReady ? "Waiting for Players..." : "Start Next Round →"}
      </button>
    );
  }

  return (
    <button
      onClick={onToggleReady}
      className={`${compact ? "px-3 py-1 text-[8px]" : "px-4 py-2 text-xs"} font-extrabold uppercase tracking-wider rounded-full transition-all hover:scale-105 active:scale-95 ${
        isReady
          ? "bg-slate-800 text-amber-400 border border-amber-500/50 shadow-lg"
          : "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 animate-bounce"
      }`}
    >
      {isReady ? "✓ Ready (Cancel)" : "Ready Up for Next Round!"}
    </button>
  );
}

function ScorecardButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass-panel hover:bg-slate-800/80 text-amber-400 font-extrabold w-8 h-8 rounded-full flex items-center justify-center border border-amber-500/40 shadow-lg hover:scale-105 active:scale-95 transition-all text-xs"
      title="Scorecard & Rules"
    >
      (i)
    </button>
  );
}

function ExitButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass-panel hover:bg-slate-800/80 text-slate-300 font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1 border border-slate-600/50 shadow-lg hover:scale-105 active:scale-95 transition-all text-xs"
      title="Exit Game"
    >
      <span className="text-xs">🚪</span>
      <span className="hidden sm:inline">Exit</span>
    </button>
  );
}

function EndGameButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass-panel hover:bg-rose-900/80 text-rose-300 font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 border border-rose-500/50 shadow-lg hover:scale-105 active:scale-95 transition-all text-xs animate-pulse"
      title="End Game for Everyone"
    >
      <span className="text-xs">🛑</span>
      <span className="hidden sm:inline">End Game</span>
    </button>
  );
}

function CaboRoundBanner() {
  return (
    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="glass-panel px-4 py-1 rounded-full border border-amber-500/60 bg-amber-950/40 animate-pulse">
        <p className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-400">
          Cabo Called! Final Round In Progress
        </p>
      </div>
    </div>
  );
}

function GameOverBanner({ room }: { room: ApiRoomState }) {
  const sortedPlayers = [...room.players].sort((a, b) => a.score - b.score);
  const winner = sortedPlayers[0];

  return (
    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
      <div className="glass-panel px-4 py-1.5 rounded-full border border-amber-500/60 bg-amber-950/40 shadow-lg flex items-center gap-2">
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400">
          Round {room.round_number ?? 1} Finished! Leader: {winner ? `${winner.name} (${winner.score} pts)` : "N/A"}
        </span>
      </div>
    </div>
  );
}

function ScorecardModal({
  room,
  myId,
  actions,
  onClose,
}: {
  room: ApiRoomState;
  myId: string | null;
  actions: Record<string, any>;
  onClose: () => void;
}) {
  const sortedPlayers = [...room.players].sort((a, b) => a.score - b.score);
  const leader = sortedPlayers[0];

  const myName = getRememberedPlayer(room.room_id)?.name ?? null;
  const me = room.players.find((p) => (myId && String(p.id).toLowerCase() === String(myId).toLowerCase()) || (myName && p.name.trim().toLowerCase() === myName.trim().toLowerCase())) || null;
  const isAdmin = me?.is_admin ?? false;
  const nonAdmins = room.players.filter((p) => !p.is_admin);
  const allNonAdminsReady = nonAdmins.length > 0 ? nonAdmins.every((p) => p.is_ready) : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md p-5 rounded-3xl border border-amber-500/50 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-amber-400">Score</span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gold-metallic font-sans uppercase tracking-wider leading-none">
                Match Scorecard
              </h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                Room {room.room_id} • Round {room.round_number ?? 1}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs"
          >
            X
          </button>
        </div>

        {/* Score Table */}
        <div className="flex flex-col gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Cumulative Standings (Lowest Score Wins)
          </h3>
          <div className="flex flex-col gap-1.5">
            {sortedPlayers.map((p, idx) => (
              <div
                key={p.id}
                className={`flex justify-between items-center px-3.5 py-2 rounded-xl border ${
                  p.id === leader?.id
                    ? "bg-amber-950/40 border-amber-500/60 shadow-sm"
                    : "bg-slate-800/60 border-slate-700/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold text-xs">#{idx + 1}</span>
                  <span className="font-semibold text-xs text-slate-200">
                    {p.name} {p.id === leader?.id ? "(Leader)" : ""}
                  </span>
                  {p.is_admin && (
                    <span className="text-[7px] bg-amber-600/80 px-1 py-px rounded-full uppercase text-white font-bold">
                      Admin
                    </span>
                  )}
                  {room.phase === "finished" && !p.is_admin && (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold ${
                        p.is_ready
                          ? "bg-amber-500/80 text-white shadow-sm"
                          : "bg-slate-700/80 text-slate-400"
                      }`}
                    >
                      {p.is_ready ? "✓ Ready" : "Not Ready"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {p.round_score !== undefined && room.phase === "finished" && (
                    <span className="text-[10px] text-slate-400">
                      (+{p.round_score})
                    </span>
                  )}
                  <span className="text-sm font-black text-amber-400">
                    {p.score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Point Reference */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-700/60">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Card Point Reference
          </h3>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
            <div className="bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/40 flex justify-between">
              <span>Ace (A)</span>
              <span className="font-bold text-amber-400">1 pt</span>
            </div>
            <div className="bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/40 flex justify-between">
              <span>2 - 10</span>
              <span className="font-bold text-amber-400">Face Value</span>
            </div>
            <div className="bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/40 flex justify-between">
              <span>Jack (J)</span>
              <span className="font-bold text-amber-400">11 pts</span>
            </div>
            <div className="bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/40 flex justify-between">
              <span>Queen (Q)</span>
              <span className="font-bold text-amber-400">12 pts</span>
            </div>
            <div className="bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/40 flex justify-between col-span-2">
              <span>King (K)</span>
              <span className="font-bold text-amber-400">13 pts</span>
            </div>
          </div>
        </div>

        {/* Next Round Controls */}
        {room.phase === "finished" && (
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-700/60">
            {isAdmin ? (
              <button
                onClick={actions.onStartNextRound}
                disabled={!allNonAdminsReady}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black uppercase tracking-wider text-xs shadow-lg shadow-amber-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 disabled:shadow-none animate-pulse"
              >
                {!allNonAdminsReady ? "Waiting for Players to Ready Up..." : "Start Next Round →"}
              </button>
            ) : (
              <button
                onClick={actions.onToggleReady}
                className={`w-full py-3 px-4 rounded-2xl font-black uppercase tracking-wider text-xs transition-all hover:scale-[1.02] active:scale-95 ${
                  me?.is_ready
                    ? "bg-slate-800 text-amber-400 border border-amber-500/50 shadow-lg"
                    : "bg-amber-600 text-slate-950 shadow-lg shadow-amber-900/40 hover:bg-amber-500 animate-bounce"
                }`}
              >
                {me?.is_ready ? "✓ Ready for Next Round (Cancel)" : "Ready Up for Next Round!"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Picked Card Display ─────────────────────── */

function PickedCardBadge({ card, room, myId, compact = false }: { card: ApiCard; room: ApiRoomState; myId: string | null; compact?: boolean }) {
  const isPublic = room.turn.drawn_from === "discard" || room.phase === "finished" || (myId ? card.visible_to.includes(myId) : false);
  const displayCard = isPublic ? card : null;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`${compact ? "text-[6px]" : "text-[8px]"} uppercase tracking-wider text-amber-400 font-bold`}>
        Picked
      </span>
      <CardView card={displayCard} size={compact ? "sm" : "md"} compact={compact} />
    </div>
  );
}

/* ─────────────────────────── Seat Layout ─────────────────────────── */

type SeatId = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-right";

const ALL_OPPONENT_SEATS: SeatId[] = ["top-left", "top-center", "top-right", "bottom-left", "bottom-right"];

const SEAT_STYLES: Record<SeatId, React.CSSProperties> = {
  "top-left":     { position: "absolute", top: "14%", left: "14%" },
  "top-center":   { position: "absolute", top: "1%",  left: "50%", transform: "translateX(-50%)" },
  "top-right":    { position: "absolute", top: "14%", right: "14%" },
  "bottom-left":  { position: "absolute", top: "58%", left: "4%" },
  "bottom-right": { position: "absolute", top: "58%", right: "4%" },
};

const SEAT_ASSIGNMENTS: Record<number, SeatId[]> = {
  1: ["top-center"],
  2: ["top-left", "top-right"],
  3: ["top-left", "top-center", "top-right"],
  4: ["bottom-left", "top-left", "top-right", "bottom-right"],
  5: ["bottom-left", "top-left", "top-center", "top-right", "bottom-right"],
};

type SeatedOpponent = {
  player: ApiPlayer;
  seatId: SeatId;
  isSittingOut: boolean;
};

function calculateSeatedOpponents(room: ApiRoomState, myId: string | null): SeatedOpponent[] {
  // Rotate players array so that opponents are ordered CLOCKWISE in turn sequence starting right after myId
  const myIndex = room.players.findIndex((p) => p.id === myId);
  const allOtherPlayers: ApiPlayer[] = [];
  if (myIndex >= 0) {
    for (let i = 1; i < room.players.length; i++) {
      const idx = (myIndex + i) % room.players.length;
      allOtherPlayers.push(room.players[idx]);
    }
  } else {
    allOtherPlayers.push(...room.players);
  }

  if (allOtherPlayers.length === 0) return [];

  const isActiveRound = room.phase === "peeking" || room.phase === "playing" || room.phase === "cabo_round";

  if (!isActiveRound) {
    const count = Math.min(allOtherPlayers.length, 5);
    const seats = SEAT_ASSIGNMENTS[count] ?? SEAT_ASSIGNMENTS[5]!;
    return allOtherPlayers.slice(0, 5).map((p, idx) => ({
      player: p,
      seatId: seats[idx],
      isSittingOut: false,
    }));
  }

  const playingOpponents = allOtherPlayers.filter(
    (p) => room.hands[p.id] && room.hands[p.id].length > 0
  );
  const sittingOutOpponents = allOtherPlayers.filter(
    (p) => !room.hands[p.id] || room.hands[p.id].length === 0
  );

  const activeList = playingOpponents.length > 0 ? playingOpponents : allOtherPlayers;
  const waitingList = playingOpponents.length > 0 ? sittingOutOpponents : [];

  const count = Math.min(activeList.length, 5);
  const activeSeats = SEAT_ASSIGNMENTS[count] ?? SEAT_ASSIGNMENTS[5]!;

  const result: SeatedOpponent[] = [];

  activeList.forEach((p, idx) => {
    if (idx < 5) {
      result.push({
        player: p,
        seatId: activeSeats[idx],
        isSittingOut: false,
      });
    }
  });

  const unusedSeats = ALL_OPPONENT_SEATS.filter((s) => !activeSeats.includes(s));
  waitingList.forEach((p, idx) => {
    if (idx < unusedSeats.length) {
      result.push({
        player: p,
        seatId: unusedSeats[idx],
        isSittingOut: true,
      });
    }
  });

  return result;
}

/* ──────────────────── Mobile Layout ──────────────────── */

const MOBILE_SEAT_STYLES: Record<SeatId, React.CSSProperties> = {
  "top-left":     { position: "absolute", top: "12%", left: "14%" },
  "top-center":   { position: "absolute", top: "1%",  left: "50%", transform: "translateX(-50%)" },
  "top-right":    { position: "absolute", top: "12%", right: "14%" },
  "bottom-left":  { position: "absolute", top: "56%", left: "2%" },
  "bottom-right": { position: "absolute", top: "56%", right: "2%" },
};

function getDynamicSeatStyle(seatId: SeatId, cardCount: number, isMobile: boolean): React.CSSProperties {
  const base = isMobile ? MOBILE_SEAT_STYLES[seatId] : SEAT_STYLES[seatId];
  if (cardCount <= 4) return base;

  // Gently adjust outward when penalty cards arrive
  if (seatId === "top-left") return { ...base, left: "10%" };
  if (seatId === "top-right") return { ...base, right: "10%" };
  if (seatId === "bottom-left") return { ...base, left: "2%" };
  if (seatId === "bottom-right") return { ...base, right: "2%" };

  return base;
}

function TableWatermark() {
  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
      <span className="text-[28vw] sm:text-[32vw] md:text-[380px] font-black tracking-[0.15em] text-gold-metallic opacity-[0.06] uppercase font-logo drop-shadow-2xl pl-[0.15em] leading-none text-center whitespace-nowrap">
        CABO
      </span>
    </div>
  );
}

function MobileLayout({
  others,
  me,
  room,
  myId,
  currentTurnId,
  discardTop,
  actions,
  handleCardClick,
  getCardClickable,
  glowingCards,
}: {
  others: ApiPlayer[];
  me: ApiPlayer | null;
  room: ApiRoomState;
  myId: string | null;
  currentTurnId: string | null;
  discardTop: ApiCard | null;
  actions: GameActions;
  handleCardClick: (cardId: string, isMyCard: boolean) => void;
  getCardClickable: (isMyCard: boolean) => boolean;
  glowingCards: Record<string, boolean>;
}) {
  const seatedOpponents = calculateSeatedOpponents(room, myId);
  const isAdmin = me?.is_admin ?? false;
  const nonAdmins = room.players.filter((p) => !p.is_admin);
  const allNonAdminsReady = nonAdmins.length > 0 ? nonAdmins.every((p) => p.is_ready) : true;

  return (
    <main className="relative z-10 w-full h-[100dvh] overflow-hidden">
      <TableWatermark />
      {/* Top Left: Scorecard & Exit (Row 1) + End Game (Row 2 below Exit) */}
      <div className="absolute top-1 left-2 z-30 flex flex-col items-start gap-1">
        <div className="flex items-center gap-1.5">
          <ScorecardButton onClick={actions.onToggleScorecard} />
          <ExitButton onClick={actions.onExitGame} />
        </div>
        {me?.is_admin && (
          <div className="pl-[26px]">
            <EndGameButton onClick={actions.onEndGame} />
          </div>
        )}
      </div>

      {/* Top Right: Room Badge (Row 1) + Call Cabo / Next Round (Row 2 below Room Badge) */}
      <div className="absolute top-1 right-2 z-40 flex flex-col items-end gap-1">
        <div className="glass-panel px-2 py-0.5 rounded-lg border border-slate-600/50 shadow">
          <p className="text-right text-[8px] font-bold uppercase tracking-wider text-slate-300">
            Room {room.room_id} · R{room.round_number ?? 1}
          </p>
        </div>
        {room.phase === "finished" && (
          <NextRoundButton
            isAdmin={isAdmin}
            isReady={me?.is_ready ?? false}
            allNonAdminsReady={allNonAdminsReady}
            onStart={actions.onStartNextRound}
            onToggleReady={actions.onToggleReady}
            compact
          />
        )}
        {me && actions.canCallCabo && (
          <CaboButton onClick={actions.onCallCabo} compact />
        )}
      </div>

      {/* Opponents in their seats */}
      {seatedOpponents.map(({ player: p, seatId }) => {
        const cards = room.hands[p.id] ?? [];
        const style = getDynamicSeatStyle(seatId, cards.length, true);
        
        return (
          <div key={p.id} style={style} className="z-10">
            <Hand
              player={p}
              cards={cards}
              myId={myId}
              isTurn={p.id === currentTurnId}
              isYou={false}
              cardSize="xs"
              compact
              layout="grid"
              cardsClickable={getCardClickable(false)}
              onCardClick={(cardId) => handleCardClick(cardId, false)}
              isFinished={room.phase === "finished"}
              glowingCards={glowingCards}
            />
          </div>
        );
      })}

      {/* Center Zone Mat: Distinguished Grey Plate for Deck + Discard */}
      {room.phase !== "finished" && (
        <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-500">
          <div className="glass-panel bg-[#0d1528]/80 border border-amber-900/30 shadow-xl rounded-2xl p-1.5 flex items-center gap-4">
            {/* Deck */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="animate-float">
                <CardView card={null} size="sm" compact clickable={actions.canDraw} onClick={actions.onDrawDeck} />
              </div>
              <span className="text-[7px] font-bold uppercase tracking-wider text-slate-300">
                Deck · {room.draw_pile.length}
              </span>
            </div>

            {/* Picked card (shown between deck and discard) */}
            {actions.pickedCard && (
              <div className="flex flex-col items-center gap-0.5 px-1 border-x border-slate-700/60">
                <PickedCardBadge card={actions.pickedCard} room={room} myId={myId} compact />
              </div>
            )}

            {/* Discard */}
            <div className="flex flex-col items-center gap-0.5">
              {discardTop ? (
                <CardView card={discardTop} size="sm" compact clickable={actions.canDraw && room.discard_pile.length > 0} onClick={actions.onDrawDiscard} isGlowing={glowingCards[discardTop.id]} />
              ) : (
                <div
                  className="flex items-center justify-center border border-dashed border-slate-600/60 text-[6px] font-bold uppercase text-slate-500 rounded-lg"
                  style={{ width: 38, height: 54 }}
                >
                  Empty
                </div>
              )}
              <span className="text-[7px] font-bold uppercase tracking-wider text-slate-300">
                Discard
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Your hand at bottom */}
      {me && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 flex items-end gap-2 sm:gap-3">
          <Hand
            player={me}
            cards={room.hands[me.id] ?? []}
            myId={myId}
            isTurn={me.id === currentTurnId}
            isYou
            cardSize="sm"
            compact
            layout="grid"
            cardsClickable={getCardClickable(true)}
            onCardClick={(cardId) => handleCardClick(cardId, true)}
            isFinished={room.phase === "finished"}
            glowingCards={glowingCards}
          />
          {actions.canDiscard && (
            <DiscardButton onClick={actions.onDiscardPicked} compact />
          )}
        </div>
      )}
    </main>
  );
}

/* ──────────────────── Desktop Layout ──────────────────── */

function DesktopLayout({
  others,
  me,
  room,
  myId,
  currentTurnId,
  discardTop,
  actions,
  handleCardClick,
  getCardClickable,
  glowingCards,
}: {
  others: ApiPlayer[];
  me: ApiPlayer | null;
  room: ApiRoomState;
  myId: string | null;
  currentTurnId: string | null;
  discardTop: ApiCard | null;
  actions: GameActions;
  handleCardClick: (cardId: string, isMyCard: boolean) => void;
  getCardClickable: (isMyCard: boolean) => boolean;
  glowingCards: Record<string, boolean>;
}) {
  const seatedOpponents = calculateSeatedOpponents(room, myId);
  const isAdmin = me?.is_admin ?? false;
  const nonAdmins = room.players.filter((p) => !p.is_admin);
  const allNonAdminsReady = nonAdmins.length > 0 ? nonAdmins.every((p) => p.is_ready) : true;

  return (
    <main className="relative z-10 w-full h-[100dvh] overflow-hidden flex justify-center">
      <TableWatermark />
      {/* Top Left: Scorecard & Exit (Row 1) + End Game (Row 2 below Exit) */}
      <div className="absolute top-4 left-6 z-40 flex flex-col items-start gap-1.5">
        <div className="flex items-center gap-2">
          <ScorecardButton onClick={actions.onToggleScorecard} />
          <ExitButton onClick={actions.onExitGame} />
        </div>
        {me?.is_admin && (
          <div className="pl-[34px]">
            <EndGameButton onClick={actions.onEndGame} />
          </div>
        )}
      </div>

      {/* Top Right: Room Badge (Row 1) + Call Cabo / Next Round (Row 2 below Room Badge) */}
      <div className="absolute top-4 right-6 z-40 flex flex-col items-end gap-1.5">
        <div className="glass-panel px-3.5 py-1.5 rounded-xl border border-slate-600/50 shadow-lg flex items-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Room {room.room_id} · Round {room.round_number ?? 1} · {room.phase}
          </p>
        </div>
        {room.phase === "finished" && (
          <NextRoundButton
            isAdmin={isAdmin}
            isReady={me?.is_ready ?? false}
            allNonAdminsReady={allNonAdminsReady}
            onStart={actions.onStartNextRound}
            onToggleReady={actions.onToggleReady}
          />
        )}
        {me && actions.canCallCabo && (
          <CaboButton onClick={actions.onCallCabo} />
        )}
      </div>

      {/* Balanced table container max-w-[1350px] */}
      <div className="relative w-full max-w-[1350px] h-full">

        {/* Opponents */}
        {seatedOpponents.map(({ player: p, seatId }) => {
          if (!seatId) return null;
          const cards = room.hands[p.id] ?? [];
          const style = getDynamicSeatStyle(seatId, cards.length, false);
          return (
            <div key={p.id} style={style} className="z-10">
              <Hand
                player={p}
                cards={cards}
                myId={myId}
                isTurn={p.id === currentTurnId}
                isYou={false}
                cardSize="md"
                cardsClickable={getCardClickable(false)}
                onCardClick={(cardId) => handleCardClick(cardId, false)}
                isFinished={room.phase === "finished"}
                glowingCards={glowingCards}
              />
            </div>
          );
        })}

        {/* Center Zone Mat: Distinguished Grey Plate for Deck + Discard */}
        {room.phase !== "finished" && (
          <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-500">
            <div className="glass-panel bg-[#0d1528]/85 border border-amber-900/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-3xl px-6 py-3.5 flex items-center gap-8">
              {/* Deck */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="animate-float">
                  <CardView card={null} size="md" clickable={actions.canDraw} onClick={actions.onDrawDeck} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300">
                  Deck · {room.draw_pile.length}
                </span>
              </div>

              {/* Picked card (shown between deck and discard) */}
              {actions.pickedCard && (
                <div className="flex flex-col items-center gap-1 px-3 border-x border-slate-700/60">
                  <PickedCardBadge card={actions.pickedCard} room={room} myId={myId} />
                </div>
              )}

              {/* Discard */}
              <div className="flex flex-col items-center gap-1.5">
                {discardTop ? (
                  <CardView card={discardTop} size="md" clickable={actions.canDraw && room.discard_pile.length > 0} onClick={actions.onDrawDiscard} isGlowing={glowingCards[discardTop.id]} />
                ) : (
                  <div
                    className="flex items-center justify-center border-2 border-dashed border-slate-600/60 text-[9px] uppercase font-bold text-slate-500 rounded-xl"
                    style={{ width: 80, height: 112 }}
                  >
                    Empty
                  </div>
                )}
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300">
                  Discard
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Your hand + Discard/Cabo buttons */}
        {me && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-end gap-4">
            <Hand
              player={me}
              cards={room.hands[me.id] ?? []}
              myId={myId}
              isTurn={me.id === currentTurnId}
              isYou
              cardSize="lg"
              cardsClickable={getCardClickable(true)}
              onCardClick={(cardId) => handleCardClick(cardId, true)}
              isFinished={room.phase === "finished"}
              glowingCards={glowingCards}
            />
            {actions.canDiscard && (
              <DiscardButton onClick={actions.onDiscardPicked} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

/* ─────────────────────────── Peek Timer ─────────────────────────── */

function PeekTimer({ endTime }: { endTime?: number }) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!endTime) return;
    
    function tick() {
      const remaining = Math.max(0, endTime! - Date.now() / 1000);
      setLeft(Math.ceil(remaining));
    }
    
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [endTime]);

  if (!endTime || left <= 0) return null;

  return (
    <div className="absolute bottom-4 right-4 z-50 pointer-events-none">
      <div className="glass-panel flex items-center gap-3 px-6 py-3 rounded-2xl border border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
        <span className="text-sm font-bold text-amber-400 uppercase tracking-widest">Memorize Your Cards</span>
        <span className="text-3xl font-black text-white drop-shadow-lg animate-pulse">{left}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── Action Toast ─────────────────────────── */

function ActionToast({ log }: { log?: string }) {
  const [visibleLog, setVisibleLog] = useState<string | null>(null);

  useEffect(() => {
    if (log) {
      setVisibleLog(log);
      const t = setTimeout(() => setVisibleLog(null), 3000);
      return () => clearTimeout(t);
    }
  }, [log]);

  if (!visibleLog) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 w-full max-w-sm">
      <div className="bg-slate-900/95 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-2xl shadow-black/50 border border-amber-500/30 text-center text-sm font-medium animate-pulse">
        {visibleLog}
      </div>
    </div>
  );
}

function WarningToast({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-sm">
      <div className="bg-rose-950/95 backdrop-blur text-rose-200 px-4 py-3 rounded-2xl shadow-2xl shadow-rose-950/80 border border-rose-500/50 text-center text-xs sm:text-sm font-bold animate-bounce flex items-center justify-between gap-2">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="text-rose-400 hover:text-white text-xs font-black px-1.5 py-0.5 rounded bg-rose-900/50 border border-rose-500/30"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function RulesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-3 left-3 z-40 glass-panel bg-slate-900/90 hover:bg-slate-800 text-amber-400 font-black w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border border-amber-500/50 shadow-xl hover:scale-110 active:scale-95 transition-all text-base sm:text-lg"
      title="Game Rules & Powers Guide"
    >
      📖
    </button>
  );
}



/* ─────────────────────────── Sticky Resolution Banner ─────────────────────────── */

function StickyResolutionBanner({ resolution, players, myId }: { resolution: ApiStickyResolution; players: ApiPlayer[]; myId: string | null }) {
  const giver = players.find(p => p.id === resolution.giver_id);
  const receiver = players.find(p => p.id === resolution.receiver_id);
  const isMe = resolution.giver_id === myId;

  return (
    <div className="fixed top-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 w-full max-w-sm">
      <div className="bg-amber-900/90 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-2xl shadow-black/50 border border-amber-500/50 text-center text-sm font-bold animate-pulse">
        {isMe 
          ? `Select one of your cards to give to ${receiver?.name}!`
          : `Waiting for ${giver?.name} to give a card to ${receiver?.name}...`}
      </div>
    </div>
  );
}

/* ─────────────────────────── Peeking Banner ─────────────────────────── */

function PeekingBanner({ peekEndTime }: { peekEndTime?: number | null }) {
  const [now, setNow] = useState(Date.now() / 1000);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() / 1000), 200);
    return () => clearInterval(timer);
  }, []);

  if (!peekEndTime || now >= peekEndTime) return null;
  const remaining = Math.max(0, Math.ceil(peekEndTime - now));
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 w-full max-w-sm">
      <div className="bg-amber-950/90 backdrop-blur text-amber-300 px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/60 text-center text-sm font-extrabold animate-pulse">
        👀 Memorize your 2 cards! ({remaining}s)
      </div>
    </div>
  );
}

/* ─────────────────────────── Power Banner ─────────────────────────── */

function PowerBanner({ room, myId, powerTargets, onSkip }: { room: ApiRoomState; myId: string | null; powerTargets: string[]; onSkip: () => void }) {
    if (!myId || room.current_turn !== room.players.findIndex(p => p.id === myId)) return null;
    const pa = room.turn.pending_action;
    if (!["look_self", "look_other", "blind_swap", "look_and_swap", "discard_self"].includes(pa)) return null;

    let msg = "";
    let skipBtnText = "⏩ Skip Power";
    if (pa === "look_self") msg = "POWER (7/8): Peek at one of your own cards!";
    else if (pa === "look_other") msg = "POWER (9/10): Peek at one opponent's card!";
    else if (pa === "discard_self") msg = "POWER (K): Select one of your cards to trash!";
    else if (pa === "blind_swap") {
        if (powerTargets.length === 0) msg = "POWER (J): Select a card (yours or opponent's) to swap!";
        else msg = "POWER (J): Select the second card to swap with!";
    }
    else if (pa === "look_and_swap") {
        if (!room.turn.first_swap_target) {
            msg = "POWER (Q): Select a card to peek at!";
        } else {
            msg = "POWER (Q): Peeked! Select second card to swap, or keep cards.";
            skipBtnText = "🛡️ Keep Cards (Skip Swap)";
        }
    }

    return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm flex flex-col items-center gap-1.5">
      <div className="bg-purple-900/90 backdrop-blur text-white px-4 py-2.5 rounded-2xl shadow-2xl shadow-purple-900/50 border border-purple-400 text-center text-sm font-bold animate-pulse">
        {msg}
      </div>
      <button
        onClick={onSkip}
        className="glass-panel bg-purple-950/80 hover:bg-purple-900 text-purple-200 text-xs font-semibold px-3 py-1 rounded-xl border border-purple-400/50 shadow hover:scale-105 active:scale-95 transition-all pointer-events-auto cursor-pointer"
      >
        {skipBtnText}
      </button>
    </div>
    );
}

/* ─────────────────────────── Game Engine ─────────────────────────── */

function GameTable() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const isMobile = useIsMobile();

  const [room, setRoom] = useState<ApiRoomState | null>(null);
  const [busy, setBusy] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [powerTargets, setPowerTargets] = useState<string[]>([]);
  const [stickyWarning, setStickyWarning] = useState<string | null>(null);
  const [roomClosed, setRoomClosed] = useState(false);
  
  const previousHands = useRef<Record<string, string[]>>({});
  const [glowingCards, setGlowingCards] = useState<Record<string, boolean>>({});

  const [spectateChoice, setSpectateChoice] = useState<"watch" | "join" | null>(null);
  const [joinNameInput, setJoinNameInput] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (room?.phase === "finished") {
      setShowScorecard(true);
    }
  }, [room?.phase]);

  useEffect(() => {
    if (!id) return;
    let isCancelled = false;

    // 1. Initial REST fetch on mount so state renders with 0ms delay
    getRoom(id)
      .then((data) => {
        if (!isCancelled) {
          if (data.phase === "lobby") {
            window.location.href = `/Room?id=${encodeURIComponent(id)}`;
            return;
          }
          setRoom(data);
        }
      })
      .catch((err) => {
        const msg = (err?.message || "").toLowerCase();
        if (err?.status === 404 || msg.includes("404") || msg.includes("not found") || msg.includes("closed")) {
          setRoomClosed(true);
        }
      });

    // 2. Real-time WebSocket connection for live pushes
    const cleanupWs = connectGameSocket(id, {
      onState: (data) => {
        if (isCancelled) return;
        if (data.phase === "lobby") {
          window.location.href = `/Room?id=${encodeURIComponent(id)}`;
          return;
        }
        setRoom(data);
      },
      onRoomEnded: () => {
        setRoomClosed(true);
      },
    });

    return () => {
      isCancelled = true;
      cleanupWs();
    };
  }, [id]);

  useEffect(() => {
    if (!room) return;
    const newGlows: Record<string, boolean> = {};
    let hasChanges = false;
    const isFirstRender = Object.keys(previousHands.current).length === 0;

    for (const [playerId, hand] of Object.entries(room.hands)) {
      const currentIds = hand.filter(c => c).map(c => c!.id);
      const prevIds = previousHands.current[playerId] || [];
      
      if (!isFirstRender) {
        for (const id of currentIds) {
          if (!prevIds.includes(id)) {
            newGlows[id] = true;
            hasChanges = true;
          }
        }
      }
      previousHands.current[playerId] = currentIds;
    }

    // Track discard pile
    const currentDiscardIds = room.discard_pile.map(c => c.id);
    const prevDiscardIds = previousHands.current["discard"] || [];
    if (!isFirstRender) {
      for (const id of currentDiscardIds) {
        if (!prevDiscardIds.includes(id)) {
          newGlows[id] = true;
          hasChanges = true;
        }
      }
    }
    previousHands.current["discard"] = currentDiscardIds;

    if (hasChanges) {
      setGlowingCards(prev => ({ ...prev, ...newGlows }));
      setTimeout(() => {
        setGlowingCards(prev => {
          const next = { ...prev };
          for (const id of Object.keys(newGlows)) {
            delete next[id];
          }
          return next;
        });
      }, 2500);
    }
  }, [room]);

  if (!id) {
    return (
      <Centered>
        <p className="text-sm text-slate-400">No room code provided</p>
      </Centered>
    );
  }

  if (!room) {
    return (
      <Centered>
        <p className="text-sm text-slate-400">Loading game…</p>
      </Centered>
    );
  }

  const remembered = getRememberedPlayer(id);
  const myName = remembered?.name ?? getStoredName() ?? null;
  const me =
    room.players.find(
      (p) =>
        (remembered?.id && p.id === remembered.id) ||
        (myName && p.name.trim().toLowerCase() === myName.trim().toLowerCase()),
    ) || null;
  const myId = me?.id ?? null;
  const myIndex = room.players.findIndex((p) => p.id === myId);
  const others: ApiPlayer[] = [];
  if (myIndex >= 0) {
    for (let i = 1; i < room.players.length; i++) {
      const idx = (myIndex + i) % room.players.length;
      others.push(room.players[idx]);
    }
  } else {
    others.push(...room.players);
  }
  const currentTurnId = room.players[room.current_turn]?.id ?? null;
  const discardTop =
    room.discard_pile.length > 0
      ? room.discard_pile[room.discard_pile.length - 1]
      : null;

  const isSittingOut = !!me && (!room.hands[me.id] || room.hands[me.id].length === 0);

  async function handleJoinForNextRound(nameToUse?: string) {
    const finalName = (nameToUse || getStoredName() || "").trim().slice(0, 10);
    if (!finalName) {
      setShowNameModal(true);
      return;
    }
    setIsJoining(true);
    setJoinError("");
    try {
      setStoredName(finalName);
      const res: any = await joinRoom({ room_id: id, player_name: finalName });
      rememberPlayer(id, { name: finalName, id: res.player_id }, room?.max_players);
      setShowNameModal(false);
      setSpectateChoice("join");
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("400") || msg.includes("full") || msg.includes("capacity")) {
        setJoinError("Room is full or capacity reached");
      } else {
        setJoinError(msg);
      }
      setShowNameModal(true);
    } finally {
      setIsJoining(false);
    }
  }

  const isMyTurn = myId !== null && myId === currentTurnId;
  const pendingAction = room.turn.pending_action;
  const caboAlreadyCalled = room.players.some((p) => (p as any).called_cabo);

  const actions: GameActions = {
    canDraw: isMyTurn && pendingAction === "draw" && room.phase !== "finished" && !busy,
    canDiscard: isMyTurn && pendingAction === "discard" && room.phase !== "finished" && !busy,
    canCallCabo: isMyTurn && pendingAction === "draw" && !caboAlreadyCalled && (room.phase === "playing" || room.phase === "cabo_round") && !busy,
    pickedCard: room.turn.picked_card,

    onDrawDeck: async () => {
      if (!myId || busy) return;
      setBusy(true);
      try {
        await drawFromDeck(id, myId);
      } catch (e) { console.error("Draw deck failed", e); }
      setBusy(false);
    },

    onDrawDiscard: async () => {
      if (!myId || busy) return;
      setBusy(true);
      try {
        await drawFromDiscard(id, myId);
      } catch (e) { console.error("Draw discard failed", e); }
      setBusy(false);
    },

    onDiscardPicked: async () => {
      if (!myId || busy) return;
      setBusy(true);
      try {
        const res = await discardPicked(id, myId);
        if (res.turn.pending_action === "discard" || res.turn.pending_action === "none") {
          await endTurn(id, myId);
        }
      } catch (e) { console.error("Discard failed", e); }
      setBusy(false);
    },

    onReplaceCard: async (cardId: string) => {
      if (!myId || busy) return;
      setBusy(true);
      try {
        await replaceCard(id, myId, cardId);
        await endTurn(id, myId);
      } catch (e) { console.error("Replace card failed", e); }
      setBusy(false);
    },

    onCallCabo: async () => {
      if (!myId || busy) return;
      setBusy(true);
      try {
        await callCabo(id, myId);
      } catch (e) { console.error("Call Cabo failed", e); }
      setBusy(false);
    },

    onSticky: async (cardId: string) => {
      if (!myId) return;
      const myHand = room.hands[myId] ?? [];
      const validCardsCount = myHand.filter(c => c !== null).length;
      if (validCardsCount >= 8) {
        setStickyWarning("⚠️ Cannot Sticky: Max Limit reached!");
        setTimeout(() => setStickyWarning(null), 3500);
        return;
      }
      
      if (!id || busy) return;
      setBusy(true);
      try {
        await stickyCard(id, myId, cardId);
      } catch (e: any) {
        const msg = (e?.message || "").toLowerCase();
        if (msg.includes("8") || msg.includes("cannot sticky")) {
          setStickyWarning("⚠️ Cannot Sticky: Max Limit reached!");
          setTimeout(() => setStickyWarning(null), 3500);
        } else {
          console.error("Sticky failed", e);
        }
      }
      setBusy(false);
    },

    onGiveCard: async (cardId: string) => {
      if (!id || !myId || busy) return;
      setBusy(true);
      try {
        await giveCard(id, myId, cardId);
      } catch (e) { console.error("Give card failed", e); }
      setBusy(false);
    },

    onPowerLook: async (cardId: string) => {
      if (!id || !myId || busy) return;
      setBusy(true);
      try {
        await powerLook(id, myId, cardId);
      } catch (e) { console.error("Power look failed", e); }
      setBusy(false);
    },

    onPowerSwap: async (card1Id: string, card2Id: string) => {
      if (!id || !myId || busy) return;
      setBusy(true);
      try {
        await powerSwap(id, myId, card1Id, card2Id);
      } catch (e) { console.error("Power swap failed", e); }
      setBusy(false);
    },

    onPowerDiscard: async (cardId: string) => {
      if (!id || !myId || busy) return;
      setBusy(true);
      try {
        await powerDiscard(id, myId, cardId);
      } catch (e) { console.error("Power discard failed", e); }
      setBusy(false);
    },

    onStartNextRound: async () => {
      if (!id || busy) return;
      setBusy(true);
      try {
        await startGame(id);
      } catch (e) { console.error("Start next round failed", e); }
      setBusy(false);
    },

    onToggleReady: async () => {
      if (!id || !myId || busy) return;
      const rId = id;
      const pId = myId;
      setBusy(true);
      try {
        const mePlayer = room?.players.find((p) => String(p.id).toLowerCase() === String(pId).toLowerCase()) || me;
        const currentReady = mePlayer?.is_ready ?? false;
        await toggleReady(rId, pId, !currentReady);
      } catch (e) {
        console.error("Toggle ready failed", e);
      }
      setBusy(false);
    },

    onToggleScorecard: () => {
      setShowScorecard((prev) => !prev);
    },

    onExitGame: async () => {
      if (!id || !myId) return;
      try {
        await leaveRoom(id, myId);
      } catch (e) {
        console.error("Exit game failed", e);
      }
      forgetPlayer(id);
      window.location.href = "/";
    },

    onEndGame: () => {
      setShowEndGameModal(true);
    },
  };

  const handleCardClick = (cardId: string, isMyCard: boolean) => {
    const getCardOwnerId = (targetCardId: string): string | null => {
      if (!room) return null;
      for (const [pId, hand] of Object.entries(room.hands)) {
        if (hand.some((c) => c?.id === targetCardId)) return pId;
      }
      return null;
    };

    const activeRes = room.active_resolutions?.[0];
    const isPowerActive = isMyTurn && ["look_self", "look_other", "blind_swap", "look_and_swap", "discard_self"].includes(pendingAction);

    const caboCallerPlayer = room.players.find((p) => p.called_cabo);
    const caboCallerId = caboCallerPlayer?.id;
    const cardOwnerId = getCardOwnerId(cardId);

    // Freeze Cabo Caller's cards against other players' powers & sticky actions
    if (caboCallerId && cardOwnerId === caboCallerId && myId !== caboCallerId) {
      setStickyWarning("⚠️ Cards of the player who called CABO are frozen and protected!");
      setTimeout(() => setStickyWarning(null), 3500);
      return;
    }

    // 1. Give Card Resolution
    if (activeRes?.giver_id === myId && isMyCard) {
      actions.onGiveCard(cardId);
      return;
    }

    // 2. Discarding / Replacing
    if (actions.canDiscard && isMyCard) {
      actions.onReplaceCard(cardId);
      return;
    }

    // 3. Powers
    if (isPowerActive) {
      if (pendingAction === "look_self" && isMyCard) {
        actions.onPowerLook(cardId);
      } else if (pendingAction === "look_other" && !isMyCard) {
        actions.onPowerLook(cardId);
      } else if (pendingAction === "discard_self" && isMyCard) {
        actions.onPowerDiscard(cardId);
      } else if (pendingAction === "blind_swap") {
        if (powerTargets.length === 0) {
          setPowerTargets([cardId]);
        } else {
          const owner1 = getCardOwnerId(powerTargets[0]);
          const owner2 = getCardOwnerId(cardId);
          if (owner1 && owner2 && owner1 === owner2) {
            setStickyWarning("⚠️ Must swap cards between two DIFFERENT players!");
            setTimeout(() => setStickyWarning(null), 3500);
            return;
          }
          actions.onPowerSwap(powerTargets[0], cardId);
          setPowerTargets([]);
        }
      } else if (pendingAction === "look_and_swap") {
        if (!room.turn.first_swap_target) {
          actions.onPowerLook(cardId);
        } else {
          const owner1 = getCardOwnerId(room.turn.first_swap_target);
          const owner2 = getCardOwnerId(cardId);
          if (owner1 && owner2 && owner1 === owner2) {
            setStickyWarning("⚠️ Must swap cards between two DIFFERENT players!");
            setTimeout(() => setStickyWarning(null), 3500);
            return;
          }
          actions.onPowerSwap(room.turn.first_swap_target, cardId);
        }
      }
      return;
    }

    // 4. Sticky (Enabled during playing & cabo_round)
    const canSticky = (room.phase === "playing" || room.phase === "cabo_round") && !activeRes && room.discard_pile.length > 0;
    if (canSticky) {
      actions.onSticky(cardId);
    }
  };

  const getCardClickable = (isMyCard: boolean) => {
    const activeRes = room.active_resolutions?.[0];
    if (activeRes?.giver_id === myId) return isMyCard;
    if (actions.canDiscard) return isMyCard;

    const isPowerActive = isMyTurn && ["look_self", "look_other", "blind_swap", "look_and_swap", "discard_self"].includes(pendingAction);
    if (isPowerActive) {
      if (pendingAction === "look_self") return isMyCard;
      if (pendingAction === "look_other") return !isMyCard;
      if (pendingAction === "discard_self") return isMyCard;
      if (pendingAction === "blind_swap") return true;
      if (pendingAction === "look_and_swap") return true;
    }

    const canSticky = (room.phase === "playing" || room.phase === "cabo_round") && !activeRes && room.discard_pile.length > 0;
    return canSticky;
  };

  const combinedGlows: Record<string, boolean> = { ...glowingCards };
  if (room.turn.first_swap_target) {
    combinedGlows[room.turn.first_swap_target] = true;
  }
  for (const targetId of powerTargets) {
    combinedGlows[targetId] = true;
  }

  const props = { others, me, room, myId, currentTurnId, discardTop, actions, handleCardClick, getCardClickable, glowingCards: combinedGlows };

  return (
    <>
      <ActionToast log={room.last_action_log} />
      <WarningToast message={stickyWarning} onClose={() => setStickyWarning(null)} />
      <PeekingBanner peekEndTime={room.peek_end_time} />
      <PowerBanner room={room} myId={myId} powerTargets={powerTargets} onSkip={async () => {
        if (!id || !myId || busy) return;
        setBusy(true);
        setPowerTargets([]);
        try {
          await endTurn(id, myId);
        } catch (e) { console.error("Skip power failed", e); }
        setBusy(false);
      }} />
      {room.active_resolutions?.length > 0 && (
        <StickyResolutionBanner resolution={room.active_resolutions[0]} players={room.players} myId={myId} />
      )}
      {room.phase === "peeking" && <PeekTimer endTime={room.peek_end_time} />}
      {room.phase === "cabo_round" && <CaboRoundBanner />}
      {room.phase === "finished" && <GameOverBanner room={room} />}
      {showScorecard && <ScorecardModal room={room} myId={myId} actions={actions} onClose={() => setShowScorecard(false)} />}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {/* Choice Modal for non-participants joining mid-game */}
      {!me && spectateChoice === null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl gold-card-border bg-[#0a162b]/95 p-6 sm:p-8 shadow-[0_12px_60px_rgba(0,0,0,0.7)] animate-card-deal text-center">
            <span className="text-4xl">🎴</span>
            <h2 className="mt-3 text-xl sm:text-2xl font-black tracking-wider text-gold-metallic font-sans">
              Game in Progress
            </h2>
            <p className="mt-2 text-xs text-slate-300">
              Room #{id} ({room.players.length}/{room.max_players} Players)
            </p>

            <div className="mt-6 space-y-3">
              {room.players.length < room.max_players ? (
                <button
                  onClick={() => handleJoinForNextRound()}
                  className="w-full rounded-2xl btn-gold-metallic py-3.5 px-4 text-xs font-extrabold uppercase tracking-wider transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🎮 Play Next Round</span>
                </button>
              ) : (
                <div className="rounded-2xl border border-amber-900/40 bg-amber-950/30 p-3 text-xs font-bold text-amber-300">
                  Room is Full ({room.players.length}/{room.max_players})
                </div>
              )}

              <button
                onClick={() => setSpectateChoice("watch")}
                className="w-full rounded-2xl border border-amber-500/40 bg-[#112240] py-3.5 px-4 text-xs font-extrabold uppercase tracking-wider text-amber-200 hover:bg-[#1a2f54] hover:text-white transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>👁️ Watch (Spectate)</span>
              </button>

              <button
                onClick={() => (window.location.href = "/")}
                className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 py-3 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition cursor-pointer"
              >
                🚪 Exit Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name Input Modal if user clicked Play Next Round but has no stored name */}
      {showNameModal && !me && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl gold-card-border bg-[#0a162b]/95 p-6 sm:p-8 shadow-[0_12px_60px_rgba(0,0,0,0.7)] animate-card-deal">
            <div className="text-center mb-6">
              <span className="text-3xl">🃏</span>
              <h2 className="mt-2 text-xl font-black tracking-wider text-gold-metallic font-sans">
                Enter Your Name
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Join Room #{id} for the Next Round
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
                  if (e.key === "Enter") handleJoinForNextRound(joinNameInput);
                }}
                placeholder="Enter your name (max 10 chars)"
                className="w-full rounded-2xl border border-amber-500/30 bg-[#060e1a]/90 px-4 py-3.5 text-center text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30"
              />

              {joinError && (
                <p className="text-xs font-semibold text-rose-400 bg-rose-950/50 p-2.5 rounded-xl border border-rose-900/50 text-center">
                  {joinError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleJoinForNextRound(joinNameInput)}
                  disabled={!joinNameInput.trim() || isJoining}
                  className="flex-1 rounded-2xl btn-gold-metallic py-3 text-xs font-extrabold uppercase tracking-wider transition disabled:opacity-40 cursor-pointer"
                >
                  {isJoining ? "Joining..." : "Join Game"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin End Game Confirmation Modal */}
      {showEndGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl gold-card-border bg-[#0a162b]/95 p-6 sm:p-8 shadow-[0_12px_60px_rgba(0,0,0,0.7)] animate-card-deal text-center border border-rose-900/40">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-950/60 border border-rose-600/40 flex items-center justify-center text-3xl shadow-lg">
              👑
            </div>

            <h2 className="mt-4 text-xl sm:text-2xl font-black tracking-wider text-rose-400 font-sans">
              End Game for Everyone?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              As Room Admin, ending <strong className="text-amber-400">Room #{id}</strong> will terminate the match for all connected players and return everyone to the main menu.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={async () => {
                  if (!id) return;
                  try {
                    await destroyRoom(id);
                  } catch (e) {
                    console.error("End game failed", e);
                  }
                  forgetPlayer(id);
                  window.location.href = "/";
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-rose-700 hover:bg-rose-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-rose-950/50 transition hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>💀 Yes, End Game</span>
              </button>

              <button
                onClick={() => setShowEndGameModal(false)}
                className="w-full py-3 px-4 rounded-2xl border border-slate-700/60 bg-slate-900/80 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                Cancel & Continue Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spectator Top Action Bar */}
      {!me && spectateChoice === "watch" && (
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={() => (window.location.href = "/")}
            className="px-4 py-2.5 rounded-xl btn-gold-metallic text-xs font-extrabold uppercase tracking-wider shadow-xl flex items-center gap-1.5 cursor-pointer"
          >
            <span>🚪 Exit Room</span>
          </button>
        </div>
      )}

      {/* Sitting Out Banner & Ready Button for Mid-Game Joiners */}
      {me && isSittingOut && room.phase !== "finished" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md rounded-2xl gold-card-border bg-[#0a162b]/95 p-4 text-center shadow-2xl backdrop-blur-md border border-amber-500/40">
          <p className="text-xs font-extrabold text-gold-metallic font-sans uppercase tracking-wide">
            You are Sitting Out this Round!
          </p>
          <p className="mt-1 text-[11px] text-slate-300">
            Click <strong className="text-amber-400">Ready</strong> to join when the next round starts.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={actions.onToggleReady}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ${
                me.is_ready
                  ? "bg-[#112240] text-amber-300 border border-amber-500/50 shadow"
                  : "btn-gold-metallic animate-bounce"
              }`}
            >
              {me.is_ready ? "✓ Ready for Next Round" : "Ready Up for Next Round!"}
            </button>
            <button
              onClick={actions.onExitGame}
              className="py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              Exit Room
            </button>
          </div>
        </div>
      )}

      {roomClosed && id && <RoomClosedModal id={id} />}
      <RulesButton onClick={() => setShowRules(true)} />
      {isMobile ? <MobileLayout {...props} /> : <DesktopLayout {...props} />}
    </>
  );
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center px-6 py-12">
      {children}
    </main>
  );
}

export default function Game() {
  return (
    <Suspense>
      <GameTable />
    </Suspense>
  );
}

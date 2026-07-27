"use client";
import { Suspense, useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  getRememberedPlayer,
  getRoom,
  drawFromDeck,
  drawFromDiscard,
  discardPicked,
  replaceCard,
  endTurn,
  callCabo,
  startGame,
  stickyCard,
  giveCard,
  powerLook,
  powerSwap,
  powerDiscard,
} from "@/shared/api";
import { suitSymbol } from "@/shared/game/cards";
import type { ApiCard, ApiPlayer, ApiRoomState, ApiStickyResolution } from "@/shared/types";

/* ─────────────────────── Responsive hook ─────────────────────── */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function check() {
      setIsMobile(window.innerHeight < 500);
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
  onToggleScorecard: () => void;
  onSticky: (cardId: string) => void;
  onGiveCard: (cardId: string) => void;
  onPowerLook: (cardId: string) => void;
  onPowerSwap: (card1Id: string, card2Id: string) => void;
  onPowerDiscard: (cardId: string) => void;
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
  size?: "sm" | "md" | "lg";
  compact?: boolean;
  onClick?: () => void;
  clickable?: boolean;
  index?: number;
  isGlowing?: boolean;
}) {
  const DIMS: Record<string, { w: number; h: number; corner: number; center: number }> = compact
    ? {
        sm: { w: 40, h: 56, corner: 6, center: 14 },
        md: { w: 56, h: 78, corner: 8, center: 18 },
        lg: { w: 68, h: 96, corner: 10, center: 22 },
      }
    : {
        sm: { w: 56, h: 78, corner: 8, center: 18 },
        md: { w: 80, h: 112, corner: 11, center: 26 },
        lg: { w: 96, h: 134, corner: 13, center: 32 },
      };
  const d = DIMS[size] ?? DIMS.md;
  const radius = compact ? 5 : 10;
  const cursorClass = clickable ? "cursor-pointer ring-2 ring-amber-400/70 hover:ring-amber-300 hover:scale-105 transition-transform" : "";
  const glowClass = isGlowing ? "animate-card-glow" : "";

  if (!card) {
    return (
      <div
        className={`card-shadow card-back-pattern animate-card-deal card-interactive relative flex items-center justify-center transition-all duration-500 ${cursorClass} ${glowClass}`}
        style={{ width: d.w, height: d.h, borderRadius: radius }}
        onClick={clickable ? onClick : undefined}
      >
        {index !== undefined && (
          <div className="absolute -top-1 -right-1 bg-slate-900/90 text-white font-bold rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center shadow z-10 text-[7px] sm:text-[8px] border border-white/10">
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
        <div className="absolute -top-1 -right-1 bg-slate-900/90 text-white font-bold rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center shadow-lg z-10 text-[7px] sm:text-[8px] border border-white/10">
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
  cardSize?: "sm" | "md" | "lg";
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

  let colsClass = "grid-cols-2";
  if (layout !== "row") {
    const numCols = Math.max(2, Math.ceil(cards.length / 2));
    if (numCols === 3) colsClass = "grid-cols-3";
    else if (numCols === 4) colsClass = "grid-cols-4";
    else if (numCols >= 5) colsClass = "grid-cols-5";
  }
  const cardGrid = layout === "row" ? `flex ${gap}` : `grid ${colsClass} ${gap}`;

  const currentRoundSum = cards.reduce((sum, c) => sum + getCardValue(c), 0);

  return (
    <div
      className={`glass-panel flex flex-col items-center ${compact ? "gap-0.5" : "gap-1"} rounded-xl ${pad} transition-all ${
        isTurn ? "animate-turn-pulse border border-amber-400/60" : "border border-transparent"
      } ${isDisconnected ? "opacity-50" : ""}`}
    >
      <div className={cardGrid}>
        {cards.map((c, i) => {
          if (c === null) {
            // Render an empty dashed slot matching exact card dimensions
            const DIMS: Record<string, { w: number; h: number }> = compact
              ? { sm: { w: 40, h: 56 }, md: { w: 56, h: 78 }, lg: { w: 68, h: 96 } }
              : { sm: { w: 56, h: 78 }, md: { w: 80, h: 112 }, lg: { w: 96, h: 134 } };
            const d = DIMS[cardSize] ?? DIMS.md;

            return (
              <div
                key={i}
                className="border-2 border-dashed border-slate-600/30 rounded-xl relative flex items-center justify-center opacity-50"
                style={{ width: d.w, height: d.h, borderRadius: compact ? 5 : 10 }}
              >
                <span className="text-slate-500 font-bold text-[9px] uppercase tracking-widest">Empty</span>
                <div className="absolute -top-1 -right-1 bg-slate-800/80 text-slate-400 font-bold rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center text-[7px] sm:text-[8px] border border-white/5">
                  {i + 1}
                </div>
              </div>
            );
          }

          const isRevealed = c.reveal_end_time ? c.reveal_end_time > now : false;
          const faceUp = isFinished || (myId ? c.visible_to.includes(myId) : false) || isRevealed;

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

      <div className="flex items-center justify-center flex-wrap gap-1">
        <span
          className={`truncate leading-none ${isYou ? "text-amber-400 font-bold" : "text-slate-300"}`}
          style={{ fontSize: compact ? 7 : isYou ? 11 : 9 }}
        >
          {isYou ? "You" : player.name}
        </span>
        {player.is_admin && (
          <span className="shrink-0 rounded-full bg-indigo-500/80 px-1 py-px text-[5px] uppercase tracking-wider text-white">
            Admin
          </span>
        )}
        {isCabo && (
          <span className="shrink-0 rounded-full bg-amber-500/80 px-1 py-px text-[5px] uppercase tracking-wider text-white animate-glow-pulse">
            Cabo
          </span>
        )}
        {isTurn && !isFinished && (
          <span className="shrink-0 rounded-full bg-emerald-500/80 px-1 py-px text-[5px] uppercase tracking-wider text-white">
            Turn
          </span>
        )}
        {isDisconnected && (
          <span className="shrink-0 rounded-full bg-slate-500/80 px-1 py-px text-[5px] uppercase tracking-wider text-white">
            Away
          </span>
        )}
        {isFinished && (
          <span className="shrink-0 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[7px] sm:text-[9px] font-extrabold text-white shadow shadow-emerald-900/50 border border-emerald-300/40">
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

function NextRoundButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${compact ? "px-3 py-1 text-[8px]" : "px-5 py-2 text-xs"} font-extrabold uppercase tracking-wider rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all animate-bounce`}
    >
      Play Next Round &rarr;
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
      <div className="glass-panel px-4 py-1.5 rounded-full border border-emerald-500/60 bg-emerald-950/40 shadow-lg flex items-center gap-2">
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400">
          Round {room.round_number ?? 1} Finished! Leader: {winner ? `${winner.name} (${winner.score} pts)` : "N/A"}
        </span>
      </div>
    </div>
  );
}

function ScorecardModal({
  room,
  onClose,
}: {
  room: ApiRoomState;
  onClose: () => void;
}) {
  const sortedPlayers = [...room.players].sort((a, b) => a.score - b.score);
  const leader = sortedPlayers[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md p-5 rounded-3xl border border-amber-500/50 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-amber-400">Score</span>
            <div>
              <h2 className="text-base font-black text-amber-400 uppercase tracking-wider leading-none">
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
                    <span className="text-[7px] bg-indigo-500/80 px-1 py-px rounded-full uppercase text-white font-bold">
                      Admin
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {p.round_score !== undefined && room.phase === "finished" && (
                    <span className="text-[10px] text-slate-400">
                      (+{p.round_score})
                    </span>
                  )}
                  <span className="text-sm font-black text-emerald-400">
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
              <span className="font-bold text-emerald-400">1 pt</span>
            </div>
            <div className="bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/40 flex justify-between">
              <span>2 - 10</span>
              <span className="font-bold text-emerald-400">Face Value</span>
            </div>
            <div className="bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/40 flex justify-between">
              <span>Jack (J)</span>
              <span className="font-bold text-emerald-400">11 pts</span>
            </div>
            <div className="bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/40 flex justify-between">
              <span>Queen (Q)</span>
              <span className="font-bold text-emerald-400">12 pts</span>
            </div>
            <div className="bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/40 flex justify-between col-span-2">
              <span>King (K)</span>
              <span className="font-bold text-emerald-400">13 pts</span>
            </div>
          </div>
        </div>
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

type SeatId = "top-left" | "top-center" | "top-right" | "mid-left" | "mid-right";

const SEAT_STYLES: Record<SeatId, React.CSSProperties> = {
  "top-left":   { position: "absolute", top: "4%",  left: "10%" },
  "top-center": { position: "absolute", top: "2%",  left: "50%",  transform: "translateX(-50%)" },
  "top-right":  { position: "absolute", top: "4%",  right: "10%" },
  "mid-left":   { position: "absolute", top: "48%", left: "2%" },
  "mid-right":  { position: "absolute", top: "48%", right: "2%" },
};

const SEAT_ASSIGNMENTS: Record<number, SeatId[]> = {
  1: ["mid-left"],
  2: ["mid-left", "mid-right"],
  3: ["mid-left", "top-left", "top-right"],
  4: ["mid-left", "top-left", "top-right", "mid-right"],
  5: ["mid-left", "top-left", "top-center", "top-right", "mid-right"],
};

/* ──────────────────── Mobile Layout ──────────────────── */

const MOBILE_SEAT_STYLES: Record<SeatId, React.CSSProperties> = {
  "top-left":   { position: "absolute", top: "4%",  left: "5%" },
  "top-center": { position: "absolute", top: "2%",  left: "50%",  transform: "translateX(-50%)" },
  "top-right":  { position: "absolute", top: "4%",  right: "5%" },
  "mid-left":   { position: "absolute", top: "48%", left: "1%" },
  "mid-right":  { position: "absolute", top: "48%", right: "1%" },
};

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
  const opponentCount = Math.min(others.length, 5);
  const seats = SEAT_ASSIGNMENTS[opponentCount] ?? SEAT_ASSIGNMENTS[5]!;
  const hasTopCenter = seats.includes("top-center");

  return (
    <main className="relative z-10 w-full h-[calc(100dvh-56px)] overflow-hidden">
      {/* Top Left: Scorecard (i) Button */}
      <div className="absolute top-1 left-2 z-30">
        <ScorecardButton onClick={actions.onToggleScorecard} />
      </div>

      {/* Room badge centered in header */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20">
        <div className="glass-panel px-2.5 py-0.5 rounded-full border border-slate-700/50">
          <p className="text-center text-[7px] uppercase tracking-wider text-slate-300">
            Room {room.room_id} · R{room.round_number ?? 1}
          </p>
        </div>
      </div>

      {/* Top Right: Next Round / Call Cabo Button */}
      <div className="absolute top-1 right-2 z-40 flex flex-col items-end gap-2">
        {room.phase === "finished" && (
          <NextRoundButton onClick={actions.onStartNextRound} compact />
        )}
        {me && actions.canCallCabo && (
          <CaboButton onClick={actions.onCallCabo} compact />
        )}
      </div>

      {/* Opponents in their seats */}
      {others.map((p, i) => {
        const seatId = seats[i];
        if (!seatId) return null;
        const style = MOBILE_SEAT_STYLES[seatId];
        
        return (
          <div key={p.id} style={style} className="z-10">
            <Hand
              player={p}
              cards={room.hands[p.id] ?? []}
              myId={myId}
              isTurn={p.id === currentTurnId}
              isYou={false}
              cardSize="sm"
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
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-500">
          <div className="glass-panel bg-slate-900/80 border border-slate-700/60 shadow-xl rounded-2xl p-2 flex items-center gap-5">
            {/* Deck */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="animate-float">
                <CardView card={null} size="md" compact clickable={actions.canDraw} onClick={actions.onDrawDeck} />
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
                <CardView card={discardTop} size="md" compact clickable={actions.canDraw && room.discard_pile.length > 0} onClick={actions.onDrawDiscard} isGlowing={glowingCards[discardTop.id]} />
              ) : (
                <div
                  className="flex items-center justify-center border border-dashed border-slate-600/60 text-[6px] font-bold uppercase text-slate-500 rounded-lg"
                  style={{ width: 56, height: 78 }}
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
            cardSize="lg"
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
  const opponentCount = Math.min(others.length, 5);
  const seats = SEAT_ASSIGNMENTS[opponentCount] ?? SEAT_ASSIGNMENTS[5]!;
  const hasTopCenter = seats.includes("top-center");

  return (
    <main className="relative z-10 w-full h-[calc(100dvh-64px)] overflow-hidden flex justify-center">
      {/* Top Left: Scorecard (i) Button - anchored to the screen edge */}
      <div className="absolute top-4 left-6 z-40">
        <ScorecardButton onClick={actions.onToggleScorecard} />
      </div>

      {/* Top Right: Next Round / Call Cabo Button - anchored to the screen edge */}
      <div className="absolute top-4 right-6 z-40 flex flex-col items-end gap-2">
        {room.phase === "finished" && (
          <NextRoundButton onClick={actions.onStartNextRound} />
        )}
        {me && actions.canCallCabo && (
          <CaboButton onClick={actions.onCallCabo} />
        )}
      </div>

      {/* Container constrained to max-w-5xl for tight, responsive laptop layout */}
      <div className="relative w-full max-w-5xl h-full">
        {/* Room Badge centered in header */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="glass-panel px-4 py-1 rounded-full border border-slate-700/50">
            <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              Room {room.room_id} · Round {room.round_number ?? 1} · {room.phase}
            </p>
          </div>
        </div>

        {/* Opponents */}
        {others.map((p, i) => {
          const seatId = seats[i];
          if (!seatId) return null;
          return (
            <div key={p.id} style={SEAT_STYLES[seatId]} className="z-10">
              <Hand
                player={p}
                cards={room.hands[p.id] ?? []}
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
          <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-500">
            <div className="glass-panel bg-slate-900/85 border border-slate-700/60 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-3xl px-6 py-3.5 flex items-center gap-8">
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

/* ─────────────────────────── Power Banner ─────────────────────────── */

function PowerBanner({ room, myId, powerTargets }: { room: ApiRoomState; myId: string | null; powerTargets: string[] }) {
    if (!myId || room.current_turn !== room.players.findIndex(p => p.id === myId)) return null;
    const pa = room.turn.pending_action;
    if (!["look_self", "look_other", "blind_swap", "look_and_swap", "discard_self"].includes(pa)) return null;

    let msg = "";
    if (pa === "look_self") msg = "POWER (7/8): Peek at one of your own cards!";
    else if (pa === "look_other") msg = "POWER (9/10): Peek at one opponent's card!";
    else if (pa === "discard_self") msg = "POWER (K): Select one of your cards to trash!";
    else if (pa === "blind_swap") {
        if (powerTargets.length === 0) msg = "POWER (J): Select a card (yours or opponent's) to swap!";
        else msg = "POWER (J): Select the other card to swap with!";
    }
    else if (pa === "look_and_swap") {
        if (!room.turn.first_swap_target) msg = "POWER (Q): Select an opponent's card to peek at!";
        else msg = "POWER (Q): Decide! Select one of your cards to swap it with.";
    }

    return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 w-full max-w-sm">
      <div className="bg-purple-900/90 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-2xl shadow-purple-900/50 border border-purple-400 text-center text-sm font-bold animate-pulse">
        {msg}
      </div>
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
  const [powerTargets, setPowerTargets] = useState<string[]>([]);
  
  const previousHands = useRef<Record<string, string[]>>({});
  const [glowingCards, setGlowingCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function poll() {
      try {
        const data = await getRoom(id);
        if (!cancelled) setRoom(data);
      } catch (err: any) {
        if (err.message && err.message.includes("404")) {
          alert("Room not found or the game has ended.");
          window.location.href = "/";
          return;
        }
        // transient error; next tick retries
      }
    }

    poll();
    const timer = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
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

  /** Refresh room state immediately after an action. */
  const refresh = useCallback(async () => {
    try {
      const data = await getRoom(id);
      setRoom(data);
    } catch { /* will catch up on next poll */ }
  }, [id]);

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

  const myName = getRememberedPlayer(id)?.name ?? null;
  const me = room.players.find((p) => p.name === myName) || null;
  const myId = me?.id ?? null;
  const others = room.players.filter((p) => p.id !== myId);
  const currentTurnId = room.players[room.current_turn]?.id ?? null;
  const discardTop =
    room.discard_pile.length > 0
      ? room.discard_pile[room.discard_pile.length - 1]
      : null;

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
        await refresh();
      } catch (e) { console.error("Draw deck failed", e); }
      setBusy(false);
    },

    onDrawDiscard: async () => {
      if (!myId || busy) return;
      setBusy(true);
      try {
        await drawFromDiscard(id, myId);
        await refresh();
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
        await refresh();
      } catch (e) { console.error("Discard failed", e); }
      setBusy(false);
    },

    onReplaceCard: async (cardId: string) => {
      if (!myId || busy) return;
      setBusy(true);
      try {
        await replaceCard(id, myId, cardId);
        await endTurn(id, myId);
        await refresh();
      } catch (e) { console.error("Replace card failed", e); }
      setBusy(false);
    },

    onCallCabo: async () => {
      if (!myId || busy) return;
      setBusy(true);
      try {
        await callCabo(id, myId);
        await refresh();
      } catch (e) { console.error("Call Cabo failed", e); }
      setBusy(false);
    },

    onSticky: async (cardId: string) => {
      // Third-party sticky check is fine on backend. We only block local abuse for myHand.
      // But actually if they sticky someone else's hand, they shouldn't be blocked by this.
      // Let's just remove the frontend block for third party, or apply it to their OWN hand length.
      if (!myId) return;
      const myHand = room.hands[myId] ?? [];
      const validCardsCount = myHand.filter(c => c !== null).length;
      if (validCardsCount >= 8) {
        console.warn("Cannot sticky with 8 or more cards");
        return;
      }
      
      if (!id || busy) return;
      setBusy(true);
      try {
        await stickyCard(id, myId, cardId);
        await refresh();
      } catch (e) { console.error("Sticky failed", e); }
      setBusy(false);
    },

    onGiveCard: async (cardId: string) => {
      if (!id || !myId || busy) return;
      setBusy(true);
      try {
        await giveCard(id, myId, cardId);
        await refresh();
      } catch (e) { console.error("Give card failed", e); }
      setBusy(false);
    },

    onPowerLook: async (cardId: string) => {
      if (!id || !myId || busy) return;
      setBusy(true);
      try {
        await powerLook(id, myId, cardId);
        await refresh();
      } catch (e) { console.error("Power look failed", e); }
      setBusy(false);
    },

    onPowerSwap: async (card1Id: string, card2Id: string) => {
      if (!id || !myId || busy) return;
      setBusy(true);
      try {
        await powerSwap(id, myId, card1Id, card2Id);
        await refresh();
      } catch (e) { console.error("Power swap failed", e); }
      setBusy(false);
    },

    onPowerDiscard: async (cardId: string) => {
      if (!id || !myId || busy) return;
      setBusy(true);
      try {
        await powerDiscard(id, myId, cardId);
        await refresh();
      } catch (e) { console.error("Power discard failed", e); }
      setBusy(false);
    },

    onStartNextRound: async () => {
      if (!id || busy) return;
      setBusy(true);
      try {
        await startGame(id);
        await refresh();
      } catch (e) { console.error("Start next round failed", e); }
      setBusy(false);
    },

    onToggleScorecard: () => {
      setShowScorecard((prev) => !prev);
    },
  };

  const handleCardClick = (cardId: string, isMyCard: boolean) => {
    const activeRes = room.active_resolutions?.[0];
    const isPowerActive = isMyTurn && ["look_self", "look_other", "blind_swap", "look_and_swap", "discard_self"].includes(pendingAction);

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
      } else if (pendingAction === "blind_swap" && !isMyCard) {
        if (powerTargets.length === 0) {
            setPowerTargets([cardId]);
        } else {
            actions.onPowerSwap(powerTargets[0], cardId);
            setPowerTargets([]);
        }
      } else if (pendingAction === "look_and_swap" && !isMyCard) {
        if (!room.turn.first_swap_target) {
            actions.onPowerLook(cardId);
        } else {
            actions.onPowerSwap(room.turn.first_swap_target, cardId);
        }
      }
      return;
    }

    // 4. Sticky
    const canSticky = room.phase === "playing" && !activeRes && room.discard_pile.length > 0;
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
      if (pendingAction === "blind_swap") return !isMyCard;
      if (pendingAction === "look_and_swap") return !isMyCard;
    }

    const canSticky = room.phase === "playing" && !activeRes && room.discard_pile.length > 0;
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
      <PowerBanner room={room} myId={myId} powerTargets={powerTargets} />
      {room.active_resolutions?.length > 0 && (
        <StickyResolutionBanner resolution={room.active_resolutions[0]} players={room.players} myId={myId} />
      )}
      {room.phase === "peeking" && <PeekTimer endTime={room.peek_end_time} />}
      {room.phase === "cabo_round" && <CaboRoundBanner />}
      {room.phase === "finished" && <GameOverBanner room={room} />}
      {showScorecard && <ScorecardModal room={room} onClose={() => setShowScorecard(false)} />}
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

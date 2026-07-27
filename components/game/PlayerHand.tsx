import type { Card } from "@/shared/game/cards";
import type { PublicPlayer } from "@/shared/game/types";
import PlayingCard from "./PlayingCard";

type Props = {
  player: PublicPlayer;
  isYou: boolean;
  isCurrentTurn: boolean;
  calledCabo: boolean;
  /** Faces this client may currently see, keyed by card index. */
  revealedByIndex?: Record<number, Card>;
  /** Whether each card slot is selectable, and the click handler. */
  selectableIndex?: (index: number) => boolean;
  selectedIndex?: number | null;
  onCardClick?: (index: number) => void;
  size?: "sm" | "md" | "lg";
};

export default function PlayerHand({
  player,
  isYou,
  isCurrentTurn,
  calledCabo,
  revealedByIndex = {},
  selectableIndex,
  selectedIndex = null,
  onCardClick,
  size = "md",
}: Props) {
  return (
    <div
      className={`glass-panel flex flex-col items-center gap-2 rounded-2xl border p-3 sm:p-4 transition-all duration-300 ${
        isCurrentTurn
          ? "animate-turn-pulse border-amber-400/50"
          : "border-white/5"
      } ${!player.connected ? "opacity-50" : ""}`}
    >
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: player.cardCount }, (_, i) => {
          const face = revealedByIndex[i] ?? player.knownCards[i] ?? null;
          return (
            <PlayingCard
              key={i}
              card={face}
              size={size}
              selectable={selectableIndex?.(i) ?? false}
              selected={selectedIndex === i}
              onClick={() => onCardClick?.(i)}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 mt-1">
        <span className={`text-[10px] leading-none ${isYou ? "text-amber-300" : "text-slate-300"}`}>
          {isYou ? "You" : player.name}
        </span>
        {player.admin && (
          <span className="rounded-full bg-indigo-500/80 px-1.5 py-0.5 text-[7px] uppercase tracking-wider text-white">
            Admin
          </span>
        )}
        {calledCabo && (
          <span className="rounded-full bg-amber-500/80 px-1.5 py-0.5 text-[7px] uppercase tracking-wider text-white animate-glow-pulse">
            Cabo
          </span>
        )}
        {!player.connected && (
          <span className="rounded-full bg-slate-500/80 px-1.5 py-0.5 text-[7px] uppercase tracking-wider text-white">
            Away
          </span>
        )}
      </div>
    </div>
  );
}

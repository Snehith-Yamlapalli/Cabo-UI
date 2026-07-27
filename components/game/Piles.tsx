import type { Card } from "@/shared/game/cards";
import PlayingCard from "./PlayingCard";

type Props = {
  deckCount: number;
  discardTop: Card | null;
  /** The card you just drew (only shown to the drawer), or null. */
  drawnCard?: Card | null;
  canDrawDeck?: boolean;
  canDrawDiscard?: boolean;
  onDrawDeck?: () => void;
  onDrawDiscard?: () => void;
};

export default function Piles({
  deckCount,
  discardTop,
  drawnCard = null,
  canDrawDeck = false,
  canDrawDiscard = false,
  onDrawDeck,
  onDrawDiscard,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-10 sm:gap-14">
      {/* Draw pile */}
      <div className="flex flex-col items-center gap-2">
        <div className="animate-float">
          <PlayingCard
            card={null}
            selectable={canDrawDeck}
            onClick={onDrawDeck}
            size="md"
          />
        </div>
        <span className="text-[10px] text-[#94a3b8]">Deck · {deckCount}</span>
      </div>

      {/* Drawn card (centerpiece while choosing) */}
      {drawnCard && (
        <div className="flex flex-col items-center gap-2">
          <div className="scale-110 shadow-lg shadow-indigo-500/20 rounded-[10px]">
            <PlayingCard card={drawnCard} size="md" />
          </div>
          <span className="text-[10px] text-indigo-300">Drawn</span>
        </div>
      )}

      {/* Discard pile */}
      <div className="flex flex-col items-center gap-2">
        {discardTop ? (
          <PlayingCard
            card={discardTop}
            selectable={canDrawDiscard}
            onClick={onDrawDiscard}
            size="md"
          />
        ) : (
          <div 
            style={{ width: 90, height: 126, borderRadius: '10px' }}
            className="flex items-center justify-center border border-dashed border-white/20 text-[10px] text-white/30"
          >
            empty
          </div>
        )}
        <span className="text-[10px] text-[#94a3b8]">Discard</span>
      </div>
    </div>
  );
}

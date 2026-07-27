// Pure card helpers for Cabo. The server is the source of truth for game
// outcomes; these helpers are for rendering and optimistic UI only.

export type Suit = "club" | "spade" | "heart" | "diamond";

// 1 = Ace, 11 = Jack, 12 = Queen, 13 = King.
export type Rank =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13;

export type Card = {
  rank: Rank;
  suit: Suit;
};

/** The power a drawn card grants, per the house rules. Low cards (1-6) have none. */
export type PowerType =
  | "peek-self" // 7 or 8  -> view one of your own cards
  | "peek-other" // 9 or 10 -> peek one of another player's cards
  | "blind-swap" // Jack    -> swap any two cards, no looking
  | "look-swap" // Queen   -> swap any two cards, may look
  | "discard-self"; // King -> discard any one of your own cards

/** Score value of a card. Ace=1, numbers face value, J=11, Q=12, K=13. */
export function cardValue(card: Card): number {
  return card.rank;
}

/** Cards 7 through King carry a power. */
export function isPowerCard(card: Card): boolean {
  return card.rank >= 7;
}

/** Maps a card to its power, or null for low cards (1-6). */
export function powerOf(card: Card): PowerType | null {
  switch (card.rank) {
    case 7:
    case 8:
      return "peek-self";
    case 9:
    case 10:
      return "peek-other";
    case 11:
      return "blind-swap";
    case 12:
      return "look-swap";
    case 13:
      return "discard-self";
    default:
      return null;
  }
}

const RANK_LABELS: Record<Rank, string> = {
  1: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  club: "♣",
  spade: "♠",
  heart: "♥",
  diamond: "♦",
};

export function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank];
}

export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit];
}

export function isRed(suit: Suit): boolean {
  return suit === "heart" || suit === "diamond";
}

/** Human label for a power, used in prompts. */
export function powerLabel(power: PowerType): string {
  switch (power) {
    case "peek-self":
      return "Peek at one of your cards";
    case "peek-other":
      return "Peek at another player's card";
    case "blind-swap":
      return "Blind swap two cards";
    case "look-swap":
      return "Look & swap two cards";
    case "discard-self":
      return "Discard one of your cards";
  }
}

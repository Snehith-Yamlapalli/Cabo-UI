// Game-state model + WebSocket event protocol shared between the UI and the
// Python (python-socketio) backend. The backend is authoritative; the client
// renders the sanitized state it receives and emits player intents.

import type { Card } from "./cards";

/** Coarse game phase that drives which actions the UI offers. */
export type GamePhase =
  | "lobby" // waiting in the room before start
  | "initial-peek" // one-time look at your bottom two cards
  | "turn" // current player must draw
  | "choosing" // current player drew and must resolve (replace/discard/power)
  | "power" // current player is resolving a power card
  | "sticky" // a sticky-match window is open
  | "cabo-final" // Cabo called; everyone gets one last turn
  | "over"; // game finished

/** Points to a specific card in a specific player's hand. */
export type CardRef = {
  playerId: string;
  index: number;
};

/**
 * A player as seen by the receiving client. Hidden cards are `null`;
 * cards this client is allowed to see (own peeked cards, temporarily
 * revealed cards) carry the actual `Card`.
 */
export type PublicPlayer = {
  id: string;
  name: string;
  admin: boolean;
  seat: number;
  cardCount: number;
  /** length === cardCount; null === face-down/unknown to this client. */
  knownCards: (Card | null)[];
  connected: boolean;
};

/** The authoritative per-player snapshot pushed on every change. */
export type GameState = {
  roomCode: string;
  phase: GamePhase;
  players: PublicPlayer[];
  /** Top of the discard pile (face-up, public), or null if empty. */
  discardTop: Card | null;
  deckCount: number;
  currentTurnPlayerId: string | null;
  /** Set once someone calls Cabo. */
  caboCalledBy: string | null;
  /** The id of the client receiving this snapshot. */
  yourId: string;
  /** The card the receiving client just drew, if it is their turn to resolve. */
  yourDrawnCard: Card | null;
};

export type FinalScore = {
  playerId: string;
  name: string;
  score: number;
};

export type GameOver = {
  scores: FinalScore[];
  winnerId: string;
};

// --- WebSocket event maps ------------------------------------------------
// Used to type the Socket.IO client: Socket<ServerToClient, ClientToServer>.

export interface ServerToClient {
  /** Authoritative state snapshot for this client. */
  "game:state": (state: GameState) => void;
  /** Broadcast when the admin starts; all clients navigate to /Game. */
  "game:started": (payload: { roomCode: string }) => void;
  /** Your one-time peek at your bottom two cards. */
  "initial-peek": (payload: { cards: { index: number; card: Card }[] }) => void;
  /** Private: the card you drew this turn. */
  "turn:drawn": (payload: { card: Card }) => void;
  /** Private: result of a peek power. */
  "power:peek-result": (payload: CardRef & { card: Card }) => void;
  /** Game finished with scores. */
  "game:over": (payload: GameOver) => void;
  /** Recoverable error to surface to the user. */
  error: (payload: { code: string; message: string }) => void;
}

export interface ClientToServer {
  "game:join": (payload: {
    roomCode: string;
    name: string;
    playerId: string;
  }) => void;
  "game:start": (payload: { roomCode: string }) => void;
  "initial-peek:ack": () => void;
  "turn:draw": (payload: { source: "deck" | "discard" }) => void;
  "turn:resolve": (
    payload:
      | { action: "replace"; index: number }
      | { action: "discard" }
      | { action: "power" },
  ) => void;
  "power:peek-self": (payload: { index: number }) => void;
  "power:peek-other": (payload: CardRef) => void;
  "power:jack-swap": (payload: { a: CardRef; b: CardRef }) => void;
  "power:queen-peek": (payload: CardRef) => void;
  "power:queen-swap": (payload: { a: CardRef; b: CardRef }) => void;
  "power:queen-skip": () => void;
  "power:king-discard": (payload: { index: number }) => void;
  "sticky:match": (payload: {
    targets: CardRef[];
    replaceFromIndex?: number;
  }) => void;
  "cabo:call": () => void;
}

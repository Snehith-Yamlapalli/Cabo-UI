// Shared domain types for Cabo rooms.

// Game-play types live under shared/game; re-export for a single import surface.
export * from "./game/cards";
export * from "./game/types";

/** A single seat in a room. The creator of the room has `admin: true`. */
export type Player = {
  id?: string;
  name: string;
  admin: boolean;
};

/** Payload sent to the backend when creating a room. */
export type CreateRoomRequest = {
  name: string;
  noOfPlayers: number; // 3 - 8
  isAdmin: boolean; // always true for the creator
};

/** Payload sent to the backend when joining an existing room. */
export type JoinRoomRequest = {
  room_id: string;
  player_name: string;
};

/** Backend response for both create and join. */
export type RoomResponse = {
  room_id: string;
};

/** A player as returned by the backend room-state endpoint. */
export type ApiPlayer = {
  id: string;
  name: string;
  score: number;
  round_score: number;
  is_admin: boolean;
  is_ready?: boolean;
  called_cabo?: boolean;
};

export type ApiStickyResolution = {
  giver_id: string;
  receiver_id: string;
};

/** A card as the backend represents it. rank is a string: "A","2"..."10","J","Q","K". */
export type ApiCard = {
  id: string;
  rank: string;
  suit: "club" | "spade" | "heart" | "diamond";
  color: "red" | "black";
  /** Backend player ids allowed to see this card's face. */
  visible_to: string[];
  reveal_end_time?: number;
};

/** Full room state from GET /room/{room_id}. */
export type ApiRoomState = {
  room_id: string;
  max_players: number;
  phase: "lobby" | "peeking" | "playing" | "cabo_round" | "finished";
  round_number?: number;
  peek_end_time?: number;
  cabo_caller_index?: number | null;
  players: ApiPlayer[];
  /** Each player's hand, keyed by player id. Contains nulls for empty slots. */
  hands: Record<string, (ApiCard | null)[]>;
  draw_pile: ApiCard[];
  discard_pile: ApiCard[];
  /** Index into `players` whose turn it is. */
  current_turn: number;
  turn: {
    picked_card: ApiCard | null;
    first_swap_target: string | null;
    drawn_from: "deck" | "discard" | "none";
    pending_action: "none" | "draw" | "discard" | "look_self" | "look_other" | "blind_swap" | "look_and_swap" | "discard_self" | "sticky" | "finished";
    power_used: boolean;
  };
  active_resolutions: ApiStickyResolution[];
  last_action_log?: string;
  last_discard_was_sticky?: boolean;
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

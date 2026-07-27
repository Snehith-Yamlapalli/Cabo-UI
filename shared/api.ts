import type {
  ApiCard,
  ApiRoomState,
  CreateRoomRequest,
  JoinRoomRequest,
  Player,
  RoomResponse,
} from "./types";

// Backend base URL. Override with NEXT_PUBLIC_API_URL in .env.local.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function createRoom(req: CreateRoomRequest): Promise<RoomResponse> {
  return postJson<RoomResponse>("/room/create", req);
}

export function joinRoom(req: JoinRoomRequest): Promise<RoomResponse> {
  return postJson<RoomResponse>("/room/join", req);
}

/** Current room state — polled to render the live lobby. GET /room/{id}. */
export function getRoom(roomId: string): Promise<ApiRoomState> {
  return getJson<ApiRoomState>(`/room/${roomId}`);
}

/** Admin starts the game. POST /game/start. */
export function startGame(roomId: string): Promise<ApiRoomState> {
  return postJson<ApiRoomState>("/game/start", { room_id: roomId });
}

/** Draw the top card from the deck. */
export function drawFromDeck(roomId: string, playerId: string): Promise<ApiCard> {
  return postJson<ApiCard>("/game/draw/deck", { room_id: roomId, player_id: playerId });
}

/** Draw the top card from the discard pile. */
export function drawFromDiscard(roomId: string, playerId: string): Promise<ApiCard> {
  return postJson<ApiCard>("/game/draw/discard", { room_id: roomId, player_id: playerId });
}

/** Discard the currently picked card (throw it away). */
export function discardPicked(roomId: string, playerId: string): Promise<ApiRoomState> {
  return postJson<ApiRoomState>("/game/discard/picked", { room_id: roomId, player_id: playerId });
}

/** Swap the picked card with a card in your hand. */
export function replaceCard(roomId: string, playerId: string, cardId: string): Promise<ApiRoomState> {
  return postJson<ApiRoomState>("/game/discard", { room_id: roomId, player_id: playerId, card_id: cardId });
}

/** End the current turn, advancing to the next player. */
export function endTurn(roomId: string, playerId: string): Promise<ApiRoomState> {
  return postJson<ApiRoomState>("/game/turn/end", { room_id: roomId, player_id: playerId });
}

/** Call Cabo on your turn to initiate the final round. */
export function callCabo(roomId: string, playerId: string): Promise<ApiRoomState> {
  return postJson<ApiRoomState>("/game/cabo", { room_id: roomId, player_id: playerId });
}

/** Sticky a card (match the discard pile out of turn). */
export function stickyCard(roomId: string, playerId: string, cardId: string): Promise<ApiRoomState> {
  return postJson<ApiRoomState>("/game/sticky", { room_id: roomId, player_id: playerId, card_id: cardId });
}

export function giveCard(roomId: string, playerId: string, cardId: string): Promise<ApiRoomState> {
  return postJson<ApiRoomState>("/game/give_card", { room_id: roomId, player_id: playerId, card_id: cardId });
}

export function powerLook(roomId: string, playerId: string, targetCardId: string): Promise<ApiRoomState> {
  return postJson<ApiRoomState>("/game/power/look", { room_id: roomId, player_id: playerId, target_card_id: targetCardId });
}

export function powerSwap(roomId: string, playerId: string, card1Id: string, card2Id: string): Promise<ApiRoomState> {
  return postJson<ApiRoomState>("/game/power/swap", { room_id: roomId, player_id: playerId, card1_id: card1Id, card2_id: card2Id });
}

export function powerDiscard(roomId: string, playerId: string, cardId: string): Promise<ApiRoomState> {
  return postJson<ApiRoomState>("/game/power/discard", { room_id: roomId, player_id: playerId, card_id: cardId });
}

// --- Local player cache ---------------------------------------------------
// The backend only returns { responseCode, isAdmin }. We stash the player's
// own name + admin flag (and the table size) so the lobby can render the
// admin at the top and the remaining empty seats.

const playerKey = (roomCode: string) => `cabu:player:${roomCode}`;
const sizeKey = (roomCode: string) => `cabu:size:${roomCode}`;

export function rememberPlayer(
  roomCode: string,
  player: Player,
  noOfPlayers?: number,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(playerKey(roomCode), JSON.stringify(player));
  if (noOfPlayers != null) {
    localStorage.setItem(sizeKey(roomCode), String(noOfPlayers));
  }
}

export function getRememberedPlayer(roomCode: string): Player | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(playerKey(roomCode));
  return raw ? (JSON.parse(raw) as Player) : null;
}

export function getRememberedSize(roomCode: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(sizeKey(roomCode));
  return raw ? Number(raw) : null;
}

// A stable per-device id so the backend can reconnect a player to their seat
// across reloads (mobile webviews drop sockets often). Persists in localStorage.
const PLAYER_ID_KEY = "cabu:playerId";

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

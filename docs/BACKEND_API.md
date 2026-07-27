# Cabo Backend API — contract for the Python backend

The UI talks to the backend two ways:

1. **HTTP (REST)** — room lifecycle: create / join / start. Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`).
2. **WebSocket (Socket.IO)** — live gameplay. URL: `NEXT_PUBLIC_WS_URL` (default `http://localhost:8080`).

> ⚠️ The backend is **authoritative**. Never send a player a card face they aren't allowed to see — hidden cards must be sent as `null`.

---

## Shared object shapes

These are the exact JSON shapes the UI serializes/expects.

```ts
// A card. rank: 1=Ace, 2-10 face value, 11=J, 12=Q, 13=K
Card = { rank: 1..13, suit: "club" | "spade" | "heart" | "diamond" }

// A seat as seen by ONE receiving client. Hidden faces => null.
PublicPlayer = {
  id: string,
  name: string,
  admin: boolean,
  seat: number,
  cardCount: number,
  knownCards: (Card | null)[],   // length === cardCount; null = face-down to this client
  connected: boolean
}

// Authoritative per-player snapshot, pushed on every change.
GameState = {
  roomCode: string,
  phase: "lobby" | "initial-peek" | "turn" | "choosing" | "power" | "sticky" | "cabo-final" | "over",
  players: PublicPlayer[],
  discardTop: Card | null,
  deckCount: number,
  currentTurnPlayerId: string | null,
  caboCalledBy: string | null,
  yourId: string,               // the id of the client receiving THIS snapshot
  yourDrawnCard: Card | null    // the card this client just drew (only when it's their choosing/power phase)
}

CardRef = { playerId: string, index: number }   // points at one card in one hand

GameOver = {
  scores: { playerId: string, name: string, score: number }[],
  winnerId: string
}
```

---

## 1. HTTP endpoints

All are `POST`, `Content-Type: application/json`. UI helper: [`shared/api.ts`](../shared/api.ts).

### `POST /room/create`
Create a room. Caller becomes admin.

**UI sends:**
```json
{ "name": "Alice", "noOfPlayers": 4, "isAdmin": true }
```
`noOfPlayers` is 3–8.

**UI expects (200):**
```json
{ "responseCode": "482913", "isAdmin": true }
```
`responseCode` is the room code (UI then navigates to `/Room?id=<responseCode>`).

---

### `POST /room/join`
Join an existing room. Caller is not admin.

**UI sends:**
```json
{ "name": "Bob", "roomCode": "482913", "isAdmin": false }
```

**UI expects (200):**
```json
{ "responseCode": "482913", "isAdmin": false }
```

---

### `POST /room/start`
Optional REST variant of starting the game. (The live UI starts via the WebSocket `game:start` event; this endpoint exists in the API client if you prefer REST.)

**UI sends:**
```json
{
  "roomCode": "482913",
  "listOfPlayers": [
    { "name": "Alice", "admin": true },
    { "name": "Bob",   "admin": false }
  ]
}
```

**UI expects (200):** empty body (`void`).

**Errors (all HTTP):** any non-2xx status → UI throws "Request failed (<status>)". Return `4xx` with a JSON body for client errors; the status code is what the UI checks.

---

## 2. WebSocket events (Socket.IO)

Connect namespace `/` (default). The UI connects with `transports: ["websocket"]`. One Socket.IO **room per `roomCode`** is recommended.

Typed source of truth: [`shared/game/types.ts`](../shared/game/types.ts).

### Client → Server (events the UI emits)

| Event | Payload UI sends | When |
| --- | --- | --- |
| `game:join` | `{ roomCode, name, playerId }` | On connect, from `/Room` and `/Game`. `playerId` is a stable per-device id (so reconnects map to the same seat). |
| `game:start` | `{ roomCode }` | Admin clicks **Start the Game**. |
| `initial-peek:ack` | _(none)_ | Player finished memorizing their bottom two cards. |
| `turn:draw` | `{ source: "deck" \| "discard" }` | Current player draws. |
| `turn:resolve` | `{ action: "replace", index }` **or** `{ action: "discard" }` **or** `{ action: "power" }` | After drawing: swap into slot `index`, discard the drawn card, or invoke its power. |
| `power:peek-self` | `{ index }` | 7 / 8 — view one of your own cards. |
| `power:peek-other` | `{ playerId, index }` | 9 / 10 — peek another player's card. |
| `power:jack-swap` | `{ a: CardRef, b: CardRef }` | Jack — blind swap two cards (any players). |
| `power:queen-peek` | `{ playerId, index }` | Queen — look at a card before swapping (optional). |
| `power:queen-swap` | `{ a: CardRef, b: CardRef }` | Queen — swap two cards. |
| `power:queen-skip` | _(none)_ | Queen — decline to swap. |
| `power:king-discard` | `{ index }` | King — discard one of your own cards. |
| `sticky:match` | `{ targets: CardRef[], replaceFromIndex?: number }` | Sticky match. `replaceFromIndex` = which of YOUR cards fills a matched opponent slot (required when any target is another player's card). |
| `cabo:call` | _(none)_ | Call "Cabo". |

### Server → Client (events the UI listens for)

| Event | Payload UI expects | UI reaction |
| --- | --- | --- |
| `game:state` | `GameState` | Re-renders the whole table from this. **Send to each player individually** with their own sanitized view + their `yourId`/`yourDrawnCard`. |
| `game:started` | `{ roomCode }` | Everyone in `/Room` navigates to `/Game?id=<roomCode>`. Broadcast to the room. |
| `initial-peek` | `{ cards: [{ index, card }, ...] }` | Reveals the player's bottom two cards locally. **Private** — send only to that player. |
| `turn:drawn` | `{ card }` | (Also surfaced via `yourDrawnCard` in state.) Private to the drawer. |
| `power:peek-result` | `{ playerId, index, card }` | Reveals a peeked card locally. **Private** to the peeker. |
| `game:over` | `GameOver` | Shows the final scoreboard (lowest score wins). |
| `error` | `{ code, message }` | Shows `message` as a toast. Use for illegal moves, not-your-turn, etc. |

---

## Typical flow

1. `POST /room/create` → admin gets `responseCode`, lands on `/Room`.
2. Others `POST /room/join` → land on `/Room`.
3. Each client opens the socket and emits `game:join`. Server emits `game:state` (phase `lobby`) to the room as players join.
4. Admin emits `game:start`. Server deals, then:
   - broadcasts `game:started` (clients move to `/Game`),
   - sends each player a private `initial-peek`,
   - sends each player a `game:state` (phase `initial-peek`).
5. Players emit `initial-peek:ack`. When all ack, server sets phase `turn` for the first player and pushes `game:state`.
6. Turn loop: `turn:draw` → `game:state` (phase `choosing`, `yourDrawnCard` set) → `turn:resolve` (replace/discard/power). Powers fan out to the `power:*` events; results come back as private `power:peek-result`.
7. Any player may `sticky:match` during the sticky window. `cabo:call` starts the final round (phase `cabo-final`).
8. Game ends → `game:over` with scores.

## Card values (server computes scores)
Ace = 1; 2–10 = face value; Jack = 11; Queen = 12; King = 13. Cards 1–6 have no power; 7–King carry the powers above.

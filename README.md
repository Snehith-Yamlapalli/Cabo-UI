This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Mobile App (Capacitor)

This project ships as a native Android/iOS app via [Capacitor](https://capacitorjs.com).
The `android/` and `ios/` native projects are committed, so after cloning you only need:

```bash
npm install
```

Build/run on a device:

```bash
npm run android   # build + sync + open Android Studio
npm run ios       # build + sync + open Xcode (Mac only)
npm run sync      # rebuild + push web assets to native projects
```

Run `npm run sync` (or the platform script) after any UI change — the native app
uses the built snapshot in `out/`, so edits don't appear until you rebuild and sync.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Cabo game backend (WebSocket protocol)

The game engine is **server-authoritative** and lives in a separate **Python**
service (recommended: [`python-socketio`](https://python-socketio.readthedocs.io/)
on ASGI with FastAPI/uvicorn). The UI only renders the sanitized state it
receives and emits player intents. Point the client at the backend with:

```
NEXT_PUBLIC_WS_URL=http://localhost:8080   # see .env.local
```

### Events the backend must implement

**Client → Server**

| Event | Payload |
| --- | --- |
| `game:join` | `{ roomCode, name, playerId }` |
| `game:start` | `{ roomCode }` (admin only) |
| `initial-peek:ack` | — |
| `turn:draw` | `{ source: "deck" \| "discard" }` |
| `turn:resolve` | `{ action: "replace", index } \| { action: "discard" } \| { action: "power" }` |
| `power:peek-self` | `{ index }` (7/8) |
| `power:peek-other` | `{ playerId, index }` (9/10) |
| `power:jack-swap` | `{ a:{playerId,index}, b:{playerId,index} }` (J) |
| `power:queen-peek` / `power:queen-swap` / `power:queen-skip` | `{ playerId, index }` / `{ a, b }` / — (Q) |
| `power:king-discard` | `{ index }` (K) |
| `sticky:match` | `{ targets:[{playerId,index}], replaceFromIndex? }` |
| `cabo:call` | — |

**Server → Client**

| Event | Payload |
| --- | --- |
| `game:state` | `GameState` — per-player **sanitized** snapshot (hidden faces sent as `null`) |
| `game:started` | `{ roomCode }` — drives navigation from `/Room` to `/Game` |
| `initial-peek` | `{ cards:[{index,card},…] }` — your bottom two, once |
| `turn:drawn` | `{ card }` — private, only to the drawer |
| `power:peek-result` | `{ playerId, index, card }` — private |
| `game:over` | `{ scores:[{playerId,name,score}], winnerId }` |
| `error` | `{ code, message }` |

The exact TypeScript shapes (`GameState`, `PublicPlayer`, `Card`, the event
maps) are the contract — see [`shared/game/types.ts`](shared/game/types.ts) and
[`shared/game/cards.ts`](shared/game/cards.ts). Card values: A=1, 2–10 face
value, J=11, Q=12, K=13. Powers attach to 7–K only.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

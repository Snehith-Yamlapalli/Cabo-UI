import { io, type Socket } from "socket.io-client";
import type { ClientToServer, ServerToClient } from "./game/types";

// Backend Socket.IO server (the Python python-socketio service).
// Override with NEXT_PUBLIC_WS_URL in .env.local.
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8000";

export type GameSocket = Socket<ServerToClient, ClientToServer>;

let socket: GameSocket | null = null;

/** Lazily create the typed socket. Connection is started explicitly. */
export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      transports: ["websocket"],
    });
  }
  return socket;
}

export function connectSocket(): GameSocket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}

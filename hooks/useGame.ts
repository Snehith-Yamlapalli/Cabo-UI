"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { connectSocket, getSocket } from "@/shared/socket";
import { getPlayerId, getRememberedPlayer } from "@/shared/api";
import type {
  CardRef,
  GameOver,
  GameState,
} from "@/shared/game/types";
import type { Card } from "@/shared/game/cards";

export type GameActions = {
  drawDeck: () => void;
  drawDiscard: () => void;
  replace: (index: number) => void;
  discardDrawn: () => void;
  usePower: () => void;
  peekSelf: (index: number) => void;
  peekOther: (ref: CardRef) => void;
  blindSwap: (a: CardRef, b: CardRef) => void;
  queenPeek: (ref: CardRef) => void;
  queenSwap: (a: CardRef, b: CardRef) => void;
  queenSkip: () => void;
  kingDiscard: (index: number) => void;
  stickyMatch: (targets: CardRef[], replaceFromIndex?: number) => void;
  callCabo: () => void;
  ackInitialPeek: () => void;
};

export type UseGame = {
  /** Authoritative state, or null until the first snapshot arrives. */
  state: GameState | null;
  /** Private cards revealed to you (initial peek + power peeks), keyed "playerId:index". */
  revealed: Record<string, Card>;
  connected: boolean;
  gameOver: GameOver | null;
  actions: GameActions;
};

const refKey = (playerId: string, index: number) => `${playerId}:${index}`;

export function useGame(roomCode: string): UseGame {
  const [state, setState] = useState<GameState | null>(null);
  const [revealed, setRevealed] = useState<Record<string, Card>>({});
  const [connected, setConnected] = useState(false);
  const [gameOver, setGameOver] = useState<GameOver | null>(null);
  const playerIdRef = useRef("");

  useEffect(() => {
    if (!roomCode) return;
    const socket = getSocket();
    const playerId = getPlayerId();
    playerIdRef.current = playerId;
    const me = getRememberedPlayer(roomCode);

    const onConnect = () => {
      setConnected(true);
      socket.emit("game:join", {
        roomCode,
        name: me?.name ?? "Player",
        playerId,
      });
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s: GameState) => setState(s);
    const onInitialPeek = (p: { cards: { index: number; card: Card }[] }) => {
      setRevealed((prev) => {
        const next = { ...prev };
        for (const c of p.cards) next[refKey(playerId, c.index)] = c.card;
        return next;
      });
    };
    const onPeekResult = (p: CardRef & { card: Card }) => {
      setRevealed((prev) => ({
        ...prev,
        [refKey(p.playerId, p.index)]: p.card,
      }));
    };
    const onOver = (p: GameOver) => setGameOver(p);
    const onError = (p: { code: string; message: string }) =>
      toast.error(p.message);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("game:state", onState);
    socket.on("initial-peek", onInitialPeek);
    socket.on("power:peek-result", onPeekResult);
    socket.on("game:over", onOver);
    socket.on("error", onError);

    connectSocket();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("game:state", onState);
      socket.off("initial-peek", onInitialPeek);
      socket.off("power:peek-result", onPeekResult);
      socket.off("game:over", onOver);
      socket.off("error", onError);
    };
  }, [roomCode]);

  const emit = getSocket();

  const actions: GameActions = {
    drawDeck: useCallback(() => emit.emit("turn:draw", { source: "deck" }), [emit]),
    drawDiscard: useCallback(
      () => emit.emit("turn:draw", { source: "discard" }),
      [emit],
    ),
    replace: useCallback(
      (index: number) => emit.emit("turn:resolve", { action: "replace", index }),
      [emit],
    ),
    discardDrawn: useCallback(
      () => emit.emit("turn:resolve", { action: "discard" }),
      [emit],
    ),
    usePower: useCallback(
      () => emit.emit("turn:resolve", { action: "power" }),
      [emit],
    ),
    peekSelf: useCallback(
      (index: number) => emit.emit("power:peek-self", { index }),
      [emit],
    ),
    peekOther: useCallback(
      (ref: CardRef) => emit.emit("power:peek-other", ref),
      [emit],
    ),
    blindSwap: useCallback(
      (a: CardRef, b: CardRef) => emit.emit("power:jack-swap", { a, b }),
      [emit],
    ),
    queenPeek: useCallback(
      (ref: CardRef) => emit.emit("power:queen-peek", ref),
      [emit],
    ),
    queenSwap: useCallback(
      (a: CardRef, b: CardRef) => emit.emit("power:queen-swap", { a, b }),
      [emit],
    ),
    queenSkip: useCallback(() => emit.emit("power:queen-skip"), [emit]),
    kingDiscard: useCallback(
      (index: number) => emit.emit("power:king-discard", { index }),
      [emit],
    ),
    stickyMatch: useCallback(
      (targets: CardRef[], replaceFromIndex?: number) =>
        emit.emit("sticky:match", { targets, replaceFromIndex }),
      [emit],
    ),
    callCabo: useCallback(() => emit.emit("cabo:call"), [emit]),
    ackInitialPeek: useCallback(() => emit.emit("initial-peek:ack"), [emit]),
  };

  return { state, revealed, connected, gameOver, actions };
}

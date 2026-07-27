import Link from "next/link";
import type { GameOver as GameOverData } from "@/shared/game/types";

export default function GameOver({
  data,
  yourId,
}: {
  data: GameOverData;
  yourId: string;
}) {
  const ranked = [...data.scores].sort((a, b) => a.score - b.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <h2 className="text-base leading-relaxed text-slate-900">Game Over</h2>
        <p className="mt-1 text-[10px] text-slate-500">Lowest score wins</p>

        <ul className="mt-5 space-y-2 text-left">
          {ranked.map((s, i) => {
            const isWinner = s.playerId === data.winnerId;
            const isYou = s.playerId === yourId;
            return (
              <li
                key={s.playerId}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                  isWinner
                    ? "border-amber-400 bg-amber-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span className="text-xs text-slate-800">
                  {i + 1}. {isYou ? "You" : s.name}
                  {isWinner && " 👑"}
                </span>
                <span className="text-xs text-slate-900">{s.score}</span>
              </li>
            );
          })}
        </ul>

        <Link
          href="/"
          className="mt-6 block w-full rounded-xl bg-indigo-600 px-4 py-3 text-xs text-white transition hover:bg-indigo-700"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

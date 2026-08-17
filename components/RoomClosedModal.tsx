"use client";
import { forgetPlayer } from "@/shared/api";

export default function RoomClosedModal({ id }: { id: string }) {
  const handleReturnHome = () => {
    forgetPlayer(id);
    window.location.href = "/";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-rose-500/50 shadow-2xl flex flex-col items-center text-center gap-4 text-slate-100">
        <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-3xl shadow-lg shadow-rose-900/30">
          🛑
        </div>
        <div>
          <h2 className="text-lg font-black text-rose-400 uppercase tracking-wider">
            Room Closed
          </h2>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Room <span className="font-bold text-amber-400 font-mono">{id}</span> has been closed by the admin or expired due to inactivity.
          </p>
        </div>
        <button
          onClick={handleReturnHome}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 text-white font-extrabold uppercase tracking-wider text-xs shadow-lg shadow-rose-900/50 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}

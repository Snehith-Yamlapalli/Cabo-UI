"use client";

export default function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl gold-card-border bg-[#0a162b]/95 p-4 sm:p-6 shadow-[0_12px_60px_rgba(0,0,0,0.8)] border border-amber-500/40 text-left space-y-3 sm:space-y-4 my-auto max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-2.5 sm:pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">📜</span>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold text-gold-metallic tracking-wider font-sans">
                <span className="font-logo">CABO</span> Rulebook
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Learn how to play, use powers, and call CABO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#112240] hover:bg-[#1a2f55] flex items-center justify-center text-amber-400 font-extrabold text-xs sm:text-sm border border-amber-500/30 cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Game Goal */}
        <div className="bg-[#112240]/80 p-3 rounded-2xl border border-amber-500/20 space-y-1">
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🎯</span> Objective
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
            The goal of CABO is to minimize the total point value of your cards. You start with 4 face-down cards and can peek at 2 at the start of the round.
          </p>
        </div>

        {/* Card Powers Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <span>🃏</span> Special Card Powers (Drawn from Deck & Discarded)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-[#112240]/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-xs font-extrabold text-amber-400">1 – 6</span>
              <p className="text-[11px] text-slate-300 mt-0.5">Numeric value only (No special power).</p>
            </div>
            <div className="bg-[#112240]/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-xs font-extrabold text-purple-300">7 & 8</span>
              <p className="text-[11px] text-slate-300 mt-0.5">Peek at 1 of your <strong className="text-white">own cards</strong> (Private).</p>
            </div>
            <div className="bg-[#112240]/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-xs font-extrabold text-purple-300">9 & 10</span>
              <p className="text-[11px] text-slate-300 mt-0.5">Peek at 1 <strong className="text-white">opponent's card</strong> (Private).</p>
            </div>
            <div className="bg-[#112240]/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-xs font-extrabold text-amber-300">Jack (J)</span>
              <p className="text-[11px] text-slate-300 mt-0.5">Blind swap <strong className="text-white">any 2 cards</strong> on the table.</p>
            </div>
            <div className="bg-[#112240]/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-xs font-extrabold text-amber-300">Queen (Q)</span>
              <p className="text-[11px] text-slate-300 mt-0.5">Peek at 1 card, then choose whether to <strong className="text-white">swap it</strong>.</p>
            </div>
            <div className="bg-[#112240]/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-xs font-extrabold text-rose-300">King (K)</span>
              <p className="text-[11px] text-slate-300 mt-0.5"><strong className="text-white">Trash/Discard</strong> one of your own cards.</p>
            </div>
          </div>
        </div>

        {/* Sticky Rules Section */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <span>📌</span> Sticky Matching (Out of Turn)
          </h3>
          <div className="bg-[#112240]/60 p-3 rounded-2xl border border-slate-700/50 space-y-1.5 text-xs text-slate-300 leading-relaxed">
            <p>
              • If the top card of the Discard pile matches a card in your or another player's hand, click it to <strong className="text-amber-300">Sticky</strong> immediately!
            </p>
            <p>
              • <strong className="text-amber-400">Successful Sticky:</strong> Card is discarded, reducing hand size.
            </p>
            <p>
              • <strong className="text-rose-400">Failed Sticky:</strong> Draw a penalty card from the deck!
            </p>
            <p>
              • <strong className="text-indigo-300">Sticky Opponent's Card:</strong> Give one of your cards to that opponent to fill their empty slot.
            </p>
          </div>
        </div>

        {/* Calling Cabo & Freeze Protection */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <span>👑</span> Calling CABO & Freeze Protection
          </h3>
          <div className="bg-[#112240]/60 p-3 rounded-2xl border border-slate-700/50 space-y-1.5 text-xs text-slate-300 leading-relaxed">
            <p>
              • When you think you have the lowest points, call <strong className="text-amber-400">CABO</strong> on your turn!
            </p>
            <p>
              • All other players get <strong className="text-white">1 final turn</strong> before the round ends.
            </p>
            <p>
              • <strong className="text-emerald-400">Freeze Protection:</strong> The Cabo Caller's cards are <strong className="text-white">frozen and protected</strong> — no player can swap (J/Q) or sticky their cards!
            </p>
          </div>
        </div>

        {/* Turn Timers & Laser Border */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <span>⏱️</span> Turn Timers & Laser Border
          </h3>
          <div className="bg-[#112240]/60 p-3 rounded-2xl border border-slate-700/50 space-y-1.5 text-xs text-slate-300 leading-relaxed">
            <p>
              • <strong className="text-amber-400">8-Second Turn Limit:</strong> You have 8 seconds to draw a card. Watch the <strong className="text-amber-300">4-sided glowing laser border</strong> around your hand shrink corner-by-corner as time counts down! If time expires, a card is auto-drawn and discarded.
            </p>
            <p>
              • <strong className="text-purple-300">10-Second Power Action Limit:</strong>
            </p>
            <ul className="pl-4 list-disc space-y-1 text-[11px] text-slate-400">
              <li><strong className="text-slate-200">7 – 10 (Peeking):</strong> Auto-skipped after 10s if no card is selected.</li>
              <li><strong className="text-slate-200">Jack (J) & Queen (Q) (Swapping):</strong> Auto-swaps your 1st available card with an opponent if 10s expire. (Once 1st card is picked, power cannot be cancelled mid-action!).</li>
              <li><strong className="text-slate-200">King (K) (Trashing):</strong> Power expires at 10s without trashing (your loss!).</li>
            </ul>
          </div>
        </div>

        {/* Discard Pile Draw Rules */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <span>🔄</span> Discard Pile Draw & Swap
          </h3>
          <div className="bg-[#112240]/60 p-3 rounded-2xl border border-slate-700/50 space-y-1 text-xs text-slate-300 leading-relaxed">
            <p>
              • Drawing from the Discard pile requires you to <strong className="text-amber-300">swap it with a card in your hand</strong>. You cannot immediately re-discard a card drawn from the discard pile!
            </p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl btn-gold-metallic text-xs font-extrabold uppercase tracking-wider shadow-lg transition cursor-pointer"
        >
          Got It! Back to Game
        </button>
      </div>
    </div>
  );
}

"use client";

const DECO_CARDS = [
  // Top Left Outer Cluster
  { rank: "A", suit: "♠", rot: -16, scale: 1.05, top: "4%", left: "3%", isBack: false, opacity: 0.35 },
  { rank: "", suit: "", rot: 12, scale: 0.95, top: "8%", left: "8%", isBack: true, opacity: 0.28 },
  
  // Left Box Flank (Directly beside left edge of central card box)
  { rank: "3", suit: "♠", rot: 15, scale: 1.08, top: "18%", left: "26%", isBack: false, opacity: 0.38 },
  { rank: "", suit: "", rot: -28, scale: 0.98, top: "28%", left: "29%", isBack: true, opacity: 0.32 },
  { rank: "K", suit: "♣", rot: -22, scale: 1.08, top: "54%", left: "25%", isBack: false, opacity: 0.38 },
  { rank: "", suit: "", rot: 14, scale: 0.95, top: "66%", left: "29%", isBack: true, opacity: 0.32 },

  // Top Right Outer Cluster
  { rank: "K", suit: "♥", rot: 22, scale: 1.08, top: "5%", right: "4%", isBack: false, opacity: 0.35 },
  { rank: "Q", suit: "♦", rot: -24, scale: 0.95, top: "12%", right: "9%", isBack: false, opacity: 0.28 },
  
  // Right Box Flank (Directly beside right edge of central card box)
  { rank: "4", suit: "♥", rot: -18, scale: 1.08, top: "20%", right: "26%", isBack: false, opacity: 0.38 },
  { rank: "", suit: "", rot: 30, scale: 0.98, top: "30%", right: "29%", isBack: true, opacity: 0.32 },
  { rank: "A", suit: "♦", rot: 19, scale: 1.08, top: "56%", right: "25%", isBack: false, opacity: 0.38 },
  { rank: "", suit: "", rot: -34, scale: 0.95, top: "68%", right: "29%", isBack: true, opacity: 0.32 },
  
  // Mid Left Outer
  { rank: "7", suit: "♥", rot: -14, scale: 1.0, top: "40%", left: "2%", isBack: false, opacity: 0.32 },
  { rank: "", suit: "", rot: 32, scale: 0.9, top: "46%", left: "6%", isBack: true, opacity: 0.26 },
  { rank: "Q", suit: "♠", rot: 42, scale: 0.95, top: "25%", left: "1%", isBack: false, opacity: 0.30 },

  // Mid Right Outer
  { rank: "10", suit: "♠", rot: 28, scale: 1.05, top: "42%", right: "2%", isBack: false, opacity: 0.32 },
  { rank: "J", suit: "♣", rot: -18, scale: 0.95, top: "50%", right: "6%", isBack: false, opacity: 0.26 },
  { rank: "9", suit: "♥", rot: -38, scale: 0.95, top: "32%", right: "1%", isBack: false, opacity: 0.30 },

  // Bottom Left Outer
  { rank: "2", suit: "♦", rot: 18, scale: 1.0, bottom: "4%", left: "3%", isBack: false, opacity: 0.32 },
  { rank: "8", suit: "♣", rot: -32, scale: 1.08, bottom: "8%", left: "8%", isBack: false, opacity: 0.35 },

  // Bottom Right Outer
  { rank: "", suit: "", rot: -15, scale: 0.95, bottom: "6%", right: "7%", isBack: true, opacity: 0.28 },
  { rank: "6", suit: "♠", rot: 24, scale: 1.05, bottom: "3%", right: "2%", isBack: false, opacity: 0.32 },
  
  // Top & Bottom Center
  { rank: "9", suit: "♣", rot: 38, scale: 0.9, top: "2%", left: "38%", isBack: false, opacity: 0.24 },
  { rank: "5", suit: "♠", rot: -36, scale: 0.9, bottom: "2%", left: "36%", isBack: false, opacity: 0.24 },
];

export default function DecoCards() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {DECO_CARDS.map((card, i) => {
        const isRed = card.suit === "♥" || card.suit === "♦";
        const textColor = isRed ? "#dc2626" : "#1e293b";
        const { rank, suit, rot, scale, isBack, opacity, ...pos } = card;

        if (isBack) {
          return (
            <div
              key={i}
              className="absolute hidden sm:flex items-center justify-center card-back-pattern card-shadow transition-all"
              style={{
                ...pos,
                transform: `rotate(${rot}deg) scale(${scale})`,
                opacity,
                width: 80,
                height: 112,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div
                className="absolute inset-[3px] rounded-lg border flex items-center justify-center"
                style={{ borderColor: "rgba(255,255,255,0.15)" }}
              >
                <span className="text-white/60 font-black tracking-widest text-[8px]">CABO</span>
              </div>
            </div>
          );
        }

        return (
          <div
            key={i}
            className="absolute hidden sm:flex flex-col justify-between bg-[#fffef8] p-2 card-shadow transition-all"
            style={{
              ...pos,
              transform: `rotate(${rot}deg) scale(${scale})`,
              opacity,
              width: 80,
              height: 112,
              color: textColor,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          >
            <div className="flex flex-col items-center self-start leading-none text-xs">
              <span className="font-extrabold">{rank}</span>
              <span className="text-sm">{suit}</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center leading-none text-2xl opacity-75">
              {suit}
            </div>
            <div className="flex flex-col items-center self-end rotate-180 leading-none text-xs">
              <span className="font-extrabold">{rank}</span>
              <span className="text-sm">{suit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

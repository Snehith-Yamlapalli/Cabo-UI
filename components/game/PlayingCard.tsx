import { isRed, rankLabel, suitSymbol, type Card } from "@/shared/game/cards";

type Props = {
  /** The card face, or null to render face-down. */
  card: Card | null;
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
};

export default function PlayingCard({
  card,
  selectable = false,
  selected = false,
  onClick,
  size = "md",
}: Props) {
  let w = 90;
  let h = 126;
  let smallFontSize = 11;
  let largeFontSize = 28;

  if (size === "sm") {
    w = 68;
    h = 96;
    smallFontSize = 9;
    largeFontSize = 20;
  } else if (size === "lg") {
    w = 105;
    h = 147;
    smallFontSize = 13;
    largeFontSize = 34;
  }

  const baseClasses = "relative flex items-center justify-center transition-all duration-200 ease-out animate-card-deal";
  const interactiveClasses = selectable
    ? "cursor-pointer card-interactive"
    : "";

  if (!card) {
    // Face-down
    return (
      <button
        type="button"
        disabled={!selectable}
        onClick={onClick}
        style={{
          width: w,
          height: h,
          borderRadius: "10px",
          boxShadow: selected ? "0 0 0 3px rgba(129,140,248,0.6)" : undefined,
        }}
        className={`${baseClasses} ${interactiveClasses} card-back-pattern card-shadow bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden`}
      >
        <div className="absolute inset-[4px] border border-white/12 rounded-[6px]"></div>
        <span className="text-white/60 tracking-[0.15em] font-bold" style={{ fontSize: smallFontSize + 1 }}>CABO</span>
      </button>
    );
  }

  const textColor = isRed(card.suit) ? "text-[#dc2626]" : "text-[#1e293b]";

  // Face-up inner shadow and optional selection ring
  const shadowStyle = selected
    ? "inset 0 1px 2px rgba(0,0,0,0.06), 0 0 0 3px rgba(129,140,248,0.6)"
    : "inset 0 1px 2px rgba(0,0,0,0.06)";

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      style={{
        width: w,
        height: h,
        borderRadius: "10px",
        boxShadow: shadowStyle,
      }}
      className={`${baseClasses} ${interactiveClasses} card-shadow bg-[#fffef8] ${textColor}`}
    >
      <div
        className="absolute top-1 left-1.5 flex flex-col items-center leading-none"
        style={{ fontSize: smallFontSize }}
      >
        <span>{rankLabel(card.rank)}</span>
        <span>{suitSymbol(card.suit)}</span>
      </div>
      
      <span className="leading-none" style={{ fontSize: largeFontSize }}>
        {suitSymbol(card.suit)}
      </span>
      
      <div
        className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180"
        style={{ fontSize: smallFontSize }}
      >
        <span>{rankLabel(card.rank)}</span>
        <span>{suitSymbol(card.suit)}</span>
      </div>
    </button>
  );
}

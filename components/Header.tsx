import Link from "next/link";

export default function Header() {
  return (
    <header className="glass-panel flex items-center justify-center border-b border-white/5 px-6 py-4">
      <Link
        href="/"
        aria-label="Cabo home"
        className="text-xl tracking-widest text-slate-200 transition-colors hover:text-amber-300"
      >
        ♠️♣️♥️♦️
      </Link>
    </header>
  );
}

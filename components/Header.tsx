"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getStoredName, setStoredName } from "@/shared/api";

export default function Header() {
  const pathname = usePathname();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setName(getStoredName());
  }, []);

  if (pathname === "/Game") return null;

  function save() {
    const trimmed = draft.trim();
    if (trimmed) {
      setStoredName(trimmed);
      setName(trimmed);
    }
    setEditing(false);
  }

  return (
    <header className="glass-panel relative flex items-center justify-center border-b border-white/5 px-4 sm:px-6 py-3 sm:py-4">
      <Link
        href="/"
        aria-label="Cabo home"
        className="text-xl tracking-widest text-slate-200 transition-colors hover:text-amber-300"
      >
        ♠️♣️♥️♦️
      </Link>

      {name && !editing && (
        <button
          onClick={() => { setDraft(name); setEditing(true); }}
          className="absolute right-4 sm:right-6 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition group"
          title="Click to change name"
        >
          <span className="text-slate-300 group-hover:text-white">{name}</span>
          <span className="text-[10px] text-slate-600 group-hover:text-slate-400">✎</span>
        </button>
      )}

      {editing && (
        <div className="absolute right-4 sm:right-6 flex items-center gap-1.5">
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
          />
          <button
            onClick={save}
            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300"
          >
            Save
          </button>
        </div>
      )}
    </header>
  );
}

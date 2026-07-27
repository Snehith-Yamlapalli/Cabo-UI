type Btn = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
};

export default function ActionBar({
  message,
  buttons,
}: {
  message?: string;
  buttons: Btn[];
}) {
  return (
    <div className="w-full max-w-md rounded-2xl p-4 glass-panel">
      {message && (
        <p className="mb-3 text-center text-[11px] leading-relaxed text-slate-300">
          {message}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.onClick}
            disabled={b.disabled}
            className={`rounded-xl px-4 py-2.5 text-[11px] leading-none transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 ${
              b.primary
                ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-500/25"
                : "glass-panel text-slate-200 hover:bg-white/10"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

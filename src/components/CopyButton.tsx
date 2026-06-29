"use client";
import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* clipboard blocked — ignore */
        }
      }}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
        done
          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
          : "border-white/10 bg-white/5 text-violet-100 hover:border-white/20 hover:bg-white/10"
      }`}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  variant = "secondary",
}: {
  text: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      className={`btn ${
        done
          ? "border border-[color:var(--color-sage)] bg-[color-mix(in_srgb,var(--color-sage)_18%,transparent)] text-[color:var(--color-sage)]"
          : variant === "primary"
            ? "btn-primary"
            : variant === "ghost"
              ? "btn-ghost"
              : "btn-secondary"
      }`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

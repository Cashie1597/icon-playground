"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  variant = "secondary",
}: {
  text: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "dark";
}) {
  const [done, setDone] = useState(false);

  const base =
    done
      ? "border border-[color-mix(in_srgb,var(--color-mint)_40%,var(--border))] bg-[color-mix(in_srgb,var(--color-mint)_12%,white)] text-[var(--color-mint)]"
      : variant === "primary"
        ? "btn-primary"
        : variant === "ghost"
          ? "btn-ghost"
          : variant === "dark"
            ? "btn-dark"
            : "btn-secondary";

  return (
    <button
      type="button"
      className={`btn ${base}`}
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

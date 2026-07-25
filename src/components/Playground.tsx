"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { IconDef } from "@/icons.generated";
import { DEFAULT_STYLE, type IconStyle, toSvg, toJsx } from "@/lib/render";
import { IconRender } from "./IconRender";
import { CopyButton } from "./CopyButton";

type Bg = "dark" | "light" | "checker";
type Tab = "library" | "editor";
type ExportFmt = "svg" | "jsx";
type Density = "comfortable" | "compact";

const BG_CLASS: Record<Bg, string> = {
  dark: "preview-dark",
  light: "preview-light",
  checker: "preview-checker",
};

const COLOR_SWATCHES = [
  "#e8eef8",
  "#2f6bff",
  "#0f9f6e",
  "#f5f7fb",
  "#101828",
  "#f59e0b",
  "#a78bfa",
  "#ffffff",
] as const;

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPng(filename: string, svg: string, size = 512) {
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg load failed"));
      img.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, size, size);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function displayName(name: string) {
  return name.replace(/^\d+\s+/, "");
}

export function Playground({ icons }: { icons: IconDef[] }) {
  const [tab, setTab] = useState<Tab>("library");
  const [style, setStyle] = useState<IconStyle>(DEFAULT_STYLE);
  const [bg, setBg] = useState<Bg>("dark");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<IconDef | null>(icons[0] ?? null);
  const [density, setDensity] = useState<Density>("comfortable");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return icons;
    return icons.filter((i) => i.slug.includes(q) || i.name.toLowerCase().includes(q));
  }, [icons, query]);

  const selectedIndex = useMemo(() => {
    if (!selected) return -1;
    return filtered.findIndex((i) => i.slug === selected.slug);
  }, [filtered, selected]);

  const selectByOffset = useCallback(
    (delta: number) => {
      if (filtered.length === 0) return;
      const base = selectedIndex < 0 ? 0 : selectedIndex;
      const next = (base + delta + filtered.length) % filtered.length;
      setSelected(filtered[next]);
    },
    [filtered, selectedIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing || tab !== "library") return;
      if (e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        selectByOffset(1);
      } else if (e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        selectByOffset(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectByOffset, tab]);

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!selected || !filtered.some((i) => i.slug === selected.slug)) {
      setSelected(filtered[0]);
    }
  }, [filtered, selected]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col px-3 pb-8 pt-3 sm:px-5 lg:px-6">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--color-signal)] focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <header className="panel mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-signal)] text-white shadow-sm"
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M14 16.5h5M16.5 14v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="label-caps">Studio</p>
              <span className="chip mono">{icons.length} icons</span>
            </div>
            <h1 className="font-display truncate text-xl text-[var(--fg)] sm:text-2xl">
              Icon Playground
            </h1>
          </div>
        </div>

        <nav
          className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1"
          aria-label="View"
        >
          {(
            [
              { id: "library" as const, label: "Library" },
              { id: "editor" as const, label: "Editor" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === item.id
                  ? "bg-white text-[var(--fg)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main id="main-content" className="flex-1">
        {tab === "library" ? (
          <LibraryView
            icons={filtered}
            total={icons.length}
            style={style}
            setStyle={setStyle}
            bg={bg}
            setBg={setBg}
            query={query}
            setQuery={setQuery}
            selected={selected}
            setSelected={setSelected}
            density={density}
            setDensity={setDensity}
            searchRef={searchRef}
            selectedIndex={selectedIndex}
          />
        ) : (
          <EditorView bg={bg} setBg={setBg} />
        )}
      </main>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[var(--muted)]">
        <p>
          Source <span className="mono text-[var(--fg)]">icons/</span>
        </p>
        <p className="mono">/ search · ← → browse · j k</p>
      </footer>
    </div>
  );
}

function ControlField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between gap-2">
        <span className="label-caps">{label}</span>
        {value != null && <span className="mono text-xs font-medium text-[var(--fg)]">{value}</span>}
      </span>
      {children}
    </label>
  );
}

function BgToggle({ bg, setBg }: { bg: Bg; setBg: (b: Bg) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-caps">Canvas</span>
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Preview background">
        {(
          [
            { id: "dark" as const, label: "Dark" },
            { id: "light" as const, label: "Light" },
            { id: "checker" as const, label: "Alpha" },
          ] as const
        ).map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBg(b.id)}
            aria-pressed={bg === b.id}
            className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
              bg === b.id
                ? "bg-[var(--color-signal)] text-white"
                : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ControlsSidebar({
  style,
  setStyle,
  bg,
  setBg,
  query,
  setQuery,
  density,
  setDensity,
  total,
  shown,
  searchRef,
}: {
  style: IconStyle;
  setStyle: (s: IconStyle) => void;
  bg: Bg;
  setBg: (b: Bg) => void;
  query: string;
  setQuery: (q: string) => void;
  density: Density;
  setDensity: (d: Density) => void;
  total: number;
  shown: number;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <aside className="panel flex h-fit flex-col gap-5 p-4 lg:sticky lg:top-3" aria-label="Controls">
      <div>
        <p className="label-caps">Search</p>
        <div className="relative mt-2">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${total} icons…`}
            aria-label="Search icons"
            className="field pl-10"
          />
        </div>
        <p className="mono mt-2 text-xs text-[var(--muted)]">
          {shown} shown
        </p>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="label-caps">Style</p>
          <button type="button" className="btn btn-ghost !min-h-8 !px-2 !text-xs" onClick={() => setStyle(DEFAULT_STYLE)}>
            Reset
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <ControlField label="Size" value={`${style.size}px`}>
            <input
              type="range"
              min={16}
              max={128}
              value={style.size}
              onChange={(e) => setStyle({ ...style, size: +e.target.value })}
              aria-label="Icon size"
            />
          </ControlField>
          <ControlField label="Stroke" value={`${style.strokeWidth}`}>
            <input
              type="range"
              min={0.5}
              max={4}
              step={0.5}
              value={style.strokeWidth}
              onChange={(e) => setStyle({ ...style, strokeWidth: +e.target.value })}
              aria-label="Stroke width"
            />
          </ControlField>
          <ControlField label="Rotate" value={`${style.rotate}°`}>
            <input
              type="range"
              min={0}
              max={360}
              value={style.rotate}
              onChange={(e) => setStyle({ ...style, rotate: +e.target.value })}
              aria-label="Rotation"
            />
          </ControlField>
          <BgToggle bg={bg} setBg={setBg} />
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <p className="label-caps mb-2">Color</p>
        <div className="flex flex-wrap items-center gap-2">
          {COLOR_SWATCHES.map((c) => {
            const active = style.color.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                title={c}
                aria-label={`Set color ${c}`}
                aria-pressed={active}
                onClick={() => setStyle({ ...style, color: c })}
                className="h-7 w-7 rounded-full border border-[var(--border)] shadow-sm transition-transform hover:scale-105"
                style={{
                  background: c,
                  boxShadow: active
                    ? `0 0 0 2px #fff, 0 0 0 4px var(--color-signal)`
                    : undefined,
                }}
              />
            );
          })}
          <input
            type="color"
            value={style.color}
            onChange={(e) => setStyle({ ...style, color: e.target.value })}
            className="h-8 w-10"
            aria-label="Custom color"
          />
        </div>
        <p className="mono mt-2 text-xs text-[var(--muted)]">{style.color}</p>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <p className="label-caps mb-2">Grid density</p>
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              { id: "comfortable" as const, label: "Roomy" },
              { id: "compact" as const, label: "Dense" },
            ] as const
          ).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDensity(d.id)}
              aria-pressed={density === d.id}
              className={`rounded-lg px-2 py-2 text-xs font-semibold ${
                density === d.id
                  ? "bg-[var(--color-signal)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function LibraryView({
  icons,
  total,
  style,
  setStyle,
  bg,
  setBg,
  query,
  setQuery,
  selected,
  setSelected,
  density,
  setDensity,
  searchRef,
  selectedIndex,
}: {
  icons: IconDef[];
  total: number;
  style: IconStyle;
  setStyle: (s: IconStyle) => void;
  bg: Bg;
  setBg: (b: Bg) => void;
  query: string;
  setQuery: (q: string) => void;
  selected: IconDef | null;
  setSelected: (i: IconDef) => void;
  density: Density;
  setDensity: (d: Density) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  selectedIndex: number;
}) {
  const minTile = density === "compact" ? 92 : 118;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
      <ControlsSidebar
        style={style}
        setStyle={setStyle}
        bg={bg}
        setBg={setBg}
        query={query}
        setQuery={setQuery}
        density={density}
        setDensity={setDensity}
        total={total}
        shown={icons.length}
        searchRef={searchRef}
      />

      <section className="panel min-h-[420px] p-3 sm:p-4" aria-label="Icon grid">
        {icons.length === 0 ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-display text-2xl">No matches</p>
            <p className="max-w-xs text-sm text-[var(--muted)]">
              Try another term, or clear the filter.
            </p>
            <button type="button" className="btn btn-secondary" onClick={() => setQuery("")}>
              Clear search
            </button>
          </div>
        ) : (
          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minTile}px, 1fr))` }}
          >
            {icons.map((icon, idx) => {
              const active = selected?.slug === icon.slug;
              return (
                <button
                  key={icon.slug}
                  type="button"
                  onClick={() => setSelected(icon)}
                  data-active={active}
                  className="icon-tile panel-flush flex flex-col gap-2 p-2 text-left"
                  aria-current={active ? "true" : undefined}
                  aria-label={`${displayName(icon.name)}${active ? ", selected" : ""}`}
                >
                  <div
                    className={`flex aspect-square items-center justify-center rounded-lg ${BG_CLASS[bg]}`}
                  >
                    <IconRender
                      icon={icon}
                      style={style}
                      size={Math.min(style.size, density === "compact" ? 36 : 52)}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-1 px-0.5">
                    <span
                      className={`truncate text-xs ${
                        active ? "font-semibold text-[var(--fg)]" : "text-[var(--muted)]"
                      }`}
                    >
                      {displayName(icon.name)}
                    </span>
                    <span className="mono shrink-0 text-[10px] text-[var(--muted)] opacity-70">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <DetailPanel
          icon={selected}
          style={style}
          bg={bg}
          indexLabel={
            selectedIndex >= 0
              ? `${selectedIndex + 1} / ${icons.length}`
              : undefined
          }
        />
      )}
    </div>
  );
}

function DetailPanel({
  icon,
  style,
  bg,
  indexLabel,
}: {
  icon: IconDef;
  style: IconStyle;
  bg: Bg;
  indexLabel?: string;
}) {
  const [exportFmt, setExportFmt] = useState<ExportFmt>("svg");
  const svg = toSvg(icon, style);
  const jsx = toJsx(icon);
  const sizes = [16, 24, 32, 48, 64, 96];
  const code = exportFmt === "svg" ? svg : jsx;

  return (
    <aside
      className="panel flex h-fit flex-col gap-4 p-4 lg:sticky lg:top-3"
      aria-label="Icon detail"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">Selected</p>
          <h2 className="font-display mt-1 truncate text-2xl leading-tight">
            {displayName(icon.name)}
          </h2>
          <p className="mono mt-1 text-xs text-[var(--color-signal)]">{icon.slug}</p>
        </div>
        {indexLabel && <span className="chip mono shrink-0">{indexLabel}</span>}
      </div>

      <div className={`flex items-center justify-center rounded-xl p-10 ${BG_CLASS[bg]}`}>
        <IconRender icon={icon} style={style} size={140} />
      </div>

      <div>
        <p className="label-caps mb-2">Scale</p>
        <div className={`flex items-end justify-between gap-1 rounded-xl p-3 ${BG_CLASS[bg]}`}>
          {sizes.map((s) => (
            <div key={s} className="flex flex-col items-center gap-1.5">
              <IconRender icon={icon} style={style} size={s} />
              <span className="mono text-[10px] text-[var(--muted)] opacity-80">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyButton text={svg} label="Copy SVG" variant="primary" />
        <CopyButton text={jsx} label="Copy JSX" />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => download(`${icon.slug}.svg`, svg)}
        >
          SVG file
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => downloadPng(`${icon.slug}.png`, toSvg(icon, { ...style, size: 512 }), 512)}
        >
          PNG file
        </button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="label-caps">Export</p>
          <div className="flex rounded-lg bg-[var(--surface-2)] p-0.5" role="group" aria-label="Export format">
            {(["svg", "jsx"] as ExportFmt[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setExportFmt(f)}
                aria-pressed={exportFmt === f}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  exportFmt === f
                    ? "bg-white text-[var(--fg)] shadow-sm"
                    : "text-[var(--muted)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <pre className="max-h-40 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 font-mono text-[11px] leading-relaxed text-[var(--muted)]">
          {code}
        </pre>
      </div>
    </aside>
  );
}

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3v18M3 12h18"/>
</svg>`;

function EditorView({ bg, setBg }: { bg: Bg; setBg: (b: Bg) => void }) {
  const [code, setCode] = useState(SAMPLE);
  const valid = /<svg[\s\S]*<\/svg>/i.test(code);

  return (
    <div className="flex flex-col gap-4">
      <section className="panel flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="label-caps">SVG editor</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Paste markup for a live preview. Stays local — nothing is uploaded.
          </p>
        </div>
        <div className="w-full max-w-xs sm:w-48">
          <BgToggle bg={bg} setBg={setBg} />
        </div>
        <span
          className={`chip ${
            valid
              ? "!border-[color-mix(in_srgb,var(--color-mint)_35%,var(--border))] !text-[var(--color-mint)]"
              : "!border-[color-mix(in_srgb,var(--color-warn)_35%,var(--border))] !text-[var(--color-warn)]"
          }`}
        >
          {valid ? "Valid SVG" : "Waiting for SVG"}
        </span>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="panel flex flex-col gap-2 p-3 sm:p-4">
          <span className="label-caps">Source</span>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            aria-label="SVG source"
            className="field h-[min(520px,70vh)] resize-none !bg-[var(--surface-2)] p-4 font-mono text-xs leading-relaxed shadow-none"
          />
        </label>

        <div className="flex flex-col gap-3">
          <span className="label-caps px-1">Preview</span>
          <div
            className={`flex min-h-[320px] flex-1 items-center justify-center rounded-[calc(var(--radius)+2px)] border border-[var(--border)] p-8 ${BG_CLASS[bg]}`}
          >
            {valid ? (
              <div
                className="flex max-h-full max-w-full items-center justify-center [&>svg]:max-h-[280px] [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: code }}
              />
            ) : (
              <p className="text-sm text-[var(--muted)]">Paste a complete &lt;svg&gt;…&lt;/svg&gt; block.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={code} label="Copy SVG" variant="primary" />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!valid}
              onClick={() => download("icon.svg", code)}
            >
              Download SVG
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setCode(SAMPLE)}>
              Reset sample
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

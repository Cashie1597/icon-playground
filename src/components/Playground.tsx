"use client";

import { useMemo, useState } from "react";
import type { IconDef } from "@/icons.generated";
import { DEFAULT_STYLE, type IconStyle, toSvg, toJsx } from "@/lib/render";
import { IconRender } from "./IconRender";
import { CopyButton } from "./CopyButton";

type Bg = "dark" | "light" | "checker";
type Tab = "library" | "editor";

const BG_CLASS: Record<Bg, string> = {
  dark: "bg-[#0c0717]",
  light: "bg-white",
  checker: "checker bg-[#140c26]",
};

const GRAD_BTN =
  "rounded-lg bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-500 bg-[length:200%_200%] animate-gradient px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-fuchsia-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:active:scale-100";

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Rasterize an SVG string to a PNG at `size` px and download it. Browser-only,
// no dependencies — draws the SVG onto a canvas via an Image.
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

export function Playground({ icons }: { icons: IconDef[] }) {
  const [tab, setTab] = useState<Tab>("library");
  const [style, setStyle] = useState<IconStyle>(DEFAULT_STYLE);
  const [bg, setBg] = useState<Bg>("dark");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<IconDef | null>(icons[0] ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return icons;
    return icons.filter((i) => i.slug.includes(q) || i.name.toLowerCase().includes(q));
  }, [icons, query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-violet-200/80">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 animate-gradient bg-[length:200%_200%]" />
            Private preview
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gradient sm:text-5xl">
            Icon Playground
          </h1>
          <p className="mt-2 text-sm text-violet-200/60">
            Canonical set ·{" "}
            <span className="font-semibold text-violet-100">{icons.length} icons</span> · edit,
            preview &amp; export
          </p>
        </div>
        <nav className="flex rounded-xl glass p-1 text-sm">
          {(["library", "editor"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 font-semibold transition ${
                tab === t
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30"
                  : "text-violet-200/60 hover:text-violet-100"
              }`}
            >
              {t === "library" ? "Library" : "SVG Editor"}
            </button>
          ))}
        </nav>
      </header>

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
        />
      ) : (
        <EditorView bg={bg} setBg={setBg} />
      )}
    </div>
  );
}

function BgToggle({ bg, setBg }: { bg: Bg; setBg: (b: Bg) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-violet-200/50">BG</span>
      {(["dark", "light", "checker"] as Bg[]).map((b) => (
        <button
          key={b}
          onClick={() => setBg(b)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${
            bg === b
              ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
              : "bg-white/5 text-violet-200/60 hover:bg-white/10 hover:text-violet-100"
          }`}
        >
          {b}
        </button>
      ))}
    </div>
  );
}

function Controls({
  style,
  setStyle,
  bg,
  setBg,
}: {
  style: IconStyle;
  setStyle: (s: IconStyle) => void;
  bg: Bg;
  setBg: (b: Bg) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl glass px-5 py-4 text-sm">
      <label className="flex items-center gap-2">
        <span className="text-violet-200/50">Size</span>
        <input
          type="range"
          min={16}
          max={128}
          value={style.size}
          onChange={(e) => setStyle({ ...style, size: +e.target.value })}
        />
        <span className="w-9 tabular-nums text-violet-100">{style.size}</span>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-violet-200/50">Color</span>
        <input
          type="color"
          value={style.color}
          onChange={(e) => setStyle({ ...style, color: e.target.value })}
          className="h-7 w-9 cursor-pointer rounded-md border border-white/10 bg-transparent"
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-violet-200/50">Stroke</span>
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.5}
          value={style.strokeWidth}
          onChange={(e) => setStyle({ ...style, strokeWidth: +e.target.value })}
        />
        <span className="w-7 tabular-nums text-violet-100">{style.strokeWidth}</span>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-violet-200/50">Rotate</span>
        <input
          type="range"
          min={0}
          max={360}
          value={style.rotate}
          onChange={(e) => setStyle({ ...style, rotate: +e.target.value })}
        />
        <span className="w-9 tabular-nums text-violet-100">{style.rotate}°</span>
      </label>
      <BgToggle bg={bg} setBg={setBg} />
      <button
        onClick={() => setStyle(DEFAULT_STYLE)}
        className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-xs text-violet-200/60 hover:border-white/20 hover:text-violet-100"
      >
        Reset
      </button>
    </div>
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
}) {
  return (
    <div className="space-y-5">
      <Controls style={style} setStyle={setStyle} bg={bg} setBg={setBg} />
      <input
        type="search"
        placeholder={`Search ${total} icons…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xl glass px-4 py-3 text-sm text-violet-50 placeholder:text-violet-200/40 outline-none focus:glow"
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
          {icons.map((icon) => {
            const active = selected?.slug === icon.slug;
            return (
              <button
                key={icon.slug}
                onClick={() => setSelected(icon)}
                title={icon.name}
                className={`group flex flex-col items-center gap-2 rounded-2xl p-3 transition duration-200 hover:-translate-y-1 ${
                  active ? "glass glow" : "glass hover:border-white/20"
                }`}
              >
                <div
                  className={`flex h-20 w-full items-center justify-center rounded-xl ${BG_CLASS[bg]} transition group-hover:scale-[1.03]`}
                >
                  <IconRender icon={icon} style={style} size={Math.min(style.size, 72)} />
                </div>
                <span
                  className={`w-full truncate text-center text-xs transition ${
                    active ? "font-semibold text-violet-100" : "text-violet-200/50 group-hover:text-violet-100"
                  }`}
                >
                  {icon.name}
                </span>
              </button>
            );
          })}
          {icons.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-2 py-16 text-center">
              <span className="text-3xl">🔍</span>
              <p className="text-sm text-violet-200/50">No icons match that search.</p>
            </div>
          )}
        </div>
        {selected && <DetailPanel icon={selected} style={style} bg={bg} />}
      </div>
    </div>
  );
}

function DetailPanel({ icon, style, bg }: { icon: IconDef; style: IconStyle; bg: Bg }) {
  const svg = toSvg(icon, style);
  const jsx = toJsx(icon);
  const sizes = [16, 24, 32, 48, 64, 96];
  return (
    <aside className="h-fit space-y-4 rounded-2xl glass p-5">
      <div>
        <h2 className="text-lg font-bold text-violet-50">{icon.name}</h2>
        <p className="font-mono text-xs text-fuchsia-300/70">{icon.slug}</p>
      </div>
      <div
        className={`flex items-center justify-center rounded-xl p-8 ${BG_CLASS[bg]} ring-1 ring-white/5`}
      >
        <IconRender icon={icon} style={style} size={128} />
      </div>
      <div className={`flex items-end justify-between gap-2 rounded-xl p-3 ${BG_CLASS[bg]} ring-1 ring-white/5`}>
        {sizes.map((s) => (
          <div key={s} className="flex flex-col items-center gap-1">
            <IconRender icon={icon} style={style} size={s} />
            <span className="text-[10px] text-violet-200/40">{s}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={svg} label="Copy SVG" />
        <CopyButton text={jsx} label="Copy JSX" />
        <button onClick={() => download(`${icon.slug}.svg`, svg)} className={GRAD_BTN}>
          Download .svg
        </button>
        <button
          onClick={() => downloadPng(`${icon.slug}.png`, toSvg(icon, { ...style, size: 512 }), 512)}
          className={GRAD_BTN}
        >
          Download .png
        </button>
      </div>
      <pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-violet-200/70">
        {svg}
      </pre>
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
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl glass px-5 py-3 text-sm">
        <BgToggle bg={bg} setBg={setBg} />
        <span className={`ml-auto text-xs font-medium ${valid ? "text-emerald-300" : "text-rose-300"}`}>
          {valid ? "● valid SVG" : "● waiting for valid SVG"}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="h-[480px] w-full resize-none rounded-2xl glass p-4 font-mono text-xs leading-relaxed text-violet-50 outline-none focus:glow"
        />
        <div className="space-y-3">
          <div
            className={`flex h-[400px] items-center justify-center rounded-2xl ${BG_CLASS[bg]} ring-1 ring-white/10`}
            dangerouslySetInnerHTML={valid ? { __html: code } : undefined}
          >
            {!valid ? <span className="text-sm text-violet-200/40">Paste valid SVG markup…</span> : null}
          </div>
          <div className="flex gap-2">
            <CopyButton text={code} label="Copy SVG" />
            <button onClick={() => download("icon.svg", code)} disabled={!valid} className={GRAD_BTN}>
              Download .svg
            </button>
            <button
              onClick={() => setCode(SAMPLE)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-violet-200/60 hover:border-white/20 hover:text-violet-100"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
import {
  DEFAULT_STYLE,
  STYLE_PRESETS,
  displayName,
  toCssDataUri,
  toJsx,
  toSprite,
  toSvg,
  type IconStyle,
} from "@/lib/render";
import { loadJson, loadStringSet, saveJson, saveStringSet } from "@/lib/storage";
import { IconRender } from "./IconRender";
import { CopyButton } from "./CopyButton";

type Bg = "dark" | "light" | "checker";
type Tab = "library" | "editor";
type ExportFmt = "svg" | "jsx" | "css";
type Density = "comfortable" | "compact";
type LayoutMode = "grid" | "list";
type Theme = "light" | "dark";
type SortMode = "default" | "name" | "favorites";
type FilterMode = "all" | "favorites";

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

const PNG_SIZES = [128, 256, 512, 1024] as const;

const THEME_KEY = "icon-playground-theme";
const STYLE_KEY = "icon-playground-style";
const FAV_KEY = "icon-playground-favorites";
const RECENT_KEY = "icon-playground-recent";
const COMPARE_MAX = 4;
const RECENT_MAX = 8;

function download(filename: string, text: string, mime = "image/svg+xml") {
  const blob = new Blob([text], { type: mime });
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

async function copyPng(svg: string, size = 512): Promise<boolean> {
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
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, size, size);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
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

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill={filled ? "currentColor" : "none"}>
      <path
        d="M12 3.5l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.4 6.6 20.3l1-6.1L3.2 9.9l6.1-.9L12 3.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function slugFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get("icon");
  } catch {
    return null;
  }
}

type Toast = { id: number; message: string };

export function Playground({ icons }: { icons: IconDef[] }) {
  const [tab, setTab] = useState<Tab>("library");
  const [style, setStyle] = useState<IconStyle>(DEFAULT_STYLE);
  const styleLoaded = useRef(false);
  const [bg, setBg] = useState<Bg>("dark");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<IconDef | null>(() => {
    const slug = typeof window !== "undefined" ? slugFromUrl() : null;
    if (slug) return icons.find((i) => i.slug === slug) ?? icons[0] ?? null;
    return icons[0] ?? null;
  });
  const [density, setDensity] = useState<Density>("comfortable");
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [theme, setTheme] = useState<Theme>("light");
  const [compare, setCompare] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [recent, setRecent] = useState<string[]>([]);
  const [sort, setSort] = useState<SortMode>("default");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [pngSize, setPngSize] = useState<number>(512);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastId = useRef(0);

  const pushToast = useCallback((message: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2200);
  }, []);

  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    setFavorites(loadStringSet(FAV_KEY));
    setRecent(loadJson<string[]>(RECENT_KEY, []));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    saveStringSet(FAV_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    saveJson(RECENT_KEY, recent);
  }, [recent]);

  useEffect(() => {
    const saved = loadJson<Partial<IconStyle>>(STYLE_KEY, {});
    if (saved && typeof saved === "object") {
      setStyle({ ...DEFAULT_STYLE, ...saved });
    }
    styleLoaded.current = true;
  }, []);

  useEffect(() => {
    if (styleLoaded.current) saveJson(STYLE_KEY, style);
  }, [style]);

  useEffect(() => {
    if (!selected || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("icon", selected.slug);
    window.history.replaceState({}, "", url.toString());
    setRecent((prev) => {
      const next = [selected.slug, ...prev.filter((s) => s !== selected.slug)].slice(0, RECENT_MAX);
      return next;
    });
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = icons;
    if (filter === "favorites") {
      list = list.filter((i) => favorites.has(i.slug));
    }
    if (q) {
      list = list.filter(
        (i) =>
          i.slug.includes(q) ||
          i.name.toLowerCase().includes(q) ||
          displayName(i.name).toLowerCase().includes(q),
      );
    }
    if (sort === "name") {
      list = [...list].sort((a, b) => displayName(a.name).localeCompare(displayName(b.name)));
    } else if (sort === "favorites") {
      list = [...list].sort((a, b) => {
        const af = favorites.has(a.slug) ? 0 : 1;
        const bf = favorites.has(b.slug) ? 0 : 1;
        if (af !== bf) return af - bf;
        return displayName(a.name).localeCompare(displayName(b.name));
      });
    }
    return list;
  }, [icons, query, filter, sort, favorites]);

  const selectedIndex = useMemo(() => {
    if (!selected) return -1;
    return filtered.findIndex((i) => i.slug === selected.slug);
  }, [filtered, selected]);

  const compareIcons = useMemo(
    () => compare.map((slug) => icons.find((i) => i.slug === slug)).filter(Boolean) as IconDef[],
    [compare, icons],
  );

  const recentIcons = useMemo(
    () => recent.map((slug) => icons.find((i) => i.slug === slug)).filter(Boolean) as IconDef[],
    [recent, icons],
  );

  const selectByOffset = useCallback(
    (delta: number) => {
      if (filtered.length === 0) return;
      const base = selectedIndex < 0 ? 0 : selectedIndex;
      const next = (base + delta + filtered.length) % filtered.length;
      setSelected(filtered[next]);
    },
    [filtered, selectedIndex],
  );

  const pickRandom = useCallback(() => {
    if (filtered.length === 0) return;
    const idx = Math.floor(Math.random() * filtered.length);
    setSelected(filtered[idx]);
  }, [filtered]);

  const toggleCompare = useCallback((slug: string) => {
    setCompare((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= COMPARE_MAX) return [...prev.slice(1), slug];
      return [...prev, slug];
    });
  }, []);

  const toggleFavorite = useCallback(
    (slug: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(slug)) {
          next.delete(slug);
          pushToast("Removed from favorites");
        } else {
          next.add(slug);
          pushToast("Added to favorites");
        }
        return next;
      });
    },
    [pushToast],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "?" && !typing) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setHelpOpen(false);
        return;
      }
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
      } else if (e.key === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        pickRandom();
      } else if (e.key === "c" && selected && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleCompare(selected.slug);
      } else if (e.key === "f" && selected && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleFavorite(selected.slug);
      } else if (e.key === "t" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setTheme((th) => (th === "light" ? "dark" : "light"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickRandom, selectByOffset, selected, tab, toggleCompare, toggleFavorite]);

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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-sm"
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
              {favorites.size > 0 && <span className="chip mono">{favorites.size} ★</span>}
            </div>
            <h1 className="font-display truncate text-xl text-[var(--fg)] sm:text-2xl">Icon Playground</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="seg" role="group" aria-label="View">
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
                data-active={tab === item.id}
                aria-current={tab === item.id ? "page" : undefined}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-secondary !min-h-9 !px-3"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            title="Toggle theme (T)"
          >
            {theme === "light" ? "Dark" : "Light"}
          </button>
          <button
            type="button"
            className="btn btn-ghost !min-h-9 !px-3"
            onClick={() => setHelpOpen(true)}
            title="Shortcuts (?)"
          >
            ?
          </button>
        </div>
      </header>

      {tab === "library" && recentIcons.length > 0 && (
        <div className="mb-3 px-1">
          <p className="label-caps mb-1.5">Recent</p>
          <div className="recent-rail">
            {recentIcons.map((icon) => (
              <button
                key={icon.slug}
                type="button"
                className="recent-chip"
                data-active={selected?.slug === icon.slug}
                onClick={() => setSelected(icon)}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${BG_CLASS[bg]}`}>
                  <IconRender icon={icon} style={style} size={14} />
                </span>
                {displayName(icon.name)}
              </button>
            ))}
          </div>
        </div>
      )}

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
            layout={layout}
            setLayout={setLayout}
            searchRef={searchRef}
            selectedIndex={selectedIndex}
            compare={compare}
            toggleCompare={toggleCompare}
            pickRandom={pickRandom}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            sort={sort}
            setSort={setSort}
            filter={filter}
            setFilter={setFilter}
            pngSize={pngSize}
            setPngSize={setPngSize}
            pushToast={pushToast}
          />
        ) : (
          <EditorView bg={bg} setBg={setBg} pushToast={pushToast} />
        )}
      </main>

      {compareIcons.length > 0 && tab === "library" && (
        <div className="compare-bar">
          <div className="panel flex flex-wrap items-center gap-3 px-4 py-3">
            <p className="label-caps shrink-0">Compare</p>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              {compareIcons.map((icon) => (
                <button
                  key={icon.slug}
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5"
                  onClick={() => setSelected(icon)}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-md ${BG_CLASS[bg]}`}>
                    <IconRender icon={icon} style={style} size={20} />
                  </span>
                  <span className="max-w-[7rem] truncate text-xs font-semibold">{displayName(icon.name)}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="text-[var(--muted)] hover:text-[var(--fg)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompare(icon.slug);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCompare(icon.slug);
                      }
                    }}
                    aria-label={`Remove ${displayName(icon.name)}`}
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary !min-h-8 !px-2 !text-xs"
              onClick={() => {
                const sprite = toSprite(compareIcons, style);
                download("icons-sprite.svg", sprite);
                pushToast("Downloaded sprite SVG");
              }}
            >
              Sprite SVG
            </button>
            <button
              type="button"
              className="btn btn-ghost !min-h-8 !px-2 !text-xs"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(toSprite(compareIcons, style));
                  pushToast("Sprite copied");
                } catch {
                  pushToast("Copy failed");
                }
              }}
            >
              Copy sprite
            </button>
            <button type="button" className="btn btn-ghost !min-h-8 !px-2 !text-xs" onClick={() => setCompare([])}>
              Clear
            </button>
          </div>
        </div>
      )}

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[var(--muted)]">
        <p>
          Source <span className="mono text-[var(--fg)]">icons/</span>
        </p>
        <p className="mono">/ · ←→ · r · c · f · t · ?</p>
      </footer>

      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const rows = [
    ["/", "Focus search"],
    ["← → or j k", "Browse icons"],
    ["r", "Random icon"],
    ["c", "Toggle compare"],
    ["f", "Toggle favorite"],
    ["t", "Toggle theme"],
    ["?", "This help"],
    ["Esc", "Close dialog"],
  ] as const;

  return (
    <div className="help-overlay" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={onClose}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Shortcuts</h2>
          <button type="button" className="btn btn-ghost !min-h-8 !px-2" onClick={onClose}>
            Close
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {rows.map(([keys, label]) => (
            <li key={keys} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--muted)]">{label}</span>
              <span className="flex flex-wrap justify-end gap-1">
                {keys.split(" ").map((k) =>
                  k === "or" ? (
                    <span key={k} className="text-xs text-[var(--muted)]">
                      or
                    </span>
                  ) : (
                    <span key={k} className="kbd">
                      {k}
                    </span>
                  ),
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
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
                ? "bg-[var(--accent)] text-white"
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
  layout,
  setLayout,
  total,
  shown,
  searchRef,
  pickRandom,
  sort,
  setSort,
  filter,
  setFilter,
  favCount,
}: {
  style: IconStyle;
  setStyle: (s: IconStyle) => void;
  bg: Bg;
  setBg: (b: Bg) => void;
  query: string;
  setQuery: (q: string) => void;
  density: Density;
  setDensity: (d: Density) => void;
  layout: LayoutMode;
  setLayout: (l: LayoutMode) => void;
  total: number;
  shown: number;
  searchRef: RefObject<HTMLInputElement | null>;
  pickRandom: () => void;
  sort: SortMode;
  setSort: (s: SortMode) => void;
  filter: FilterMode;
  setFilter: (f: FilterMode) => void;
  favCount: number;
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
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="mono text-xs text-[var(--muted)]">{shown} shown</p>
          <button type="button" className="btn btn-ghost !min-h-8 !px-2 !text-xs" onClick={pickRandom}>
            Random
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <button
            type="button"
            className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${
              filter === "all" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
            }`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${
              filter === "favorites" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
            }`}
            onClick={() => setFilter("favorites")}
          >
            ★ {favCount}
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <p className="label-caps mb-2">Presets</p>
        <div className="flex flex-wrap gap-1.5">
          {STYLE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]"
              onClick={() => setStyle({ ...style, ...p.style })}
            >
              {p.label}
            </button>
          ))}
        </div>
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
            />
          </ControlField>
          <ControlField label="Rotate" value={`${style.rotate}°`}>
            <input
              type="range"
              min={0}
              max={360}
              value={style.rotate}
              onChange={(e) => setStyle({ ...style, rotate: +e.target.value })}
            />
          </ControlField>
          <ControlField label="Opacity" value={`${Math.round(style.opacity * 100)}%`}>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={style.opacity}
              onChange={(e) => setStyle({ ...style, opacity: +e.target.value })}
            />
          </ControlField>
          <div className="flex flex-col gap-1.5">
            <span className="label-caps">Flip</span>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                aria-pressed={style.flipX}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${
                  style.flipX ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
                onClick={() => setStyle({ ...style, flipX: !style.flipX })}
              >
                Horizontal
              </button>
              <button
                type="button"
                aria-pressed={style.flipY}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${
                  style.flipY ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
                onClick={() => setStyle({ ...style, flipY: !style.flipY })}
              >
                Vertical
              </button>
            </div>
          </div>
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
                className="h-7 w-7 rounded-full border border-[var(--border)] shadow-sm"
                style={{
                  background: c,
                  boxShadow: active ? `0 0 0 2px var(--surface), 0 0 0 4px var(--accent)` : undefined,
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
        <p className="label-caps mb-2">Sort</p>
        <div className="grid grid-cols-3 gap-1 mb-3">
          {(
            [
              { id: "default" as const, label: "Set" },
              { id: "name" as const, label: "A–Z" },
              { id: "favorites" as const, label: "★" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              aria-pressed={sort === s.id}
              className={`rounded-lg px-2 py-2 text-xs font-semibold ${
                sort === s.id ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="label-caps mb-2">Layout</p>
        <div className="mb-2 grid grid-cols-2 gap-1">
          {(
            [
              { id: "grid" as const, label: "Grid" },
              { id: "list" as const, label: "List" },
            ] as const
          ).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setLayout(d.id)}
              aria-pressed={layout === d.id}
              className={`rounded-lg px-2 py-2 text-xs font-semibold ${
                layout === d.id ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {layout === "grid" && (
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
                  density === d.id ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function LibraryView(props: {
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
  layout: LayoutMode;
  setLayout: (l: LayoutMode) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  selectedIndex: number;
  compare: string[];
  toggleCompare: (slug: string) => void;
  pickRandom: () => void;
  favorites: Set<string>;
  toggleFavorite: (slug: string) => void;
  sort: SortMode;
  setSort: (s: SortMode) => void;
  filter: FilterMode;
  setFilter: (f: FilterMode) => void;
  pngSize: number;
  setPngSize: (n: number) => void;
  pushToast: (m: string) => void;
}) {
  const {
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
    layout,
    setLayout,
    searchRef,
    selectedIndex,
    compare,
    toggleCompare,
    pickRandom,
    favorites,
    toggleFavorite,
    sort,
    setSort,
    filter,
    setFilter,
    pngSize,
    setPngSize,
    pushToast,
  } = props;

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
        layout={layout}
        setLayout={setLayout}
        total={total}
        shown={icons.length}
        searchRef={searchRef}
        pickRandom={pickRandom}
        sort={sort}
        setSort={setSort}
        filter={filter}
        setFilter={setFilter}
        favCount={favorites.size}
      />

      <section className="panel min-h-[420px] p-3 sm:p-4" aria-label="Icon collection">
        {icons.length === 0 ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-display text-2xl">No matches</p>
            <p className="max-w-xs text-sm text-[var(--muted)]">
              {filter === "favorites" ? "Star icons to build a favorites set." : "Try another term, or clear the filter."}
            </p>
            <div className="flex gap-2">
              {filter === "favorites" && (
                <button type="button" className="btn btn-secondary" onClick={() => setFilter("all")}>
                  Show all
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setQuery("")}>
                Clear search
              </button>
            </div>
          </div>
        ) : layout === "list" ? (
          <div className="flex flex-col gap-1">
            {icons.map((icon, idx) => {
              const active = selected?.slug === icon.slug;
              const inCompare = compare.includes(icon.slug);
              const fav = favorites.has(icon.slug);
              return (
                <div key={icon.slug} className="flex items-center gap-1">
                  <button
                    type="button"
                    className="list-row flex-1"
                    data-active={active}
                    onClick={() => setSelected(icon)}
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${BG_CLASS[bg]}`}>
                      <IconRender icon={icon} style={style} size={28} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{displayName(icon.name)}</span>
                      <span className="mono block truncate text-[11px] text-[var(--muted)]">{icon.slug}</span>
                    </span>
                    <span className="mono text-[10px] text-[var(--muted)]">{String(idx + 1).padStart(2, "0")}</span>
                  </button>
                  <button
                    type="button"
                    className={`btn star-btn !min-h-9 !px-2 ${fav ? "text-[#eab308]" : "btn-ghost"}`}
                    aria-pressed={fav}
                    onClick={() => toggleFavorite(icon.slug)}
                    title="Favorite"
                  >
                    <StarIcon filled={fav} />
                  </button>
                  <button
                    type="button"
                    className={`btn !min-h-9 !px-2 !text-xs ${inCompare ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => toggleCompare(icon.slug)}
                    title="Compare"
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minTile}px, 1fr))` }}
          >
            {icons.map((icon, idx) => {
              const active = selected?.slug === icon.slug;
              const inCompare = compare.includes(icon.slug);
              const fav = favorites.has(icon.slug);
              return (
                <div key={icon.slug} className="relative">
                  <button
                    type="button"
                    onClick={() => setSelected(icon)}
                    data-active={active}
                    className="icon-tile panel-flush flex w-full flex-col gap-2 p-2 text-left"
                    aria-current={active ? "true" : undefined}
                  >
                    <div className={`flex aspect-square items-center justify-center rounded-lg ${BG_CLASS[bg]}`}>
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
                  <button
                    type="button"
                    className={`star-btn absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md ${
                      fav
                        ? "bg-[color-mix(in_srgb,#eab308_20%,var(--surface))] text-[#eab308]"
                        : "bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] text-[var(--muted)]"
                    }`}
                    onClick={() => toggleFavorite(icon.slug)}
                    aria-pressed={fav}
                    title="Favorite"
                  >
                    <StarIcon filled={fav} />
                  </button>
                  <button
                    type="button"
                    className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                      inCompare
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] text-[var(--muted)]"
                    }`}
                    onClick={() => toggleCompare(icon.slug)}
                    aria-pressed={inCompare}
                    title="Compare"
                  >
                    +
                  </button>
                </div>
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
          indexLabel={selectedIndex >= 0 ? `${selectedIndex + 1} / ${icons.length}` : undefined}
          inCompare={compare.includes(selected.slug)}
          onToggleCompare={() => toggleCompare(selected.slug)}
          isFavorite={favorites.has(selected.slug)}
          onToggleFavorite={() => toggleFavorite(selected.slug)}
          pngSize={pngSize}
          setPngSize={setPngSize}
          pushToast={pushToast}
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
  inCompare,
  onToggleCompare,
  isFavorite,
  onToggleFavorite,
  pngSize,
  setPngSize,
  pushToast,
}: {
  icon: IconDef;
  style: IconStyle;
  bg: Bg;
  indexLabel?: string;
  inCompare: boolean;
  onToggleCompare: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  pngSize: number;
  setPngSize: (n: number) => void;
  pushToast: (m: string) => void;
}) {
  const [exportFmt, setExportFmt] = useState<ExportFmt>("svg");
  const svg = toSvg(icon, style);
  const jsx = toJsx(icon, style);
  const css = toCssDataUri(icon, style);
  const sizes = [16, 24, 32, 48, 64, 96];
  const code = exportFmt === "svg" ? svg : exportFmt === "jsx" ? jsx : css;

  return (
    <aside className="panel detail-in flex h-fit flex-col gap-4 p-4 lg:sticky lg:top-3" aria-label="Icon detail">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">Selected</p>
          <h2 className="font-display mt-1 truncate text-2xl leading-tight">{displayName(icon.name)}</h2>
          <p className="mono mt-1 text-xs text-[var(--accent)]">{icon.slug}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className={`btn star-btn !min-h-8 !px-2 ${isFavorite ? "text-[#eab308]" : "btn-ghost"}`}
            aria-pressed={isFavorite}
            onClick={onToggleFavorite}
            title="Favorite (F)"
          >
            <StarIcon filled={isFavorite} />
          </button>
          {indexLabel && <span className="chip mono">{indexLabel}</span>}
        </div>
      </div>

      <div className={`flex items-center justify-center rounded-xl p-10 ${BG_CLASS[bg]}`}>
        <span key={icon.slug} className="preview-pop flex items-center justify-center">
          <IconRender icon={icon} style={style} size={140} />
        </span>
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

      <div>
        <p className="label-caps mb-2">PNG size</p>
        <div className="grid grid-cols-4 gap-1">
          {PNG_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPngSize(s)}
              aria-pressed={pngSize === s}
              className={`rounded-lg px-1 py-1.5 text-[11px] font-semibold mono ${
                pngSize === s ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyButton text={svg} label="Copy SVG" variant="primary" />
        <CopyButton text={jsx} label="Copy JSX" />
        <CopyButton text={css} label="Copy CSS" />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={async () => {
            const ok = await copyPng(toSvg(icon, { ...style, size: pngSize }), pngSize);
            pushToast(ok ? `Copied PNG ${pngSize}px` : "Copy failed");
          }}
        >
          Copy PNG
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            download(`${icon.slug}.svg`, svg);
            pushToast("Downloaded SVG");
          }}
        >
          SVG file
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            downloadPng(`${icon.slug}-${pngSize}.png`, toSvg(icon, { ...style, size: pngSize }), pngSize);
            pushToast(`Downloaded PNG ${pngSize}px`);
          }}
        >
          PNG {pngSize}
        </button>
        <button
          type="button"
          className={`btn ${inCompare ? "btn-primary" : "btn-secondary"}`}
          onClick={onToggleCompare}
          aria-pressed={inCompare}
        >
          {inCompare ? "In compare" : "Compare"}
        </button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="label-caps">Export</p>
          <div className="seg" role="group" aria-label="Export format">
            {(["svg", "jsx", "css"] as ExportFmt[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setExportFmt(f)}
                data-active={exportFmt === f}
                aria-pressed={exportFmt === f}
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

function EditorView({
  bg,
  setBg,
  pushToast,
}: {
  bg: Bg;
  setBg: (b: Bg) => void;
  pushToast: (m: string) => void;
}) {
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
              onClick={() => {
                download("icon.svg", code);
                pushToast("Downloaded SVG");
              }}
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

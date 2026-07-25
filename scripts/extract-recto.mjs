// One-off: extract Recto <symbol> concepts from an icon-options HTML file
// into standalone SVGs under icons/. Safe to re-run (overwrites).
//
// Usage:
//   node scripts/extract-recto.mjs [path/to/icon-options.html]
//   RECTO_HTML=../recto/icon-options.html node scripts/extract-recto.mjs
//
// No machine-specific paths are hard-coded.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  process.argv[2],
  process.env.RECTO_HTML,
  join(root, "recto", "icon-options.html"),
  join(root, "..", "recto", "icon-options.html"),
].filter(Boolean);

const NAMES = {
  ic1: "01-turning-page",
  ic2: "02-clean-open-book",
  ic3: "03-monogram-r",
  ic4: "04-markdown-page",
  ic5: "05-page-duotone",
  ic6: "06-folded-corner-page",
  ic7: "07-markdown-mark",
  ic8: "08-stacked-sheets",
  ic9: "09-bookmark-ribbon",
  ic10: "10-pilcrow",
  ic11: "11-outline-open-book",
  ic12: "12-right-tab",
};

async function resolveSrc() {
  for (const c of candidates) {
    const p = resolve(c);
    try {
      await access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}

const src = await resolveSrc();
if (!src) {
  console.error(
    "[extract-recto] No icon-options.html found.\n" +
      "  Pass a path: node scripts/extract-recto.mjs /path/to/icon-options.html\n" +
      "  Or set RECTO_HTML=...",
  );
  process.exit(1);
}

const outDir = join(root, "icons");
const html = await readFile(src, "utf8");
const re = /<symbol\s+id="(ic\d+)"\s+viewBox="([^"]+)"\s*>([\s\S]*?)<\/symbol>/g;
await mkdir(outDir, { recursive: true });

let count = 0;
let m;
while ((m = re.exec(html))) {
  const [, id, viewBox, body] = m;
  const name = NAMES[id] || id;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">\n` +
    body.trim() +
    `\n</svg>\n`;
  await writeFile(join(outDir, `${name}.svg`), svg, "utf8");
  count++;
}
console.log(`[extract-recto] read ${src}`);
console.log(`[extract-recto] wrote ${count} icon(s) to icons/`);
if (count !== 12) console.warn(`[extract-recto] expected 12, got ${count}`);

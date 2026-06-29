// One-off: extract the 12 Recto <symbol> concepts from recto/icon-options.html
// into standalone SVGs under icons/. Safe to re-run (overwrites).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = "/Users/cashie/PROJECTS/recto/icon-options.html";
const outDir = join(root, "icons");

const NAMES = {
  ic1: "01-turning-recto-page",
  ic2: "02-clean-open-book",
  ic3: "03-monogram-r",
  ic4: "04-markdown-page",
  ic5: "05-recto-verso-duotone",
  ic6: "06-folded-corner-page",
  ic7: "07-markdown-mark",
  ic8: "08-stacked-sheets",
  ic9: "09-bookmark-ribbon",
  ic10: "10-pilcrow",
  ic11: "11-outline-open-book",
  ic12: "12-right-tab-recto",
};

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
console.log(`[extract-recto] wrote ${count} icon(s) to icons/`);
if (count !== 12) console.warn(`[extract-recto] expected 12, got ${count}`);

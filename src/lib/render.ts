import type { IconDef } from "@/icons.generated";

export type IconStyle = {
  size: number;
  color: string;
  strokeWidth: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
};

export const DEFAULT_STYLE: IconStyle = {
  size: 48,
  color: "#e8eef8",
  strokeWidth: 2,
  rotate: 0,
  flipX: false,
  flipY: false,
};

function viewBoxCenter(viewBox: string): { cx: number; cy: number } {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
    return { cx: parts[0] + parts[2] / 2, cy: parts[1] + parts[3] / 2 };
  }
  return { cx: 12, cy: 12 };
}

function transformAttrs(icon: IconDef, style: IconStyle): string {
  const { cx, cy } = viewBoxCenter(icon.viewBox);
  const parts: string[] = [];
  if (style.rotate) parts.push(`rotate(${style.rotate} ${cx} ${cy})`);
  if (style.flipX || style.flipY) {
    const sx = style.flipX ? -1 : 1;
    const sy = style.flipY ? -1 : 1;
    parts.push(`translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
  }
  if (!parts.length) return "";
  return ` transform="${parts.join(" ")}"`;
}

/** Standalone styled SVG for preview, clipboard, and file export. */
export function toSvg(icon: IconDef, style: IconStyle): string {
  const strokeAttrs = icon.usesStroke
    ? ` stroke="currentColor" stroke-width="${style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"`
    : ` fill="currentColor"`;
  const t = transformAttrs(icon, style);
  const body = t ? `<g${t}>${icon.body}</g>` : icon.body;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${style.size}" height="${style.size}"` +
    ` viewBox="${icon.viewBox}" color="${style.color}"${strokeAttrs}>` +
    body +
    `</svg>`
  );
}

/** React/JSX component source. */
export function toJsx(icon: IconDef, style?: Pick<IconStyle, "strokeWidth">): string {
  const stroke = style?.strokeWidth ?? 2;
  const props = icon.usesStroke
    ? `width={size} height={size} viewBox="${icon.viewBox}" fill="none" stroke="currentColor" strokeWidth={${stroke}} strokeLinecap="round" strokeLinejoin="round"`
    : `width={size} height={size} viewBox="${icon.viewBox}" fill="currentColor"`;
  const body = icon.body
    .replace(/stroke-width/g, "strokeWidth")
    .replace(/stroke-linecap/g, "strokeLinecap")
    .replace(/stroke-linejoin/g, "strokeLinejoin")
    .replace(/fill-rule/g, "fillRule")
    .replace(/clip-rule/g, "clipRule");
  const comp = icon.name.replace(/^\d+\s+/, "").replace(/[^a-zA-Z0-9]/g, "") || "Icon";
  return (
    `export function ${comp}Icon({ size = 24 }: { size?: number }) {\n` +
    `  return (\n    <svg ${props}>\n      ${body}\n    </svg>\n  );\n}`
  );
}

/** CSS background-image snippet with data URI. */
export function toCssDataUri(icon: IconDef, style: IconStyle): string {
  const svg = toSvg(icon, style);
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return (
    `.icon-${icon.slug} {\n` +
    `  width: ${style.size}px;\n` +
    `  height: ${style.size}px;\n` +
    `  background: no-repeat center / contain\n` +
    `    url("data:image/svg+xml,${encoded}");\n` +
    `}`
  );
}

export function displayName(name: string): string {
  return name.replace(/^\d+\s+/, "");
}

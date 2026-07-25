import type { IconDef } from "@/icons.generated";

export type IconStyle = {
  size: number;
  color: string;
  strokeWidth: number;
  rotate: number;
};

export const DEFAULT_STYLE: IconStyle = {
  size: 48,
  color: "#f4efe4",
  strokeWidth: 2,
  rotate: 0,
};

// Build a standalone, styled SVG string for an icon. Used for the live preview,
// copy-to-clipboard, and file export. `currentColor` is resolved to the chosen
// color so the exported file is self-contained.
export function toSvg(icon: IconDef, style: IconStyle): string {
  const strokeAttrs = icon.usesStroke
    ? ` stroke="currentColor" stroke-width="${style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"`
    : ` fill="currentColor"`;
  const transform = style.rotate ? ` transform="rotate(${style.rotate} 12 12)"` : "";
  const body = transform ? `<g${transform}>${icon.body}</g>` : icon.body;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${style.size}" height="${style.size}"` +
    ` viewBox="${icon.viewBox}" color="${style.color}"${strokeAttrs}>` +
    body +
    `</svg>`
  );
}

// React/JSX-friendly variant for copy-as-JSX.
export function toJsx(icon: IconDef): string {
  const props = icon.usesStroke
    ? `width={size} height={size} viewBox="${icon.viewBox}" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"`
    : `width={size} height={size} viewBox="${icon.viewBox}" fill="currentColor"`;
  const body = icon.body
    .replace(/stroke-width/g, "strokeWidth")
    .replace(/stroke-linecap/g, "strokeLinecap")
    .replace(/stroke-linejoin/g, "strokeLinejoin")
    .replace(/fill-rule/g, "fillRule")
    .replace(/clip-rule/g, "clipRule");
  const comp = icon.name.replace(/[^a-zA-Z0-9]/g, "");
  return (
    `export function ${comp}Icon({ size = 24 }: { size?: number }) {\n` +
    `  return (\n    <svg ${props}>\n      ${body}\n    </svg>\n  );\n}`
  );
}

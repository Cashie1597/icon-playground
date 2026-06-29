import type { IconDef } from "@/icons.generated";
import type { IconStyle } from "@/lib/render";

// Renders an icon's inner SVG body with the active style. Icon bodies come from
// our own canonical manifest, so dangerouslySetInnerHTML is trusted here.
export function IconRender({
  icon,
  style,
  size,
}: {
  icon: IconDef;
  style: IconStyle;
  size?: number;
}) {
  const px = size ?? style.size;
  const strokeProps = icon.usesStroke
    ? {
        stroke: "currentColor",
        strokeWidth: style.strokeWidth,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        fill: "none",
      }
    : { fill: "currentColor" };
  return (
    <svg
      width={px}
      height={px}
      viewBox={icon.viewBox}
      color={style.color}
      style={{ transform: style.rotate ? `rotate(${style.rotate}deg)` : undefined }}
      {...strokeProps}
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}

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

  const transforms: string[] = [];
  if (style.rotate) transforms.push(`rotate(${style.rotate}deg)`);
  if (style.flipX) transforms.push("scaleX(-1)");
  if (style.flipY) transforms.push("scaleY(-1)");

  return (
    <svg
      width={px}
      height={px}
      viewBox={icon.viewBox}
      color={style.color}
      opacity={style.opacity < 0.999 ? style.opacity : undefined}
      style={{
        transform: transforms.length ? transforms.join(" ") : undefined,
        transition: "transform 160ms ease, opacity 160ms ease, color 160ms ease",
      }}
      {...strokeProps}
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export type StampSize = "sm" | "md" | "lg";

export type StampProps = {
  children: React.ReactNode;
  /** Second line under the main text — a date, a reference, an initial. */
  sub?: React.ReactNode;
  /** Rotation in degrees. Real stamps are never square to the page. */
  rotate?: number;
  /** Ink colour. Any CSS colour. */
  color?: string;
  size?: StampSize;
  /** Eat away at the ink so it reads as pressed rather than printed. */
  distress?: boolean;
  /**
   * Accessible name. Defaults to the text content when `children` is a string;
   * pass it explicitly for anything else, or null to mark the stamp decorative.
   */
  ariaLabel?: string | null;
  className?: string;
};

const SIZE: Record<StampSize, { box: string; text: string; sub: string; border: number }> = {
  sm: { box: "px-2 py-0.5 gap-0", text: "text-[10px] tracking-[0.2em]", sub: "text-[7px] tracking-[0.16em]", border: 1 },
  md: { box: "px-3 py-1 gap-0.5", text: "text-sm tracking-[0.22em]", sub: "text-[9px] tracking-[0.18em]", border: 2 },
  lg: { box: "px-5 py-2 gap-1", text: "text-xl tracking-[0.24em]", sub: "text-[11px] tracking-[0.2em]", border: 3 },
};

// A coarse turbulence used as a mask: the light parts of the noise keep ink,
// the dark parts remove it, which is what a dry stamp pad actually does. Shared
// by every instance, so it costs one string.
const DISTRESS_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>" +
    "<filter id='d'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>" +
    "<feComponentTransfer><feFuncA type='linear' slope='2.4' intercept='-0.5'/></feComponentTransfer></filter>" +
    "<rect width='120' height='120' filter='url(#d)'/></svg>",
)}")`;

/**
 * Rubber-stamp overlay — mono uppercase inside a double rule, rotated off
 * square and optionally distressed.
 *
 * Distinct from `badge`, which is a flat inline chip that participates in a
 * row of metadata. A stamp is an *assertion applied on top of* something: it
 * rotates, it overlaps, and it usually sits absolutely positioned over the
 * document it marks.
 *
 * The distress is a turbulence mask rather than a texture image, so it inherits
 * the ink colour automatically and there is nothing to load.
 */
export function Stamp({
  children,
  sub,
  rotate = -12,
  color = "rgba(255,255,255,0.55)",
  size = "md",
  distress = true,
  ariaLabel,
  className,
}: StampProps) {
  const spec = SIZE[size];
  const label =
    ariaLabel === null
      ? undefined
      : (ariaLabel ?? (typeof children === "string" ? children : undefined));

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{
        color,
        transform: `rotate(${rotate}deg)`,
        borderWidth: spec.border,
        ...(distress
          ? {
              maskImage: DISTRESS_MASK,
              WebkitMaskImage: DISTRESS_MASK,
              maskSize: "120px 120px",
              WebkitMaskSize: "120px 120px",
            }
          : null),
      }}
      className={cn(
        "relative inline-flex select-none flex-col items-center border-current font-mono uppercase",
        spec.box,
        className,
      )}
    >
      {/* The inner rule needs a transparent gap from the outer one, which a
          box-shadow can't give on a transparent background — so it's a real
          inset element. */}
      <span aria-hidden className="pointer-events-none absolute inset-[3px] border border-current opacity-60" />
      <span className={cn("relative leading-none", spec.text)}>{children}</span>
      {sub != null ? (
        <span className={cn("relative leading-none opacity-70", spec.sub)}>{sub}</span>
      ) : null}
    </span>
  );
}

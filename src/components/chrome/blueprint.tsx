"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type BlueprintFade = "none" | "radial" | "top" | "bottom";

export type BlueprintProps = {
  /** Minor grid pitch in px. */
  cell?: number;
  /** Minor cells per major line. 0 draws minor lines only. */
  major?: number;
  /** Colour of the minor lines. Any CSS colour. */
  color?: string;
  /** Colour of the major lines. Defaults to `color` at roughly double strength. */
  majorColor?: string;
  /** Softens the grid toward the edges so it reads as a substrate, not a table. */
  fade?: BlueprintFade;
  /** Draw L-shaped registration marks in the four corners. */
  ticks?: boolean;
  /**
   * Track the pointer with full-bleed rules and a mono coordinate readout.
   * Ignored for coarse pointers — a crosshair that only appears mid-tap is noise.
   */
  crosshair?: boolean;
  /** Formats the crosshair readout. Defaults to grid cell coordinates. */
  formatCoordinate?: (x: number, y: number, cell: number) => string;
  as?: React.ElementType;
  children?: React.ReactNode;
  className?: string;
};

const FADE_MASK: Record<BlueprintFade, string | undefined> = {
  none: undefined,
  radial: "radial-gradient(ellipse at center, black 35%, transparent 78%)",
  top: "linear-gradient(to bottom, black 0%, transparent 85%)",
  bottom: "linear-gradient(to top, black 0%, transparent 85%)",
};

const defaultCoordinate = (x: number, y: number, cell: number) =>
  `${Math.round(x / cell)}, ${Math.round(y / cell)}`;

/**
 * Engineering graph-paper substrate.
 *
 * The grid is four stacked linear-gradients on one element rather than a tiled
 * image: it stays crisp at any zoom, costs no request, and the major lines can
 * be recoloured independently by reordering the layers (major is declared
 * first, so it paints over the minor line it shares a pixel with).
 *
 * Colours come in through CSS custom properties, so the component itself never
 * hardcodes anything but white — a consuming site can point them at its own
 * accent without editing the installed copy.
 */
export function Blueprint({
  cell = 8,
  major = 5,
  color = "rgba(255,255,255,0.05)",
  majorColor,
  fade = "none",
  ticks = false,
  crosshair = false,
  formatCoordinate = defaultCoordinate,
  as,
  children,
  className,
}: BlueprintProps) {
  const Tag = as ?? "div";
  const [point, setPoint] = React.useState<{ x: number; y: number } | null>(null);

  const majorPx = major > 0 ? cell * major : 0;
  const majorLine = majorColor ?? "rgba(255,255,255,0.1)";
  const mask = FADE_MASK[fade];

  const layers = [
    majorPx > 0 && `linear-gradient(to right, ${majorLine} 1px, transparent 1px)`,
    majorPx > 0 && `linear-gradient(to bottom, ${majorLine} 1px, transparent 1px)`,
    `linear-gradient(to right, ${color} 1px, transparent 1px)`,
    `linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
  ].filter(Boolean) as string[];

  const sizes = [
    majorPx > 0 && `${majorPx}px ${majorPx}px`,
    majorPx > 0 && `${majorPx}px ${majorPx}px`,
    `${cell}px ${cell}px`,
    `${cell}px ${cell}px`,
  ].filter(Boolean) as string[];

  // Only a fine pointer gets the crosshair. Reading pointerType off the event
  // (rather than a media query) keeps hybrid laptops correct: the crosshair
  // follows the mouse and stays away for the touchscreen.
  const handleMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!crosshair || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPoint({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <Tag
      onPointerMove={crosshair ? handleMove : undefined}
      onPointerLeave={crosshair ? () => setPoint(null) : undefined}
      className={cn("relative isolate", className)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: layers.join(", "),
          backgroundSize: sizes.join(", "),
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />

      {ticks ? (
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          {(
            [
              ["left-0 top-0", "border-l border-t"],
              ["right-0 top-0", "border-r border-t"],
              ["left-0 bottom-0", "border-l border-b"],
              ["right-0 bottom-0", "border-r border-b"],
            ] as const
          ).map(([position, edges]) => (
            <span
              key={position}
              className={cn("absolute size-3 border-white/25", position, edges)}
            />
          ))}
        </span>
      ) : null}

      {point ? (
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <span
            className="absolute inset-x-0 h-px bg-white/15"
            style={{ top: point.y }}
          />
          <span
            className="absolute inset-y-0 w-px bg-white/15"
            style={{ left: point.x }}
          />
          <span
            className="absolute font-mono text-[10px] tabular-nums text-white/35"
            style={{ left: point.x + 6, top: point.y + 6 }}
          >
            {formatCoordinate(point.x, point.y, cell)}
          </span>
        </span>
      ) : null}

      {children}
    </Tag>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export type HazardEdge = "top" | "right" | "bottom" | "left";

export type HazardProps = {
  /** Band thickness in px (height when horizontal, width when vertical). */
  thickness?: number;
  /** Stripe pitch in px — one light band plus one gap. */
  pitch?: number;
  /** Stripe angle in degrees. 45 is the standard caution tape. */
  angle?: number;
  /** Stripe colour. Any CSS colour. */
  color?: string;
  /** Colour between the stripes. Transparent by default so it sits on anything. */
  gapColor?: string;
  orientation?: "horizontal" | "vertical";
  /** March the stripes. Frozen under reduced motion. */
  animate?: boolean;
  /** Seconds for one full stripe cycle. Lower is faster. */
  duration?: number;
  className?: string;
};

export type HazardFrameProps = {
  /** Which sides get taped. Defaults to top and bottom. */
  edges?: HazardEdge[];
  thickness?: number;
  pitch?: number;
  angle?: number;
  color?: string;
  gapColor?: string;
  animate?: boolean;
  duration?: number;
  children?: React.ReactNode;
  className?: string;
};

const KEYFRAMES = (
  <style precedence="default" href="chrome-hazard-keyframes">{`
    @keyframes chrome-hazard-march {
      from { background-position: 0 0; }
      to { background-position: var(--chrome-hazard-dx) var(--chrome-hazard-dy); }
    }
    .chrome-hazard-march {
      animation: chrome-hazard-march var(--chrome-hazard-duration) linear infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .chrome-hazard-march { animation: none; }
    }
  `}</style>
);

function stripeStyle({
  pitch,
  angle,
  color,
  gapColor,
  duration,
}: Required<Pick<HazardProps, "pitch" | "angle" | "color" | "gapColor" | "duration">>): React.CSSProperties {
  const radians = (angle * Math.PI) / 180;

  return {
    // repeating-linear-gradient with hard stops: no interpolation, so the edges
    // stay knife-sharp at any pitch instead of blurring like a tiled png would.
    backgroundImage: `repeating-linear-gradient(${angle}deg, ${color} 0 ${pitch / 2}px, ${gapColor} ${pitch / 2}px ${pitch}px)`,
    // The march has to displace the background along the gradient's own axis by
    // exactly one pitch, or the loop visibly jumps. Shifting by pitch on x only
    // would be short by a factor of sin(angle) — projecting onto both axes keeps
    // it seamless at any angle, and moves the stripes perpendicular to
    // themselves, which is how real tape scrolls.
    "--chrome-hazard-dx": `${(pitch * Math.sin(radians)).toFixed(3)}px`,
    "--chrome-hazard-dy": `${(-pitch * Math.cos(radians)).toFixed(3)}px`,
    "--chrome-hazard-duration": `${duration}s`,
  } as React.CSSProperties;
}

/**
 * Diagonal caution-stripe band — a divider, edge, or rule that reads as
 * barrier tape rather than a border.
 *
 * Deliberately not a `progress` variant: progress encodes a value, this
 * encodes a boundary. It renders as an `aria-hidden` span with no semantics of
 * its own; a divider that needs announcing should wrap it in an `<hr>` or a
 * labelled region.
 */
export function Hazard({
  thickness = 8,
  pitch = 12,
  angle = 45,
  color = "rgba(255,255,255,0.22)",
  gapColor = "transparent",
  orientation = "horizontal",
  animate = false,
  duration = 1.2,
  className,
}: HazardProps) {
  const horizontal = orientation === "horizontal";

  return (
    <span
      aria-hidden
      className={cn(
        "block",
        horizontal ? "w-full" : "h-full",
        animate && "chrome-hazard-march",
        className,
      )}
      style={{
        ...stripeStyle({ pitch, angle, color, gapColor, duration }),
        ...(horizontal ? { height: thickness } : { width: thickness }),
      }}
    >
      {KEYFRAMES}
    </span>
  );
}

/**
 * Wraps content in hazard tape on the chosen edges.
 *
 * The tape is absolutely positioned so it never enters the flow — content keeps
 * whatever padding the caller gives it, and the frame can be dropped around an
 * existing block without re-measuring anything.
 */
export function HazardFrame({
  edges = ["top", "bottom"],
  thickness = 8,
  pitch = 12,
  angle = 45,
  color = "rgba(255,255,255,0.22)",
  gapColor = "transparent",
  animate = false,
  duration = 1.2,
  children,
  className,
}: HazardFrameProps) {
  const stripes = stripeStyle({ pitch, angle, color, gapColor, duration });

  const edgeStyle = (edge: HazardEdge): React.CSSProperties => {
    switch (edge) {
      case "top":
        return { top: 0, left: 0, right: 0, height: thickness };
      case "bottom":
        return { bottom: 0, left: 0, right: 0, height: thickness };
      case "left":
        return { top: 0, bottom: 0, left: 0, width: thickness };
      case "right":
        return { top: 0, bottom: 0, right: 0, width: thickness };
    }
  };

  return (
    <div className={cn("relative", className)}>
      {KEYFRAMES}
      {edges.map((edge) => (
        <span
          key={edge}
          aria-hidden
          className={cn("pointer-events-none absolute", animate && "chrome-hazard-march")}
          style={{ ...stripes, ...edgeStyle(edge) }}
        />
      ))}
      {children}
    </div>
  );
}

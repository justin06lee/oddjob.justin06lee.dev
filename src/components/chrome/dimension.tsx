import * as React from "react";
import { cn } from "@/lib/utils";

export type DimensionCap = "arrow" | "tick" | "dot" | "none";

export type DimensionProps = {
  /** The measurement, rendered in the break in the line. */
  label?: React.ReactNode;
  orientation?: "horizontal" | "vertical";
  cap?: DimensionCap;
  /** Length in px of the witness lines squared off at each end. 0 removes them. */
  extension?: number;
  /** Line, cap and label colour. Any CSS colour. */
  color?: string;
  /**
   * Accessible name. With it the annotation is exposed as an image; without it
   * the whole thing is decorative and hidden — which is right whenever the
   * measurement is already stated in nearby copy.
   */
  ariaLabel?: string;
  labelClassName?: string;
  className?: string;
};

/**
 * Architect's dimension line — witness lines, arrow caps, and the measurement
 * sitting in a break in the rule.
 *
 * Everything inherits `currentColor` from the root, so recolouring the whole
 * annotation is one `color` prop rather than a prop per part. The caps are CSS
 * triangles instead of an SVG marker: they stay a crisp 1px-aligned shape at
 * any DPR, and the component ships no markup that a `mask` would blur.
 */
export function Dimension({
  label,
  orientation = "horizontal",
  cap = "arrow",
  extension = 8,
  color = "rgba(255,255,255,0.35)",
  ariaLabel,
  labelClassName,
  className,
}: DimensionProps) {
  const horizontal = orientation === "horizontal";

  const capNode = (pointing: "start" | "end") => {
    if (cap === "none") return null;
    if (cap === "dot") {
      return <span aria-hidden className="size-1 shrink-0 bg-current" />;
    }
    if (cap === "tick") {
      // The draughtsman's oblique: a short 45-degree slash across the line end.
      return (
        <span
          aria-hidden
          className={cn("shrink-0 bg-current", horizontal ? "h-3 w-px" : "h-px w-3")}
          style={{ transform: "rotate(45deg)" }}
        />
      );
    }

    const towardStart = pointing === "start";
    return (
      <span
        aria-hidden
        className={cn(
          "size-0 shrink-0 border-transparent",
          horizontal
            ? towardStart
              ? "border-y-[3px] border-r-[5px] border-r-current"
              : "border-y-[3px] border-l-[5px] border-l-current"
            : towardStart
              ? "border-x-[3px] border-b-[5px] border-b-current"
              : "border-x-[3px] border-t-[5px] border-t-current",
        )}
      />
    );
  };

  const rule = <span aria-hidden className={cn("flex-1 bg-current", horizontal ? "h-px" : "w-px")} />;

  const witness = (edge: "start" | "end") => {
    if (extension <= 0) return null;
    const position = horizontal
      ? edge === "start"
        ? "left-0"
        : "right-0"
      : edge === "start"
        ? "top-0"
        : "bottom-0";
    return (
      <span
        aria-hidden
        className={cn(
          "absolute bg-current",
          horizontal ? "w-px -translate-y-1/2 top-1/2" : "h-px -translate-x-1/2 left-1/2",
          position,
        )}
        style={horizontal ? { height: extension * 2 } : { width: extension * 2 }}
      />
    );
  };

  return (
    <div
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={{ color }}
      className={cn(
        "relative flex items-center gap-1.5",
        horizontal ? "w-full flex-row" : "h-full flex-col",
        className,
      )}
    >
      {witness("start")}
      {capNode("start")}
      {rule}
      {label != null ? (
        <span
          className={cn(
            "whitespace-nowrap px-1 font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums",
            labelClassName,
          )}
        >
          {label}
        </span>
      ) : null}
      {rule}
      {capNode("end")}
      {witness("end")}
    </div>
  );
}

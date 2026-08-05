"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Reads the media query as an external store rather than mirroring it into
 * state from an effect: the server snapshot is a plain `false`, so there is no
 * hydration mismatch, and the value follows the user changing the setting
 * mid-session instead of being sampled once at mount.
 */
function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

export type PencilRuleProps = {
  /** Seconds for the pencil to cross the full width. */
  duration?: number;
  /** Seconds to wait after the trigger fires. */
  delay?: number;
  /** Draw on mount instead of when scrolled into view. */
  trigger?: "in-view" | "mount";
  /** Redraw every time it re-enters the viewport. */
  repeat?: boolean;
  /** Line thickness in px. */
  thickness?: number;
  /** Line colour. */
  color?: string;
  /** Pencil body colour. The lead and ferrule are derived from it. */
  pencilColor?: string;
  /** Hide the pencil and just draw the line. */
  showPencil?: boolean;
  className?: string;
};

/**
 * A rule that draws itself, with a pencil riding the leading edge.
 *
 * The line is a scaled element rather than an animated `width`: transform is
 * composited, width is not, so the stroke can't cause layout on any frame. The
 * pencil translates on the same timing function, which is what keeps the nib
 * pinned to the end of the stroke for the whole draw — animating the two with
 * different curves is what makes this effect look wrong.
 *
 * Under reduced motion the finished line is rendered immediately and the pencil
 * never appears; the rule's job is to be a rule, and the drawing is decoration.
 */
export function PencilRule({
  duration = 1.2,
  delay = 0,
  trigger = "in-view",
  repeat = false,
  thickness = 1,
  color = "rgba(255,255,255,0.35)",
  pencilColor = "rgba(255,255,255,0.75)",
  showPencil = true,
  className,
}: PencilRuleProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = React.useState(false);
  const reduced = usePrefersReducedMotion();

  // `drawn` always starts false, even for trigger="mount": flipping it in the
  // same render would give the browser no undrawn frame to transition from, and
  // the rule would simply appear.
  React.useEffect(() => {
    if (trigger !== "mount") return;
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, [trigger]);

  React.useEffect(() => {
    if (trigger !== "in-view") return;
    const host = hostRef.current;
    if (!host) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setDrawn(true);
          if (!repeat) observer.disconnect();
        } else if (repeat) {
          setDrawn(false);
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [trigger, repeat]);

  const complete = drawn || reduced;
  const timing: React.CSSProperties = reduced
    ? {}
    : {
        transitionDuration: `${duration}s`,
        transitionDelay: `${delay}s`,
        transitionTimingFunction: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      };

  return (
    <div
      ref={hostRef}
      className={cn("relative w-full overflow-hidden", className)}
      style={{ height: 18 }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-1/2 w-full origin-left -translate-y-1/2 transition-transform"
        style={{
          height: thickness,
          background: color,
          transform: `translateY(-50%) scaleX(${complete ? 1 : 0})`,
          ...timing,
        }}
      />

      {showPencil && !reduced ? (
        // A zero-height full-width track carries the pencil, so translating it
        // by a percentage moves it across the *container's* width. A percentage
        // on the pencil itself would resolve against the pencil's own 46px.
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-0"
          style={{
            transform: `translateX(${complete ? 100 : 0}%)`,
            opacity: complete ? 0 : 1,
            transitionProperty: "transform, opacity",
            transitionDuration: `${duration}s, 0.3s`,
            transitionDelay: `${delay}s, ${delay + duration}s`,
            transitionTimingFunction: "cubic-bezier(0.22, 0.61, 0.36, 1), linear",
          }}
        >
          {/* right-full parks the pencil's nib exactly on the track's origin, so
              the lead stays on the end of the stroke rather than ahead of it. */}
          <span className="absolute right-full top-0 -translate-y-1/2">
            <Pencil color={pencilColor} />
          </span>
        </span>
      ) : null}
    </div>
  );
}

/** Side-on pencil: ferrule, body, shoulder and lead, nib pointing right. */
function Pencil({ color }: { color: string }) {
  return (
    <svg width="46" height="12" viewBox="0 0 46 12" fill="none" aria-hidden>
      {/* eraser */}
      <rect x="0" y="3" width="5" height="6" fill={color} opacity="0.45" />
      {/* ferrule */}
      <rect x="5" y="3" width="3" height="6" fill={color} opacity="0.7" />
      {/* body */}
      <rect x="8" y="3" width="26" height="6" fill={color} />
      {/* facet highlight — one lighter stripe is enough to read as hexagonal */}
      <rect x="8" y="4" width="26" height="1.5" fill="#fff" opacity="0.25" />
      {/* shoulder */}
      <path d="M34 3 L41 6 L34 9 Z" fill={color} opacity="0.55" />
      {/* lead */}
      <path d="M41 4.7 L46 6 L41 7.3 Z" fill={color} />
    </svg>
  );
}

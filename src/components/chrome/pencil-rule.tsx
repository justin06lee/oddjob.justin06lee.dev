"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Seconds for the pencil to arrive, and to leave once the line is ruled. */
const FADE_IN = 0.25;
const FADE_OUT = 0.3;

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
  /**
   * Seconds to wait after the trigger fires before the pencil arrives. Nothing
   * is visible until then — set it past a page's entrance animations so the
   * rule reads as the last thing to happen.
   */
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
  /**
   * How far the pencil is tilted off the line, in degrees. Rotated about the
   * nib, so the lead stays on the stroke whatever this is. Around 40 is how a
   * hand actually holds one; below ~25 it starts to lie along the rule again,
   * and 0 puts it flat on top of the stroke — see the note on the component.
   */
  angle?: number;
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
 * The pencil is held at an angle, and that is not decoration. Laid flat it is
 * collinear with the rule, so its body covers the stroke it has just made and
 * the line appears to be drawn *underneath* it. Tilting it means only the lead
 * touches, exactly as a hand holds a pencil. It is also drawn nib-first, with
 * the body running forward and up, so the pencil leans over paper that has not
 * been ruled yet rather than over the part that has.
 *
 * The consequence is that it stands well above its own row while drawing, which
 * is why the host is not `overflow-hidden` and why callers should leave a
 * little headroom above a rule that animates.
 *
 * The pencil fades in on `delay` rather than waiting there in full view for its
 * cue. `delay` is therefore the moment it *arrives*, which is what makes it
 * composable with a staggered page: set it past the last entrance animation and
 * the rule reads as the last thing to happen rather than the first.
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
  angle = 40,
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
    // Deliberately not `overflow-hidden`: the pencil is tilted, so it stands
    // well above its own row while drawing. Clipping to the rule's height would
    // lop the body off and leave a floating nib.
    <div ref={hostRef} className={cn("relative w-full", className)} style={{ height: 18 }}>
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
        // on the pencil itself would resolve against the pencil's own 38px.
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-0"
          style={{
            transform: `translateX(${complete ? 100 : 0}%)`,
            // Fades IN as the draw begins, on the same delay as the movement.
            // Without this the pencil is simply present from the first painted
            // frame — sitting at the start of the line, fully opaque, while the
            // rest of the page is still fading in around it.
            opacity: complete ? 1 : 0,
            transitionProperty: "transform, opacity",
            transitionDuration: `${duration}s, ${FADE_IN}s`,
            transitionDelay: `${delay}s, ${delay}s`,
            transitionTimingFunction: "cubic-bezier(0.22, 0.61, 0.36, 1), linear",
          }}
        >
          {/* The nib sits on the track's origin and the tilt is taken about
              that same point, so the lead stays welded to the end of the stroke
              at any angle. translateY(-50%) is what puts the nib — the SVG's
              vertical middle — on the line rather than above it. */}
          <span
            className="absolute left-0 top-0"
            style={{
              transform: `translateY(-50%) rotate(${-angle}deg)`,
              transformOrigin: "0% 50%",
              // Fades OUT once the line is ruled. The arrival and the departure
              // live on separate elements so their opacities multiply — one
              // transition cannot describe a hold between two fades, and a
              // keyframe that could would need percentages computed from
              // `duration`, which is a prop.
              opacity: complete ? 0 : 1,
              transitionProperty: "opacity",
              transitionDuration: `${FADE_OUT}s`,
              transitionDelay: `${delay + duration}s`,
            }}
          >
            <Pencil color={pencilColor} />
          </span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * Side-on pencil with the nib at the LEFT, so the body runs away from the point.
 *
 * Drawn this way round because the pencil is anchored by its nib and tilted up:
 * the body then rises ahead of the stroke, over paper that hasn't been ruled
 * yet, and never sits on top of the line it just drew.
 */
function Pencil({ color }: { color: string }) {
  return (
    <svg width="38" height="10" viewBox="0 0 38 10" fill="none" aria-hidden>
      {/* lead */}
      <path d="M0 5 L4 3.6 L4 6.4 Z" fill={color} />
      {/* shoulder — the sharpened wood between lead and body */}
      <path d="M10 2.2 L4 3.9 L4 6.1 L10 7.8 Z" fill={color} opacity="0.55" />
      {/* body */}
      <rect x="10" y="2.2" width="21" height="5.6" fill={color} />
      {/* facet highlight — one lighter stripe is enough to read as hexagonal */}
      <rect x="10" y="3.2" width="21" height="1.2" fill="#fff" opacity="0.25" />
      {/* ferrule */}
      <rect x="31" y="2.2" width="3" height="5.6" fill={color} opacity="0.7" />
      {/* eraser */}
      <rect x="34" y="2.2" width="4" height="5.6" fill={color} opacity="0.45" />
    </svg>
  );
}

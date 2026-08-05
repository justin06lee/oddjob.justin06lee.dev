"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ShaderPoint = {
  /** Column index, 0-based. */
  col: number;
  /** Row index, 0-based. */
  row: number;
  /**
   * Horizontal position, roughly -1..1 across the grid and aspect-corrected
   * using the measured character cell, so `x*x + y*y` describes a real circle
   * rather than the ellipse a naive column/row normalisation would give.
   */
  x: number;
  /** Vertical position, roughly -1..1 down the grid. */
  y: number;
  /** Seconds since mount, already scaled by `speed`. */
  t: number;
  cols: number;
  rows: number;
};

/** Returns luminance in 0..1. Values outside the range are clamped. */
export type ShaderFn = (point: ShaderPoint) => number;

export type AsciiShaderProps = {
  shader: ShaderFn;
  /** Fixed column count. Omit to fill the element's width. */
  cols?: number;
  /** Fixed row count. Omit to fill the element's height. */
  rows?: number;
  /** Luminance ramp, dark to light. */
  chars?: string;
  /** Frame cap. ASCII reads fine well below 60, and the saving is real. */
  fps?: number;
  /** Multiplies the time fed to the shader. */
  speed?: number;
  /** Freeze on the current frame. */
  paused?: boolean;
  /** Font size in px. Drives the auto-fit grid. */
  size?: number;
  /**
   * CSS containment to isolate the per-frame repaint. Faster, but containment
   * creates its own paint context — set false inside `<Chrome>` or the foil
   * won't paint through.
   */
  isolate?: boolean;
  /** Accessible name. Without one the canvas is decorative and hidden. */
  label?: string;
  className?: string;
};

const DEFAULT_CHARS = " .:-=+*#%@";

/**
 * ASCII fragment shader — a character grid painted by a per-cell function of
 * position and time.
 *
 * This is the general form of what `donut` does for one fixed torus: you supply
 * `(x, y, t) => luminance` and it handles the grid, the ramp, and the loop. The
 * frame is built as one string and assigned to `textContent` — a single text
 * mutation per frame, no per-cell DOM.
 *
 * Three things keep it cheap. The loop is capped at `fps` rather than running
 * free. An IntersectionObserver stops it entirely while the element is
 * off-screen, so a shader below the fold costs nothing. And under
 * `prefers-reduced-motion` it paints one frame at t=0 and never starts a loop
 * at all.
 *
 * The character cell is measured on mount, because the aspect correction that
 * makes a circle round depends on the actual font, not on an assumed ratio.
 */
export function AsciiShader({
  shader,
  cols: fixedCols,
  rows: fixedRows,
  chars = DEFAULT_CHARS,
  fps = 24,
  speed = 1,
  paused = false,
  size = 12,
  isolate = true,
  label,
  className,
}: AsciiShaderProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const preRef = React.useRef<HTMLPreElement>(null);
  const [grid, setGrid] = React.useState<{ cols: number; rows: number; cell: number } | null>(null);

  // Latest-value refs, so the render loop below doesn't restart every time a
  // caller passes a fresh inline arrow. Synced in an effect rather than during
  // render: mutating a ref while rendering makes the output depend on data
  // React isn't tracking, which tears under concurrent rendering. The loop that
  // reads them is itself an effect, so it always sees a committed value.
  const shaderRef = React.useRef(shader);
  const pausedRef = React.useRef(paused);

  React.useEffect(() => {
    shaderRef.current = shader;
  }, [shader]);

  React.useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const lineHeight = 1.15;

  // Measure the character cell, then size the grid to the host. Both auto-fit
  // dimensions come from the same measurement, so a fixed `cols` with an auto
  // `rows` still lines up.
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const probe = document.createElement("pre");
    probe.style.cssText =
      "position:absolute;visibility:hidden;white-space:pre;margin:0;padding:0;";
    probe.style.font = `${size}px ${getComputedStyle(host).fontFamily}`;
    probe.style.lineHeight = String(lineHeight);
    probe.textContent = "0".repeat(50);
    host.appendChild(probe);
    const charWidth = probe.getBoundingClientRect().width / 50;
    const charHeight = size * lineHeight;
    host.removeChild(probe);

    if (!charWidth) return;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      const cols = fixedCols ?? Math.max(1, Math.floor(rect.width / charWidth));
      const rows = fixedRows ?? Math.max(1, Math.floor(rect.height / charHeight));
      setGrid((prev) =>
        prev && prev.cols === cols && prev.rows === rows
          ? prev
          : { cols, rows, cell: charWidth / charHeight },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [size, fixedCols, fixedRows]);

  React.useEffect(() => {
    const pre = preRef.current;
    const host = hostRef.current;
    if (!pre || !host || !grid) return;

    const { cols, rows, cell } = grid;
    const ramp = chars.length > 0 ? chars : DEFAULT_CHARS;
    const top = ramp.length - 1;

    // Normalise against the shorter physical side so neither axis is squashed;
    // `cell` is char width over char height, which converts columns into the
    // same units as rows.
    const physWidth = cols * cell;
    const physHeight = rows;
    const half = Math.min(physWidth, physHeight) / 2;
    const spanX = physWidth / 2;
    const spanY = physHeight / 2;

    const paint = (t: number) => {
      const fn = shaderRef.current;
      const out: string[] = [];
      for (let row = 0; row < rows; row++) {
        const y = ((row + 0.5) - spanY) / half;
        let line = "";
        for (let col = 0; col < cols; col++) {
          const x = ((col + 0.5) * cell - spanX) / half;
          const value = fn({ col, row, x, y, t, cols, rows });
          // NaN from a caller's shader would index undefined and blank the
          // whole frame; clamping it to 0 keeps the grid intact.
          const clamped = value > 0 ? (value < 1 ? value : 1) : 0;
          line += ramp[Math.round(clamped * top)];
        }
        out.push(line);
      }
      pre.textContent = out.join("\n");
    };

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      paint(0);
      return;
    }

    let raf = 0;
    let last = 0;
    let elapsed = 0;
    let visible = true;
    const interval = 1000 / Math.max(1, fps);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < interval) return;
      const previous = last || now;
      last = now;
      // Pausing holds the clock rather than the frame: resuming continues from
      // where it stopped instead of jumping forward by the paused duration.
      if (pausedRef.current) return;
      elapsed += now - previous;
      paint((elapsed / 1000) * speed);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nowVisible = entry?.isIntersecting ?? true;
        if (nowVisible === visible) return;
        visible = nowVisible;
        if (visible) {
          last = 0;
          raf = requestAnimationFrame(frame);
        } else {
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 },
    );
    observer.observe(host);

    paint(0);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [grid, chars, fps, speed]);

  return (
    <div
      ref={hostRef}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative overflow-hidden font-mono", className)}
    >
      <pre
        ref={preRef}
        // With auto rows the grid is taken out of flow: otherwise adding a row
        // would grow the host, which would fit another row, and the
        // ResizeObserver would never settle.
        className={cn("m-0 whitespace-pre", fixedRows == null && "absolute inset-0")}
        style={{
          fontSize: size,
          lineHeight,
          // Ligatures and contextual alternates merge pairs like `=>` and break
          // column alignment; the grid depends on every glyph being one cell.
          fontVariantLigatures: "none",
          fontFeatureSettings: '"liga" 0, "calt" 0',
          contain: isolate ? "layout paint style" : undefined,
        }}
      />
    </div>
  );
}

/** Interfering sine fields — the classic demoscene plasma. */
export const plasma: ShaderFn = ({ x, y, t }) =>
  (Math.sin(x * 3 + t) +
    Math.sin(y * 4 - t * 0.7) +
    Math.sin((x + y) * 2.5 + t * 1.3) +
    3) /
  6;

/** Concentric rings travelling outward from the centre. */
export const ripple: ShaderFn = ({ x, y, t }) => {
  const d = Math.sqrt(x * x + y * y);
  return (Math.sin(d * 10 - t * 3) + 1) / 2 / (1 + d);
};

/** A rotating spiral tunnel. */
export const tunnel: ShaderFn = ({ x, y, t }) => {
  const d = Math.sqrt(x * x + y * y) || 1e-6;
  const angle = Math.atan2(y, x);
  return (Math.sin(angle * 4 + 1 / d + t * 2) + 1) / 2;
};

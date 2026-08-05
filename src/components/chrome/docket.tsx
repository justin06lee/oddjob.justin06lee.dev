import * as React from "react";
import { cn } from "@/lib/utils";

export type DocketRow = {
  label: React.ReactNode;
  value: React.ReactNode;
};

export type DocketProps = {
  /** Reference printed in the header, e.g. "OJ-0042". Set in mono. */
  reference?: React.ReactNode;
  /** Small caps line opposite the reference — the document's kind. */
  kind?: React.ReactNode;
  /** Slot at the top right of the body. A `Stamp` is the intended occupant. */
  mark?: React.ReactNode;
  title?: React.ReactNode;
  /** Label/value pairs rendered as a real <dl>. */
  rows?: DocketRow[];
  /** Body content under the rows. */
  children?: React.ReactNode;
  /** Content below the perforation. Omit it and no tear edge is drawn. */
  stub?: React.ReactNode;
  /**
   * Colour showing through the notches at each end of the perforation. It has
   * to match whatever the docket sits on — the page background by default.
   */
  notchColor?: string;
  className?: string;
};

/**
 * A work order / docket: mono header with a reference, label-value rows, and an
 * optional tear-off stub below a perforation.
 *
 * `detail-list` renders the same label-value pairs, and this uses that shape
 * for its rows — but a docket is the *document* around them: it is numbered, it
 * carries a mark, and it tears. Reach for detail-list when you want metadata
 * inside something else, and for a docket when the thing itself is the record.
 *
 * The notches are opaque circles in the page colour rather than a mask, because
 * masking the whole card to cut real holes also masks the border, and a docket
 * without its outline stops reading as a document.
 */
export function Docket({
  reference,
  kind,
  mark,
  title,
  rows,
  children,
  stub,
  notchColor = "#000000",
  className,
}: DocketProps) {
  return (
    <div className={cn("border border-white/15 bg-white/[0.02]", className)}>
      {reference != null || kind != null ? (
        <div className="flex items-baseline justify-between gap-4 border-b border-white/10 px-5 py-2.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
            {kind}
          </span>
          <span className="font-mono text-[12px] tabular-nums tracking-[0.14em] text-white/70">
            {reference}
          </span>
        </div>
      ) : null}

      <div className="relative px-5 py-5">
        {mark ? <div className="absolute right-5 top-4">{mark}</div> : null}

        {title != null ? (
          <p className={cn("text-lg leading-tight text-white", mark && "pr-28")}>{title}</p>
        ) : null}

        {rows && rows.length > 0 ? (
          <dl className={cn("flex flex-col gap-2", title != null && "mt-4")}>
            {rows.map((row, index) => (
              <div key={index} className="flex items-baseline gap-3">
                <dt className="w-28 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  {row.label}
                </dt>
                <dd className="min-w-0 flex-1 text-[13px] leading-relaxed text-white/75">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {children ? <div className={cn(rows?.length || title ? "mt-4" : "")}>{children}</div> : null}
      </div>

      {stub != null ? (
        <>
          <div aria-hidden className="relative h-0">
            <span
              className="absolute inset-x-3 top-0 h-px"
              style={{
                // Hard stops rather than a dashed border: the dash length is
                // explicit, so the perforation reads the same at any width.
                backgroundImage:
                  "repeating-linear-gradient(to right, rgba(255,255,255,0.25) 0 4px, transparent 4px 8px)",
              }}
            />
            <span
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: 0, top: 0, background: notchColor }}
            />
            <span
              className="absolute size-3 translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ right: 0, top: 0, background: notchColor }}
            />
          </div>
          <div className="px-5 py-4">{stub}</div>
        </>
      ) : null}
    </div>
  );
}

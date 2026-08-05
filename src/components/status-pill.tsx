import { cn } from "@/lib/utils";
import type { Status } from "@/lib/work-order";

/**
 * Status as a chip. Only two statuses carry colour — `received` in hazard
 * because it is the one that needs an action from me, and `declined` in red
 * because it is the one that ends the thread. Everything in between is a state
 * of progress and stays white, or the inbox turns into a fruit salad and the
 * one unread work order stops standing out.
 */
const TONE: Record<Status, string> = {
  received: "border-[var(--hazard)] text-[var(--hazard)] bg-[var(--hazard-faint)]",
  reading: "border-white/25 text-white/70",
  quoted: "border-white/40 text-white",
  building: "border-white bg-white text-black",
  done: "border-white/15 text-white/40",
  declined: "border-red-400/40 text-red-300/80",
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
        TONE[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

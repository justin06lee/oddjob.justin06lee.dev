"use client";

import * as React from "react";
import { Check, Trash2 } from "lucide-react";
import { removeRequest, updateNotes, updateStatus } from "@/app/admin/actions";
import { Button } from "@/components/chrome/button";
import { Textarea } from "@/components/chrome/textarea";
import { STATUSES, type Status } from "@/lib/work-order";
import { cn } from "@/lib/utils";

export function RequestControls({
  id,
  status,
  notes,
}: {
  id: string;
  status: Status;
  notes: string | null;
}) {
  const [pending, startTransition] = React.useTransition();
  // useOptimistic rather than state mirrored from the prop by an effect: the
  // pill responds on click, and React drops the optimistic value on its own
  // once the action settles and the revalidated prop arrives — so there is no
  // window where a failed update leaves the wrong pill lit.
  const [current, setCurrent] = React.useOptimistic(status);

  const [draft, setDraft] = React.useState(notes ?? "");
  const [saved, setSaved] = React.useState(false);
  const dirty = draft !== (notes ?? "");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
          status
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATUSES.map((value) => (
            <button
              key={value}
              type="button"
              disabled={pending}
              aria-pressed={current === value}
              onClick={() =>
                startTransition(async () => {
                  setCurrent(value);
                  await updateStatus(id, value);
                })
              }
              className={cn(
                "border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors disabled:opacity-60",
                current === value
                  ? "border-white bg-white text-black"
                  : "border-white/15 text-white/45 hover:border-white/35 hover:text-white",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
          notes to self
        </p>
        <p className="mt-1 text-[12px] text-white/30">
          never sent anywhere. only visible here.
        </p>
        <Textarea
          rows={5}
          counter
          maxLength={2000}
          className="mt-3"
          placeholder="quoted 3k, waiting on their designer…"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setSaved(false);
          }}
        />
        <div className="mt-2 flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={!dirty || pending}
            onClick={() =>
              startTransition(async () => {
                await updateNotes(id, draft);
                setSaved(true);
              })
            }
          >
            save notes
          </Button>
          {saved && !dirty ? (
            <span className="inline-flex items-center gap-1 text-[12px] text-white/40">
              <Check aria-hidden className="size-3" strokeWidth={1.5} />
              saved
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <DeleteButton id={id} disabled={pending} />
      </div>
    </div>
  );
}

/**
 * Two-step rather than a modal: the second click is the confirmation, and it
 * costs one component instead of a dialog for a thing done twice a year.
 */
function DeleteButton({ id, disabled }: { id: string; disabled: boolean }) {
  const [armed, setArmed] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        startTransition(() => removeRequest(id));
      }}
      className={cn(
        "inline-flex items-center gap-2 border px-3 py-1.5 text-[13px] transition-colors disabled:opacity-60",
        armed
          ? "border-red-400/60 bg-red-400/10 text-red-300"
          : "border-white/15 text-white/40 hover:border-red-400/40 hover:text-red-300",
      )}
    >
      <Trash2 aria-hidden className="size-3.5" strokeWidth={1.5} />
      {pending ? "deleting…" : armed ? "really delete it?" : "delete"}
    </button>
  );
}

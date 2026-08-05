"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/chrome/progress";

export type DropzoneFile = {
  id: string;
  name: string;
  /** Bytes. Rendered as a human-readable size. */
  size?: number;
  /** 0..100. Renders a bar; omit for a file that isn't uploading. */
  progress?: number;
  /** Marks the row as failed and shows this text instead of the size. */
  error?: string;
};

export type DropzoneRejection = {
  file: File;
  reason: "type" | "size" | "count";
};

export type DropzoneProps = {
  /** Receives the files that passed `accept`, `maxSize` and `maxFiles`. */
  onFiles: (files: File[]) => void;
  /** Anything rejected, with the rule it broke. */
  onReject?: (rejections: DropzoneRejection[]) => void;
  /** Same syntax as the native input: ".pdf,.md,image/*". */
  accept?: string;
  /** Per-file limit in bytes. */
  maxSize?: number;
  /** Cap on the number accepted per drop. */
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  /** Headline inside the zone. */
  label?: React.ReactNode;
  /** Second line — the formats and limits, usually. */
  hint?: React.ReactNode;
  /** Rows rendered under the zone. Supply your own state; the zone is stateless. */
  files?: DropzoneFile[];
  /** Adds a remove button to each row. */
  onRemove?: (id: string) => void;
  /** Colour for the active (dragged-over) border and the progress bars. */
  accent?: string;
  className?: string;
};

const UNITS = ["b", "kb", "mb", "gb"];

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // Bytes and kilobytes read as noise with decimals; megabytes need one.
  return `${value.toFixed(unit >= 2 && value < 100 ? 1 : 0)} ${UNITS[unit]}`;
}

/**
 * Matches a file against one `accept` token — an extension (`.pdf`), a full
 * mime type (`application/pdf`), or a wildcard (`image/*`).
 */
function matchesToken(file: File, token: string): boolean {
  const rule = token.trim().toLowerCase();
  if (!rule) return false;
  if (rule.startsWith(".")) return file.name.toLowerCase().endsWith(rule);
  const type = file.type.toLowerCase();
  if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
  return type === rule;
}

/**
 * Drag-and-drop upload zone.
 *
 * The registry had drop handling only *inside* `asset-sidebar`; this is the
 * standalone control, and it is deliberately stateless — it validates a drop
 * and hands you `File[]`, while the rows it renders come from whatever state
 * you keep. Upload transport is none of its business.
 *
 * Two things it gets right that a naive version doesn't. Drag depth is counted
 * rather than toggled: `dragleave` fires when the pointer crosses onto a child,
 * so a boolean flag flickers the highlight off mid-drag over the zone's own
 * text. And the zone is a real `<button>`, so click, Enter and Space all open
 * the picker and it lands in the tab order without any `role`/key handling.
 */
export function Dropzone({
  onFiles,
  onReject,
  accept,
  maxSize,
  maxFiles,
  multiple = true,
  disabled = false,
  label = "drop files here",
  hint,
  files,
  onRemove,
  accent = "#ffffff",
  className,
}: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const depth = React.useRef(0);
  const [active, setActive] = React.useState(false);

  const tokens = React.useMemo(
    () => (accept ? accept.split(",").filter(Boolean) : null),
    [accept],
  );

  const intake = React.useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      const accepted: File[] = [];
      const rejected: DropzoneRejection[] = [];

      for (const file of Array.from(list)) {
        if (tokens && !tokens.some((token) => matchesToken(file, token))) {
          rejected.push({ file, reason: "type" });
        } else if (maxSize != null && file.size > maxSize) {
          rejected.push({ file, reason: "size" });
        } else if (maxFiles != null && accepted.length >= maxFiles) {
          rejected.push({ file, reason: "count" });
        } else if (!multiple && accepted.length >= 1) {
          rejected.push({ file, reason: "count" });
        } else {
          accepted.push(file);
        }
      }

      if (accepted.length > 0) onFiles(accepted);
      if (rejected.length > 0) onReject?.(rejected);
    },
    [tokens, maxSize, maxFiles, multiple, onFiles, onReject],
  );

  const stop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          stop(event);
          if (disabled) return;
          // Counting rather than flagging: dragleave fires on every child
          // boundary crossed, and a boolean would strobe the highlight.
          depth.current += 1;
          setActive(true);
        }}
        onDragOver={stop}
        onDragLeave={(event) => {
          stop(event);
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setActive(false);
        }}
        onDrop={(event) => {
          stop(event);
          depth.current = 0;
          setActive(false);
          if (disabled) return;
          intake(event.dataTransfer?.files ?? null);
        }}
        style={active ? { borderColor: accent } : undefined}
        className={cn(
          "flex w-full flex-col items-center gap-2 border border-dashed px-8 py-10 text-center transition-colors",
          disabled
            ? "cursor-not-allowed border-white/10 opacity-50"
            : active
              ? "bg-white/[0.06]"
              : "border-white/15 hover:border-white/30 hover:bg-white/[0.03]",
        )}
      >
        <Upload aria-hidden className="size-5 text-white/40" strokeWidth={1.5} />
        <span className="text-sm text-white/80">{label}</span>
        {hint ? <span className="text-[12px] text-white/40">{hint}</span> : null}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        // Clearing the value lets the same file be picked twice in a row —
        // otherwise the change event never fires the second time.
        onChange={(event) => {
          intake(event.target.files);
          event.target.value = "";
        }}
      />

      {files && files.length > 0 ? (
        <ul className="flex flex-col gap-px">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 border border-white/10 px-3 py-2"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-[13px] text-white/80">{file.name}</span>
                {file.error ? (
                  <span className="text-[11px] text-red-300">{file.error}</span>
                ) : file.progress != null ? (
                  <Progress
                    value={file.progress}
                    size="sm"
                    accent={accent}
                    ariaLabel={`uploading ${file.name}`}
                  />
                ) : file.size != null ? (
                  <span className="font-mono text-[11px] tabular-nums text-white/35">
                    {formatBytes(file.size)}
                  </span>
                ) : null}
              </span>

              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(file.id)}
                  aria-label={`remove ${file.name}`}
                  className="shrink-0 p-1 text-white/30 transition-colors hover:text-white"
                >
                  <X aria-hidden className="size-3.5" strokeWidth={1.5} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

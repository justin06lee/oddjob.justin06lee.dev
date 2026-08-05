"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** CSS background applied to the element. Transparent by default. */
  background?: string;
  /**
   * Show a live character count under the field. With `maxLength` it reads
   * "120 / 500" and turns muted-red as it approaches the limit.
   */
  counter?: boolean;
  /** Extra classes for the wrapper that appears when `counter` is set. */
  wrapperClassName?: string;
}

/** Minimal multiline input. Matches Input — thin border, square corners. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      background,
      style,
      rows = 4,
      counter = false,
      wrapperClassName,
      value,
      defaultValue,
      maxLength,
      onChange,
      ...props
    },
    ref,
  ) => {
    // Only the count is tracked, not the text: mirroring the value into state
    // would fight a controlled parent, and the length is all the counter needs.
    const [count, setCount] = React.useState(
      () => String(value ?? defaultValue ?? "").length,
    );

    // A controlled value can change without an onChange from this element —
    // a reset button, a draft loaded from the server — and the count has to
    // follow it.
    React.useEffect(() => {
      if (value != null) setCount(String(value).length);
    }, [value]);

    const field = (
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        onChange={(event) => {
          if (counter) setCount(event.target.value.length);
          onChange?.(event);
        }}
        className={cn(
          "w-full resize-y bg-transparent border border-white/20 px-3 py-2 text-sm text-white",
          "placeholder:text-white/30 focus:outline-none focus:border-white/50",
          "disabled:opacity-50",
          className,
        )}
        style={{ ...style, background }}
        {...props}
      />
    );

    if (!counter) return field;

    const near = maxLength != null && count >= maxLength * 0.9;

    return (
      <div className={cn("flex flex-col gap-1", wrapperClassName)}>
        {field}
        {/* polite, not assertive: the count updates on every keystroke and an
            assertive region would interrupt the user typing. */}
        <span
          aria-live="polite"
          className={cn(
            "self-end font-mono text-[10px] tabular-nums transition-colors",
            near ? "text-red-300/70" : "text-white/30",
          )}
        >
          {count}
          {maxLength != null ? ` / ${maxLength}` : null}
        </span>
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

"use client";

import { cn } from "./cn";

/** Segmented pill tabs. */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("no-scrollbar flex gap-2 overflow-x-auto", className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control border px-4 text-nav font-medium transition-colors",
              active ? "border-ink bg-ink text-white" : "border-border-gray bg-white text-ink hover:border-ink",
            )}
          >
            {it.label}
            {it.count != null && it.count > 0 && (
              <span className={cn("grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold", active ? "bg-white text-ink" : "bg-ink text-white")}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

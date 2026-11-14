import type { ComponentProps } from "react";
import { cn } from "@/components/ui/cn";

/** 36px pill (filter presets, list/map toggle). Same look as the foundation Pill, taller tap target. */
export const chipClass = (active?: boolean, className?: string) =>
  cn(
    "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border px-3.5 text-nav font-medium transition-colors",
    active ? "border-ink bg-ink text-white" : "border-border-gray bg-white text-ink hover:border-ink",
    className,
  );

export function Chip({ active, className, type = "button", ...rest }: ComponentProps<"button"> & { active?: boolean }) {
  return <button type={type} aria-pressed={active} className={chipClass(active, className)} {...rest} />;
}

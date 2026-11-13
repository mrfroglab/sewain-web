import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "./cn";

/** Navigation / filter pill (DESIGN.md › Navigation Pill). Active = black fill, white text. */
export const pillClass = (active?: boolean, className?: string) =>
  cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border px-3.5 text-nav font-medium transition-colors",
    active ? "border-ink bg-ink text-white" : "border-border-gray bg-white text-ink hover:border-ink",
    className,
  );

export function Pill({ active, className, type = "button", ...rest }: ComponentProps<"button"> & { active?: boolean }) {
  return <button type={type} aria-pressed={active} className={pillClass(active, className)} {...rest} />;
}

export function PillLink({ active, className, ...rest }: ComponentProps<typeof Link> & { active?: boolean }) {
  return <Link aria-current={active ? "page" : undefined} className={pillClass(active, className)} {...rest} />;
}

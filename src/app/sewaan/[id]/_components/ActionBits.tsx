"use client";

import { Hourglass } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { formatDateTime, formatDuration } from "@/lib/format";

/** Title + one-line explanation at the top of the "Langkah berikutnya" card. */
export function ActionHead({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mt-1.5">
      <h2 className="text-[18px] font-semibold leading-snug tracking-[-0.3px] text-ink">{title}</h2>
      {description && <p className="mt-1 text-body-sm text-smoke">{description}</p>}
    </div>
  );
}

/** Icon-led detail line (meeting point, method, date…). */
export function InfoLine({ icon, label, children, className }: { icon: ReactNode; label?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-3 text-body-sm", className)}>
      <span className="mt-0.5 shrink-0 text-ink">{icon}</span>
      <div className="min-w-0">
        {label && <p className="text-caption text-smoke">{label}</p>}
        <div className="text-graphite">{children}</div>
      </div>
    </div>
  );
}

/** Countdown pill: "Kadaluarsa dalam 19 jam 50 menit". */
export function Countdown({ label, until, now, className }: { label: string; until: number; now: number; className?: string }) {
  const left = until - now;
  return (
    <div className={cn("flex items-center gap-2 rounded-[12px] bg-soft-gray px-3 py-2.5 text-body-sm", className)}>
      <Hourglass className="size-4 shrink-0 text-ink" />
      <p className="min-w-0 text-graphite">
        {label} <span className="font-semibold text-ink">{left > 0 ? formatDuration(left) : "sebentar lagi"}</span>
        <span className="block text-caption text-smoke">Batas: {formatDateTime(until)}</span>
      </p>
    </div>
  );
}

const ctaBase =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-control px-5 py-2.5 text-center text-[14px] font-semibold leading-tight transition-colors [&_svg]:size-4 [&_svg]:shrink-0";
const ctaVariant = {
  primary: "bg-ink text-white hover:bg-graphite",
  secondary: "border border-border-gray bg-white text-ink hover:border-ink",
} as const;

/** Big pill CTA link whose label may wrap on narrow phones (Button/ButtonLink never wrap). */
export function CtaLink({ href, variant = "primary", children }: { href: string; variant?: keyof typeof ctaVariant; children: ReactNode }) {
  return (
    <Link href={href} className={cn(ctaBase, ctaVariant[variant])}>
      {children}
    </Link>
  );
}

export function CtaButton({ onClick, variant = "primary", children }: { onClick: () => void; variant?: keyof typeof ctaVariant; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn(ctaBase, ctaVariant[variant])}>
      {children}
    </button>
  );
}

/** Pill chip with a 36px tap target (ui/Pill is 32px). Black when active. */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border px-3.5 text-nav font-medium transition-colors",
        active ? "border-ink bg-ink text-white" : "border-border-gray bg-white text-ink hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Wrapper for the buttons row; stacks on narrow phones. `split` = two equal columns (Tolak / Setujui). */
export function ActionButtons({ children, className, split }: { children: ReactNode; className?: string; split?: boolean }) {
  return <div className={cn("mt-4 gap-2", split ? "grid grid-cols-2" : "flex flex-col", className)}>{children}</div>;
}

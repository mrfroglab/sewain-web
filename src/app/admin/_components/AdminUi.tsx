import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** Page title inside the admin chrome (no back link, tighter top spacing than PageHeader). */
export function AdminTitle({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.5px] text-ink lg:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-body-sm text-smoke">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small section heading used between blocks of an admin page. */
export function AdminSection({ title, description, action, className, children }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-body-lg font-semibold tracking-[-0.2px] text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-body-sm text-smoke">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** Selectable chip (preset reasons, filters inside sheets). 36px tall for touch. */
export const chipClass = (active?: boolean, className?: string) =>
  cn(
    "inline-flex min-h-9 items-center gap-1.5 rounded-control border px-3.5 py-1.5 text-left text-nav font-medium transition-colors",
    active ? "border-ink bg-ink text-white" : "border-border-gray bg-white text-ink hover:border-ink",
    className,
  );

/** Horizontal bar: monochrome ink fill on a soft-gray track (white track when it sits on a soft-gray tile). */
export function Bar({ value, max, onSoft, className }: { value: number; max: number; onSoft?: boolean; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-control", onSoft ? "bg-white" : "bg-soft-gray", className)} aria-hidden>
      {/* Keep a visible sliver for non-zero values so "1" never looks like "0". */}
      <div className="h-full rounded-control bg-ink" style={{ width: value > 0 ? `max(${pct}%, 6px)` : 0 }} />
    </div>
  );
}

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** extra muted text after the label, e.g. "+ 1 telat" */
  note?: string;
}

/** Labelled bar list (one series → no legend; every value is printed, so color never carries meaning alone). */
export function BarList({ rows, format = String, className }: { rows: BarRow[]; format?: (n: number) => string; className?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <ul className={cn("space-y-3", className)}>
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${format(r.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-body-sm">
            <span className="min-w-0 truncate text-graphite">
              {r.label}
              {r.note && <span className="ml-1.5 text-caption text-smoke">{r.note}</span>}
            </span>
            <span className={cn("shrink-0 font-semibold tabular-nums", r.value > 0 ? "text-ink" : "text-ash")}>{format(r.value)}</span>
          </div>
          <Bar value={r.value} max={max} />
        </li>
      ))}
    </ul>
  );
}

/** KPI tile: label, big value, one supporting line. */
export function StatTile({ label, value, sub, icon, className, children }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col rounded-card bg-soft-gray p-4", className)}>
      <p className="flex items-center gap-1.5 text-caption font-medium text-smoke">
        {icon}
        {label}
      </p>
      <p className="mt-2 break-words text-[22px] font-semibold leading-none tracking-[-0.6px] text-ink tabular-nums sm:text-[24px]">{value}</p>
      {sub && <p className="mt-1.5 text-caption text-smoke">{sub}</p>}
      {children}
    </div>
  );
}

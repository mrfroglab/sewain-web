import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

/** Centered page container: max 1280px, 16px gutter on phones, 24–32px on desktop. */
export function Container({ className, children, narrow }: { className?: string; children: ReactNode; narrow?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", narrow ? "max-w-3xl" : "max-w-[1280px]", className)}>{children}</div>;
}

/** Section heading row: left title + small "Lihat semua" link (DESIGN.md › Section Heading Row). */
export function SectionHeading({ title, href, linkLabel = "Lihat semua", description, className }: { title: ReactNode; href?: string; linkLabel?: string; description?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.5px] text-ink sm:text-section-heading">{title}</h2>
        {description && <p className="mt-1 text-body-sm text-smoke">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-nav font-medium text-ink underline-offset-4 hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

/** Title bar for inner pages: back link + title + optional actions. */
export function PageHeader({ title, subtitle, back, actions, className }: { title: ReactNode; subtitle?: ReactNode; back?: string; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3 pb-4 pt-4 lg:pt-8", className)}>
      {back && (
        <Link href={back} aria-label="Kembali" className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border border-border-gray bg-white hover:border-ink">
          <ArrowLeft className="size-4" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.5px] text-ink lg:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-body-sm text-smoke">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-card bg-soft-gray px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-full bg-white text-ink shadow-hairline">{icon}</div>}
      <p className="text-body font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-body-sm text-smoke">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[10px] bg-soft-gray", className)} />;
}

/** Generic loading placeholder while localStorage data hydrates. */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Memuat">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/5] w-full rounded-image" />
            <Skeleton className="mt-2 h-3.5 w-4/5" />
            <Skeleton className="mt-1.5 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** White card with hairline border — use sparingly (DESIGN.md: whitespace over boxes). */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-card bg-white p-4 shadow-hairline sm:p-5", className)}>{children}</div>;
}

/** Key–value row used in agreement summaries and detail panels. */
export function KV({ k, v, strong, className }: { k: ReactNode; v: ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-1.5 text-body-sm", className)}>
      <span className="text-smoke">{k}</span>
      <span className={cn("text-right", strong ? "font-semibold text-ink" : "text-graphite")}>{v}</span>
    </div>
  );
}

/** Quiet inline notice (info / warning) — monochrome, icon-led. */
export function Notice({ icon, title, children, tone = "soft", className }: { icon?: ReactNode; title?: ReactNode; children?: ReactNode; tone?: "soft" | "outline" | "ink"; className?: string }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-[12px] p-3.5 text-body-sm",
        tone === "soft" && "bg-soft-gray text-graphite",
        tone === "outline" && "border border-border-gray bg-white text-graphite",
        tone === "ink" && "bg-ink text-white",
        className,
      )}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        {title && <p className={cn("font-semibold", tone === "ink" ? "text-white" : "text-ink")}>{title}</p>}
        {children && <div className={cn(title ? "mt-0.5" : "", tone === "ink" ? "text-white/80" : "")}>{children}</div>}
      </div>
    </div>
  );
}

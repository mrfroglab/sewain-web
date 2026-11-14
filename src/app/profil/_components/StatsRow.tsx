import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { Stars } from "@/components/ui/Stars";
import type { RatingSummary } from "@/lib/selectors";

function Tile({ value, label, children }: { value: ReactNode; label: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-card bg-soft-gray p-3 sm:p-4">
      <p className="text-[22px] font-semibold leading-none tracking-[-0.5px] text-ink tabular-nums">{value}</p>
      <div className="mt-2 h-3">{children}</div>
      <p className="mt-1.5 truncate text-caption text-smoke">{label}</p>
    </div>
  );
}

/** Reputation at a glance: rating, trust score (FR-T3), strikes. */
export function StatsRow({ rating, trust, strikes, className }: { rating: RatingSummary; trust: number; strikes: number; className?: string }) {
  return (
    <section aria-label="Reputasi" className={cn("grid grid-cols-3 gap-2 sm:gap-3", className)}>
      <Tile value={rating.count ? rating.rating.toFixed(1) : "–"} label={rating.count ? `${rating.count} ulasan` : "Belum ada ulasan"}>
        <Stars rating={rating.rating} size={10} showScore={false} />
      </Tile>
      <Tile
        value={
          <>
            {trust}
            <span className="text-body-sm font-medium text-smoke">/100</span>
          </>
        }
        label="Skor kepercayaan"
      >
        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-image-gray" aria-hidden>
          <span className="block h-full rounded-full bg-ink" style={{ width: `${trust}%` }} />
        </span>
      </Tile>
      <Tile value={strikes} label={strikes ? "Strike" : "Tanpa strike"} />
    </section>
  );
}

"use client";

import { MessageSquareQuote } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { formatDate, isoDate } from "@/lib/format";
import { useEnsureUsers } from "@/lib/profiles";
import { publicName, type RatingSummary } from "@/lib/selectors";
import type { Review, User } from "@/lib/types";

/**
 * Star distribution 5..1. Seeded history only stores an average + count, so that part is split
 * between the two neighbouring star buckets (keeps the bars consistent with the shown average);
 * live reviews are added with their exact rating.
 */
export function ratingDistribution(base: { rating: number; count: number }, live: Review[]): number[] {
  const buckets = [0, 0, 0, 0, 0]; // index 0 = 1 star … index 4 = 5 stars
  if (base.count > 0 && base.rating > 0) {
    const r = Math.min(5, Math.max(1, base.rating));
    const lo = Math.floor(r);
    const hi = Math.ceil(r);
    const nHi = lo === hi ? base.count : Math.round((r - lo) * base.count);
    buckets[hi - 1] += nHi;
    if (lo !== hi) buckets[lo - 1] += base.count - nHi;
  }
  for (const rv of live) buckets[Math.min(5, Math.max(1, Math.round(rv.rating))) - 1]++;
  return buckets.reverse(); // 5 → 1
}

/** Prominent average + distribution bars (DESIGN.md › Product Detail › Reviews). Bars stay monochrome. */
export function RatingSummaryBlock({ summary, distribution }: { summary: RatingSummary; distribution: number[] }) {
  const total = distribution.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="flex items-center gap-6 lg:block">
      <div className="shrink-0">
        <p className="text-[44px] font-bold leading-none tracking-[-1.5px] text-ink">{summary.rating ? summary.rating.toFixed(1) : "–"}</p>
        <Stars rating={summary.rating} size={14} showScore={false} className="mt-2" />
        <p className="mt-1 text-caption text-smoke">{summary.count ? `${summary.count} ulasan` : "Belum ada ulasan"}</p>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 lg:mt-5" aria-label="Sebaran rating">
        {distribution.map((n, i) => {
          const stars = 5 - i;
          return (
            <li key={stars} className="flex items-center gap-2 text-caption text-smoke">
              <span className="w-3 text-right font-medium text-graphite">{stars}</span>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-soft-gray">
                <span className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${(n / total) * 100}%` }} />
              </span>
              <span className="w-7 text-right tabular-nums">{n}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ReviewCard({ review, reviewer, context }: { review: Review; reviewer?: User; context?: ReactNode }) {
  const name = publicName(reviewer);
  return (
    <article className="rounded-card bg-white p-4 shadow-hairline">
      <div className="flex items-start gap-3">
        <Avatar name={name} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
            <p className="truncate text-body-sm font-semibold text-ink">{name}</p>
            <time className="text-micro text-ash" dateTime={isoDate(review.createdAt)}>
              {formatDate(isoDate(review.createdAt), true)}
            </time>
          </div>
          <Stars rating={review.rating} showScore={false} className="mt-0.5" />
        </div>
      </div>
      {review.comment && <p className="mt-2.5 text-body-sm leading-[1.5] text-graphite">{review.comment}</p>}
      {context && <p className="mt-2 text-micro text-ash">{context}</p>}
    </article>
  );
}

/** Summary on the left, review cards on the right (stacked on phones). Shows 4 cards, then "Lihat semua". */
export function ReviewsBlock({
  summary,
  base,
  reviews,
  users,
  context,
  emptyText,
}: {
  summary: RatingSummary;
  base: { rating: number; count: number };
  reviews: Review[];
  users: User[];
  context?: (r: Review) => ReactNode;
  emptyText: string;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? reviews : reviews.slice(0, 4);
  // Reviewers the snapshot does not carry (scoped v2): fetch their public profile for name + avatar.
  useEnsureUsers(shown.map((r) => r.fromId));
  const distribution = ratingDistribution(base, reviews);
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <RatingSummaryBlock summary={summary} distribution={distribution} />
      <div className="min-w-0">
        {reviews.length === 0 ? (
          <div className="flex items-start gap-3 rounded-card bg-soft-gray p-4 text-body-sm text-graphite">
            <MessageSquareQuote className="mt-0.5 size-4 shrink-0" />
            <p>
              {summary.count ? "Ulasan tertulis tampil setelah kedua pihak saling memberi rating (atau setelah 7 hari), supaya adil." : emptyText}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {shown.map((r) => (
                <ReviewCard key={r.id} review={r} reviewer={users.find((u) => u.id === r.fromId)} context={context?.(r)} />
              ))}
            </div>
            {reviews.length > 4 && (
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => setAll((v) => !v)}>
                {all ? "Tampilkan lebih sedikit" : `Lihat semua ulasan (${reviews.length})`}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

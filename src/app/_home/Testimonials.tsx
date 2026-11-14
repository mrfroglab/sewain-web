"use client";

import { BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { relativeTime } from "@/lib/format";
import { findUser, isVerified, publicName, visibleReviews } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import { HOME_COPY } from "./copy";

/**
 * Testimonials (DESIGN.md › Testimonial Card): renter reviews with rating ≥ 4 and a real sentence.
 * Only reviews that are already public (FR-T2) are used. 3 cards per view on desktop, 2 on tablet,
 * one-and-a-peek on phones; the outlined circular controls page through the row.
 */
export function Testimonials() {
  const { reviews, users, listings } = useAppStore(useShallow((s) => ({ reviews: s.reviews, users: s.users, listings: s.listings })));
  const now = useNow();
  const items = useMemo(
    () => visibleReviews({ reviews }, now, (r) => r.fromRole === "penyewa" && r.rating >= 4 && r.comment.trim().length > 60).slice(0, 6),
    [reviews, now],
  );

  const rowRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  const measure = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setEdges({ atStart: el.scrollLeft <= 4, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, items.length]);
  const page = (dir: 1 | -1) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  if (items.length === 0) return null;
  const scrollable = !(edges.atStart && edges.atEnd);

  return (
    <section aria-labelledby="testimoni-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id="testimoni-title" className="text-[20px] font-semibold leading-tight tracking-[-0.5px] text-ink sm:text-section-heading">
            {HOME_COPY.testimonials}
          </h2>
          <p className="mt-1 text-body-sm text-smoke">{HOME_COPY.testimonialsDescription}</p>
        </div>
        {scrollable && (
          <div className="hidden shrink-0 gap-2 sm:flex">
            <IconButton label="Ulasan sebelumnya" onClick={() => page(-1)} disabled={edges.atStart}>
              <ChevronLeft className="size-4" />
            </IconButton>
            <IconButton label="Ulasan berikutnya" onClick={() => page(1)} disabled={edges.atEnd}>
              <ChevronRight className="size-4" />
            </IconButton>
          </div>
        )}
      </div>

      <ul
        ref={rowRef}
        onScroll={measure}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {items.map((r) => {
          const author = findUser({ users }, r.fromId);
          const name = publicName(author);
          const listing = listings.find((l) => l.id === r.listingId);
          return (
            <li key={r.id} className="w-[86%] shrink-0 snap-start sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-32px)/3)]">
              <figure className="flex h-full flex-col rounded-card bg-white p-5 shadow-hairline">
                <figcaption className="flex items-center gap-3">
                  <Avatar name={name} size={36} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-body-sm font-semibold text-ink">
                      <span className="truncate">{name}</span>
                      {isVerified(author) && <BadgeCheck className="size-3.5 shrink-0" aria-label="Terverifikasi" />}
                    </p>
                    <Stars rating={r.rating} showScore={false} className="mt-0.5" />
                  </div>
                </figcaption>
                <blockquote className="mt-3 line-clamp-3 flex-1 text-[13px] leading-[1.5] text-graphite">“{r.comment.trim()}”</blockquote>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-gray pt-3">
                  {listing ? (
                    <Link href={`/barang/${listing.id}`} className="min-w-0 truncate text-caption font-medium text-ink underline-offset-4 hover:underline">
                      {listing.title}
                    </Link>
                  ) : (
                    <span />
                  )}
                  <time dateTime={new Date(r.createdAt).toISOString()} className="shrink-0 text-micro text-ash">
                    {relativeTime(r.createdAt, now)}
                  </time>
                </div>
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

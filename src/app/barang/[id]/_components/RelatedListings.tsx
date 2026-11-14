"use client";

import { ListingCard } from "@/components/listing/ListingCard";
import { SectionHeading } from "@/components/ui/Layout";
import type { ListingHit } from "@/lib/selectors";

/** Horizontal product-card row (DESIGN.md › Product Detail › Related products). Swipeable on phones. */
export function RelatedListings({ hits, categoryId, categoryName }: { hits: ListingHit[]; categoryId: string; categoryName: string }) {
  if (hits.length === 0) return null;
  return (
    <section className="mt-14" aria-labelledby="terkait">
      <SectionHeading title={<span id="terkait">{categoryName} lainnya di sekitar</span>} href={`/cari?kategori=${categoryId}`} />
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:gap-4 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:[&>*:nth-child(n+6)]:hidden">
        {hits.map((h) => (
          <ListingCard key={h.listing.id} listing={h.listing} owner={h.owner} rating={h.rating} distanceKm={h.distanceKm} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-auto" />
        ))}
      </div>
    </section>
  );
}

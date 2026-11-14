"use client";

import { MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { ListingCard } from "@/components/listing/ListingCard";
import { LocationSheet, useSearchLabel } from "@/components/shell/LocationSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { EmptyState, SectionHeading } from "@/components/ui/Layout";
import { distanceTo, findUser, listingRating, liveListings, searchListings, type ListingHit } from "@/lib/selectors";
import { useNow } from "@/lib/store";
import { HOME_COPY } from "./copy";
import { useNearbyHits, useSearchSlices } from "./useHomeData";

/** "Kampus UGM · 3 km" as a quiet button that opens the location/radius sheet. */
function SearchPointButton({ onClick }: { onClick: () => void }) {
  const label = useSearchLabel();
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-body-sm text-smoke underline-offset-4 hover:text-ink hover:underline">
      <MapPin className="size-3.5 shrink-0" aria-hidden />
      <span>{label}</span>
      <span className="sr-only">, ubah lokasi atau radius</span>
    </button>
  );
}

function NoResults({ onWiden }: { onWiden: () => void }) {
  return (
    <EmptyState
      icon={<MapPin className="size-5" />}
      title="Belum ada barang dalam radius ini"
      description="Coba perluas radius pencarian, atau tulis permintaan di papan supaya penyedia di sekitar tahu kamu butuh apa."
      action={
        <>
          <Button onClick={onWiden}>Perluas radius</Button>
          <ButtonLink href="/papan" variant="secondary">
            Buat permintaan
          </ButtonLink>
        </>
      }
    />
  );
}

/**
 * "Baru di sekitarmu" (DESIGN.md › New Arrivals): newest listings inside the two-way radius.
 * Phones get a swipeable row (2 cards + a peek); tablet 3 columns (9 cards); desktop 5 columns (10 cards).
 */
export function NewNearby() {
  const { hits } = useNearbyHits("terbaru");
  const [locOpen, setLocOpen] = useState(false);
  const items = hits.slice(0, 10);

  return (
    <section aria-labelledby="baru-title">
      <SectionHeading
        title={<span id="baru-title">{HOME_COPY.newNearby}</span>}
        description={<SearchPointButton onClick={() => setLocOpen(true)} />}
        href="/cari?urut=terbaru"
      />
      {items.length === 0 ? (
        <NoResults onWiden={() => setLocOpen(true)} />
      ) : (
        <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
          {items.map((h, i) => (
            <li key={h.listing.id} className={cn("w-[44%] shrink-0 snap-start sm:w-auto", i === 9 && "sm:hidden lg:block")}>
              <ListingCard listing={h.listing} owner={h.owner} rating={h.rating} distanceKm={h.distanceKm} />
            </li>
          ))}
        </ul>
      )}
      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </section>
  );
}

/**
 * "Paling sering disewa" (DESIGN.md › Trending): most-rented listings near the visitor.
 * If the radius is so small that fewer than 4 match, fall back to the whole pilot area so the
 * section never looks broken — and say so in the description.
 */
export function MostRented() {
  const slices = useSearchSlices();
  const now = useNow();
  const { items, wide } = useMemo(() => {
    const byRent = (a: ListingHit, b: ListingHit) => b.listing.rentCount - a.listing.rentCount;
    const { hits } = searchListings(slices, {}, now);
    if (hits.length >= 4) return { items: hits.sort(byRent).slice(0, 8), wide: false };
    const all: ListingHit[] = liveListings(slices).map((listing) => ({
      listing,
      owner: findUser(slices, listing.ownerId),
      distanceKm: distanceTo(listing, slices.search),
      rating: listingRating(slices, listing, now),
    }));
    return { items: all.sort(byRent).slice(0, 8), wide: true };
  }, [slices, now]);

  if (items.length === 0) return null;
  return (
    <section aria-labelledby="populer-title">
      <SectionHeading
        title={<span id="populer-title">{HOME_COPY.popular}</span>}
        description={wide ? "Dari seluruh area pilot sekitar UGM" : "Barang yang paling sering dipinjam tetangga sekitarmu"}
        href="/cari"
      />
      {/* 2 columns up to tablet so 8 cards fill 4 clean rows; 4 columns from 768px. */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 md:grid-cols-4">
        {items.map((h) => (
          <li key={h.listing.id} className="min-w-0">
            <ListingCard listing={h.listing} owner={h.owner} rating={h.rating} distanceKm={h.distanceKm} />
          </li>
        ))}
      </ul>
    </section>
  );
}

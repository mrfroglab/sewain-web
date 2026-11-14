"use client";

import { BadgeCheck, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { MapView, type MapMarker } from "@/components/map/MapView";
import { cn } from "@/components/ui/cn";
import { Stars } from "@/components/ui/Stars";
import { formatDistance, rupiah, rupiahShort } from "@/lib/format";
import { areaLabel, providerLabel, type ListingHit } from "@/lib/selectors";
import type { SearchPrefs } from "@/lib/types";

/** Compact horizontal result (map side list + the mini card over the map). */
function HitRow({ hit, className, onHover }: { hit: ListingHit; className?: string; onHover?: () => void }) {
  const { listing, owner } = hit;
  return (
    <Link href={`/barang/${listing.id}`} onMouseEnter={onHover} onFocus={onHover} className={cn("flex gap-3", className)}>
      <div className="relative aspect-[4/5] w-[76px] shrink-0 overflow-hidden rounded-image bg-soft-gray">
        <ListingImage src={listing.photos[0]} alt={listing.title} />
      </div>
      <div className="min-w-0 flex-1 space-y-1 py-0.5">
        <p className="line-clamp-2 text-product-title font-semibold text-ink">{listing.title}</p>
        <Stars rating={hit.rating.rating} count={hit.rating.count} />
        <p className="text-product-title font-semibold text-ink">
          {rupiah(listing.pricePerDay)}
          <span className="font-normal text-smoke"> /hari</span>
        </p>
        <p className="flex items-center gap-1 text-caption text-smoke">
          <span className="min-w-0 truncate">
            {formatDistance(hit.distanceKm)} · {areaLabel(listing)} · {providerLabel(owner)}
          </span>
          {owner?.verification.status === "terverifikasi" && <BadgeCheck className="size-3 shrink-0 text-graphite" aria-label="Terverifikasi" />}
        </p>
      </div>
    </Link>
  );
}

const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

/**
 * Map mode: price pins inside the search-radius circle. Pins sit at the listing's approximate point
 * (area + jitter), never an address (FR-S6). Tap a pin → mini card on phones, highlight + scroll on desktop.
 */
export function ResultsMap({ hits, search }: { hits: ListingHit[]; search: SearchPrefs }) {
  const [selected, setSelected] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());

  const markers = useMemo<MapMarker[]>(
    () =>
      hits.map((h) => ({
        id: h.listing.id,
        lat: h.listing.location.lat,
        lng: h.listing.location.lng,
        label: rupiahShort(h.listing.pricePerDay),
        active: h.listing.id === selected,
      })),
    [hits, selected],
  );

  const selectedHit = selected ? hits.find((h) => h.listing.id === selected) : undefined;

  const onMarkerClick = (id: string) => {
    setSelected(id);
    if (isDesktop()) rows.current.get(id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_420px] lg:items-start lg:gap-6">
      <div className="relative h-[60vh] min-h-[320px] lg:sticky lg:top-[126px] lg:h-[calc(100dvh-150px)] lg:min-h-[420px]">
        <MapView center={search.point} radiusKm={search.radiusKm} markers={markers} onMarkerClick={onMarkerClick} />
        {selectedHit && (
          <div className="animate-fade-up absolute inset-x-3 bottom-3 z-10 rounded-card bg-white p-2.5 pr-10 shadow-floating lg:hidden">
            <HitRow hit={selectedHit} />
            <button type="button" onClick={() => setSelected(null)} aria-label="Tutup" className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full text-graphite hover:bg-soft-gray">
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      <ul className="mt-4 divide-y divide-border-gray lg:mt-0" aria-label="Hasil di peta">
        {hits.map((h) => {
          const id = h.listing.id;
          return (
            <li
              key={id}
              ref={(el) => {
                if (el) rows.current.set(id, el);
                else rows.current.delete(id);
              }}
              className={cn("scroll-mt-[140px] rounded-[12px] px-2 py-3 transition-colors", selected === id && "bg-soft-gray")}
            >
              <HitRow hit={h} onHover={() => isDesktop() && setSelected(id)} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

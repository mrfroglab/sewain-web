"use client";

import { BadgeCheck, Heart, Store } from "lucide-react";
import Link from "next/link";
import { formatDistance, rupiah } from "@/lib/format";
import { collateralChip } from "@/lib/pricing";
import { areaLabel, type RatingSummary } from "@/lib/selectors";
import { useCurrentUser } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { Listing, User } from "@/lib/types";
import { Badge } from "../ui/Badge";
import { cn } from "../ui/cn";
import { Stars } from "../ui/Stars";
import { ListingImage } from "./ListingImage";

/**
 * Product card (DESIGN.md › Product Card): image-led, 4:5, rounded, no heavy border.
 * Name, rating, price immediately below; wishlist control top-right; one badge top-left.
 */
export function ListingCard({
  listing,
  owner,
  rating,
  distanceKm,
  className,
  priority,
}: {
  listing: Listing;
  owner?: User;
  rating: RatingSummary;
  distanceKm?: number;
  className?: string;
  priority?: boolean;
}) {
  const user = useCurrentUser();
  const fav = useAppStore((s) => (user ? (s.favorites[user.id] ?? []).includes(listing.id) : false));
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const highValueBadge = useAppStore((s) => s.collateralRules.highValueBadge);
  const highValue = listing.itemValue > highValueBadge;

  const badge =
    owner?.accountType === "toko" ? (
      <Badge tone="white" icon={<Store className="size-3" />}>
        Toko
      </Badge>
    ) : highValue ? (
      <Badge tone="white">Bernilai tinggi</Badge>
    ) : owner?.earlyLender ? (
      <Badge tone="white">Early Lender</Badge>
    ) : null;

  return (
    <article className={cn("group relative min-w-0", className)}>
      <Link href={`/barang/${listing.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-image bg-soft-gray">
          <ListingImage src={listing.photos[0]} alt={listing.title} priority={priority} className="transition-transform duration-300 group-hover:scale-[1.03]" />
          {badge && <div className="absolute left-2 top-2">{badge}</div>}
          {listing.durationDiscount && (
            <div className="absolute bottom-2 left-2">
              <Badge tone="sale">
                -{listing.durationDiscount.percent}% ≥{listing.durationDiscount.minDays} hari
              </Badge>
            </div>
          )}
        </div>
        <div className="mt-2.5 space-y-1">
          <h3 className="line-clamp-2 text-product-title font-semibold text-ink">{listing.title}</h3>
          <Stars rating={rating.rating} count={rating.count} />
          <p className="text-product-title font-semibold text-ink">
            {rupiah(listing.pricePerDay)}
            <span className="font-normal text-smoke"> /hari</span>
          </p>
          <p className="truncate text-caption text-smoke">
            {distanceKm != null ? `${formatDistance(distanceKm)} · ` : ""}
            {areaLabel(listing)}
          </p>
          <p className="flex items-center gap-1 truncate text-caption text-graphite">
            {owner?.verification.status === "terverifikasi" && <BadgeCheck className="size-3 shrink-0" aria-label="Penyedia terverifikasi" />}
            {collateralChip(listing.collateralOptions)}
          </p>
        </div>
      </Link>
      <button
        type="button"
        aria-label={fav ? "Hapus dari favorit" : "Simpan ke favorit"}
        aria-pressed={fav}
        onClick={() => {
          if (!user) return toast("Masuk dulu untuk menyimpan favorit.");
          toggleFavorite(user.id, listing.id);
        }}
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white text-ink shadow-floating transition-transform hover:scale-105"
      >
        <Heart className="size-4" fill={fav ? "currentColor" : "none"} />
      </button>
    </article>
  );
}

/** Grid wrapper with the DESIGN.md column counts. */
export function ListingGrid({ children, cols = 5, className }: { children: React.ReactNode; cols?: 4 | 5; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4", cols === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4", className)}>{children}</div>
  );
}

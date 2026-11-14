"use client";

import { ArrowLeft, BadgeCheck, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import { ListingImage } from "@/components/listing/ListingImage";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateRange } from "@/lib/format";
import { isVerified, publicName } from "@/lib/selectors";
import type { Booking, Listing, User } from "@/lib/types";

/** Small StatusBadge for tight rows (the foundation chip is h-6). */
export const smallBadge = "[&>span]:h-5 [&>span]:px-2 [&>span]:text-micro";

/**
 * Chat top bar: back to the booking, the other party (public name + "Terverifikasi" only, FR-A5)
 * and a mini-card of the listing with the booking status.
 */
export function ChatHeader({ booking, listing, other, otherRole, mediator }: { booking: Booking; listing: Listing; other?: User; otherRole: "Penyewa" | "Penyedia"; mediator?: { renter?: User; provider?: User } }) {
  const verified = isVerified(other);
  return (
    <div className="shrink-0 border-b border-border-gray bg-white">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href={`/sewaan/${booking.id}`} aria-label="Kembali ke detail sewaan" className="-ml-1 grid size-9 shrink-0 place-items-center rounded-full hover:bg-soft-gray">
          <ArrowLeft className="size-5" />
        </Link>
        {mediator ? (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white">
              <Eye className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold leading-tight text-ink">
                {publicName(mediator.renter)} & {publicName(mediator.provider)}
              </p>
              <p className="truncate text-caption text-smoke">Mode mediator · hanya baca</p>
            </div>
          </>
        ) : (
          <>
            <Avatar name={publicName(other)} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold leading-tight text-ink">{publicName(other)}</p>
              <p className="flex items-center gap-1 truncate text-caption text-smoke">
                {verified ? (
                  <>
                    <BadgeCheck className="size-3.5 shrink-0 text-ink" aria-hidden />
                    <span className="font-medium text-graphite">Terverifikasi</span>
                  </>
                ) : (
                  <span>Belum terverifikasi</span>
                )}
                <span aria-hidden>·</span>
                <span>{otherRole}</span>
              </p>
            </div>
          </>
        )}
      </div>

      <Link href={`/sewaan/${booking.id}`} className="flex items-center gap-3 border-t border-border-gray px-4 py-1.5 hover:bg-soft-gray" aria-label={`Buka detail sewaan ${listing.title}`}>
        <span className="relative size-9 shrink-0 overflow-hidden rounded-[8px] bg-soft-gray">
          <ListingImage src={listing.photos[0]} alt="" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-product-title font-semibold text-ink">{listing.title}</span>
          <span className="block truncate text-micro text-smoke">
            {booking.code} · {formatDateRange(booking.startDate, booking.endDate)}
          </span>
        </span>
        <StatusBadge status={booking.status} overdue={booking.overdue} className={`shrink-0 ${smallBadge}`} />
        <ChevronRight className="size-4 shrink-0 text-ash" aria-hidden />
      </Link>
    </div>
  );
}

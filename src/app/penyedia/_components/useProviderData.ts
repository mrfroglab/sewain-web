"use client";

import { useMemo } from "react";
import { isoDate } from "@/lib/format";
import { nextAction, userRating } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import type { Booking, BookingStatus, Listing, User } from "@/lib/types";

const ONGOING: BookingStatus[] = ["ACCEPTED", "ACTIVE", "RETURNED", "DISPUTED"];
/** Bookings that count as earned this month (P1 "Ringkasan pendapatan"). */
const EARNING: BookingStatus[] = ["COMPLETED", "RESOLVED", "ACTIVE", "RETURNED"];

export interface OngoingRow {
  b: Booking;
  listing?: Listing;
  renter?: User;
  action: string | null;
}

/** Everything the provider dashboard shows, derived from raw store slices. */
export function useProviderData(user: User) {
  const listings = useAppStore((s) => s.listings);
  const bookings = useAppStore((s) => s.bookings);
  const users = useAppStore((s) => s.users);
  const reviews = useAppStore((s) => s.reviews);
  const now = useNow(30_000);

  return useMemo(() => {
    const listingById = new Map(listings.map((l) => [l.id, l]));
    const userById = new Map(users.map((u) => [u.id, u]));
    const mine = listings.filter((l) => l.ownerId === user.id).sort((a, b) => b.createdAt - a.createdAt);
    const asProvider = bookings.filter((b) => b.providerId === user.id);

    const requests = asProvider.filter((b) => b.status === "REQUESTED").sort((a, b) => a.expiresAt - b.expiresAt);

    const ongoing: OngoingRow[] = asProvider
      .filter((b) => ONGOING.includes(b.status))
      .map((b) => ({ b, listing: listingById.get(b.listingId), renter: userById.get(b.renterId), action: nextAction(b, user.id, reviews) }))
      .sort((x, y) => Number(!!y.action) - Number(!!x.action) || Number(y.b.overdue) - Number(x.b.overdue) || x.b.endDate.localeCompare(y.b.endDate));

    const month = isoDate(now).slice(0, 7);
    const earned = asProvider.filter((b) => EARNING.includes(b.status) && b.startDate.slice(0, 7) === month);

    return {
      now,
      listingById,
      userById,
      mine,
      requests,
      ongoing,
      stats: {
        activeListings: mine.filter((l) => l.status === "aktif").length,
        waiting: requests.length,
        renting: asProvider.filter((b) => b.status === "ACTIVE").length,
        income: earned.reduce((sum, b) => sum + b.agreement.quote.total, 0),
        incomeCount: earned.length,
        rating: userRating({ users, reviews }, user.id, now),
      },
      ratingOf: (userId: string) => userRating({ users, reviews }, userId, now),
    };
  }, [listings, bookings, users, reviews, now, user.id]);
}

export type ProviderData = ReturnType<typeof useProviderData>;

"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { searchListings, type ListingFilters } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";

/** Slices searchListings needs. useShallow keeps the object stable until one of them changes. */
export function useSearchSlices() {
  return useAppStore(
    useShallow((s) => ({ listings: s.listings, users: s.users, reviews: s.reviews, bookings: s.bookings, search: s.search, scope: s.scope, viewerId: s.viewerId, listingBusy: s.listingBusy })),
  );
}

/** Two-way-radius search around the visitor's current search point (header location pill). */
export function useNearbyHits(sort: NonNullable<ListingFilters["sort"]>) {
  const slices = useSearchSlices();
  const now = useNow();
  return useMemo(() => searchListings(slices, { sort }, now), [slices, sort, now]);
}

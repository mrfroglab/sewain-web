"use client";

import { useEffect, useState } from "react";
import { serverSearch, useApiStatus, type ServerSearchResult } from "@/lib/api";
import type { ListingFilters } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import type { SearchPrefs } from "@/lib/types";

/**
 * Two-way radius search on the server (PostGIS ST_DWithin with LEAST(renter, provider radius), FR-S3).
 * Returns null while loading or when the API is offline — the page then uses the local computation.
 */
export function useServerSearch(filters: ListingFilters, search: SearchPrefs): ServerSearchResult | null {
  const online = useApiStatus((s) => s.status === "online");
  const version = useAppStore((s) => s.version);
  const [result, setResult] = useState<ServerSearchResult | null>(null);
  const key = JSON.stringify([filters.q, filters.category, filters.minPrice, filters.maxPrice, filters.handover, filters.collateral, filters.providerType, search.point, search.radiusKm, version]);
  useEffect(() => {
    if (!online) {
      setResult(null);
      return;
    }
    let cancelled = false;
    void serverSearch({
      lat: search.point.lat,
      lng: search.point.lng,
      radiusKm: search.radiusKm,
      q: filters.q,
      kategori: filters.category,
      min: filters.minPrice,
      max: filters.maxPrice,
      serah: filters.handover,
      jaminan: filters.collateral,
      penyedia: filters.providerType,
    }).then((r) => !cancelled && setResult(r));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, key]);
  return result;
}

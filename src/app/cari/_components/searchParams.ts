"use client";

// URL ⇄ filter state for /cari. The URL is the single source of truth so a search can be shared as a link:
//   /cari?q=&kategori=&jaminan=&penyedia=&serah=&min=&max=&mulai=&selesai=&urut=&tampilan=
// (location + radius live in the store's `search`, shared with the header pill.)

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { CATEGORIES, CATEGORY_BY_ID } from "@/lib/data/categories";
import { formatDate, formatDateRange, rupiahShort } from "@/lib/format";
import type { ListingFilters } from "@/lib/selectors";
import type { AccountType, CategoryId, HandoverMethod } from "@/lib/types";

export type View = "daftar" | "peta";
export type SortKey = NonNullable<ListingFilters["sort"]>;
export type CollateralFilter = NonNullable<ListingFilters["collateral"]>;
export type ParamKey = "q" | "kategori" | "jaminan" | "penyedia" | "serah" | "min" | "max" | "mulai" | "selesai" | "urut" | "tampilan";
export type ParamPatch = Partial<Record<ParamKey, string | number | null | undefined>>;

/** The filter pills, in display order. Each one maps to one or two URL params. */
export type FilterKey = "kategori" | "harga" | "tanggal" | "serah" | "jaminan" | "penyedia" | "urut";

export const FILTER_PARAMS: Record<FilterKey, ParamKey[]> = {
  kategori: ["kategori"],
  harga: ["min", "max"],
  tanggal: ["mulai", "selesai"],
  serah: ["serah"],
  jaminan: ["jaminan"],
  penyedia: ["penyedia"],
  urut: ["urut"],
};

export const SORT_LABEL: Record<SortKey, string> = {
  jarak: "Terdekat",
  "harga-naik": "Harga termurah",
  "harga-turun": "Harga termahal",
  rating: "Rating tertinggi",
  terbaru: "Terbaru",
};

export const COLLATERAL_LABEL: Record<CollateralFilter, string> = {
  "cukup-identitas": "Cukup titip kartu identitas",
  identitas: "Titip kartu identitas",
  deposit: "Uang deposit",
  barang: "Titip barang lain",
  custom: "Jaminan custom",
};

export const HANDOVER_SHORT: Record<HandoverMethod, string> = { cod: "COD / ketemuan", jemput: "Ambil sendiri", kurir: "Kurir", antar: "Diantar" };
export const PROVIDER_TYPE_LABEL: Record<AccountType, string> = { individu: "Individu", toko: "Toko rental" };

const SORTS = Object.keys(SORT_LABEL) as SortKey[];
const COLLATERALS = Object.keys(COLLATERAL_LABEL) as CollateralFilter[];
const HANDOVERS = Object.keys(HANDOVER_SHORT) as HandoverMethod[];
const PROVIDER_TYPES = Object.keys(PROVIDER_TYPE_LABEL) as AccountType[];

const oneOf = <T extends string>(v: string | null, allowed: readonly T[]): T | undefined =>
  v != null && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

const amount = (v: string | null) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
};

const isoDay = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export interface SearchState {
  filters: ListingFilters;
  view: View;
}

export function parseSearch(sp: Pick<URLSearchParams, "get">): SearchState {
  const q = sp.get("q")?.trim() || undefined;
  const kategori = sp.get("kategori");
  const category = CATEGORIES.some((c) => c.id === kategori) ? (kategori as CategoryId) : undefined;
  let minPrice = amount(sp.get("min"));
  let maxPrice = amount(sp.get("max"));
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  // A single date means "that one day".
  let start = isoDay(sp.get("mulai"));
  let end = isoDay(sp.get("selesai"));
  start ??= end;
  end ??= start;
  if (start && end && end < start) [start, end] = [end, start];
  return {
    filters: {
      q,
      category,
      minPrice,
      maxPrice,
      handover: oneOf(sp.get("serah"), HANDOVERS),
      collateral: oneOf(sp.get("jaminan"), COLLATERALS),
      providerType: oneOf(sp.get("penyedia"), PROVIDER_TYPES),
      start,
      end,
      sort: oneOf(sp.get("urut"), SORTS),
    },
    view: sp.get("tampilan") === "peta" ? "peta" : "daftar",
  };
}

export function priceLabel(min?: number, max?: number): string | null {
  if (min != null && max != null) return `${rupiahShort(min)}–${rupiahShort(max)}`;
  if (max != null) return `≤ ${rupiahShort(max)}`;
  if (min != null) return `≥ ${rupiahShort(min)}`;
  return null;
}

/** Text shown inside an active (black) filter pill, or null when the filter is not set. */
export function activeLabel(key: FilterKey, f: ListingFilters): string | null {
  switch (key) {
    case "kategori":
      return f.category ? CATEGORY_BY_ID[f.category].name : null;
    case "harga":
      return priceLabel(f.minPrice, f.maxPrice);
    case "tanggal":
      if (!f.start || !f.end) return null;
      return f.start === f.end ? formatDate(f.start) : formatDateRange(f.start, f.end);
    case "serah":
      return f.handover ? HANDOVER_SHORT[f.handover] : null;
    case "jaminan":
      return f.collateral ? COLLATERAL_LABEL[f.collateral] : null;
    case "penyedia":
      return f.providerType ? PROVIDER_TYPE_LABEL[f.providerType] : null;
    case "urut":
      return f.sort && f.sort !== "jarak" ? SORT_LABEL[f.sort] : null;
  }
}

/** Read the search from the URL and write changes back with router.replace (no history spam, no scroll jump). */
export function useSearchState() {
  const sp = useSearchParams();
  const router = useRouter();
  const state = useMemo(() => parseSearch(sp), [sp]);

  const update = useCallback(
    (patch: ParamPatch) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      const qs = next.toString();
      router.replace(qs ? `/cari?${qs}` : "/cari", { scroll: false });
    },
    [sp, router],
  );

  const clear = useCallback((key: FilterKey) => update(Object.fromEntries(FILTER_PARAMS[key].map((p) => [p, null]))), [update]);

  /** Clears every filter but keeps the text query and the list/map choice. */
  const reset = useCallback(() => {
    const patch: ParamPatch = {};
    for (const params of Object.values(FILTER_PARAMS)) for (const p of params) patch[p] = null;
    update(patch);
  }, [update]);

  const activeCount = (Object.keys(FILTER_PARAMS) as FilterKey[]).filter((k) => activeLabel(k, state.filters) != null).length;

  return { ...state, update, clear, reset, activeCount };
}

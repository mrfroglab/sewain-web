"use client";

import { ChevronDown, Info, List, Map as MapIcon, MapPin, Megaphone, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ListingCard, ListingGrid } from "@/components/listing/ListingCard";
import { ButtonLink } from "@/components/ui/Button";
import { Ready } from "@/components/ui/Gate";
import { Container } from "@/components/ui/Layout";
import { LocationSheet, useSearchLabel } from "@/components/shell/LocationSheet";
import { AREA_BY_ID } from "@/lib/data/areas";
import { RADIUS_OPTIONS } from "@/lib/geo";
import { searchListings } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import { toast } from "@/lib/toast";
import { Chip, chipClass } from "./Chip";
import { EmptyResults } from "./EmptyResults";
import { FilterBar } from "./FilterBar";
import { FilterSheet } from "./FilterSheet";
import { ResultsMap } from "./ResultsMap";
import { useSearchState, type FilterKey } from "./searchParams";
import { useServerSearch } from "./useServerSearch";

/** /cari — reads its state from the URL; must be rendered inside <Suspense> (useSearchParams). */
export function SearchView() {
  return (
    <Ready>
      <SearchContent />
    </Ready>
  );
}

function SearchContent() {
  const { filters, view, update, clear, reset, activeCount } = useSearchState();
  const data = useAppStore(useShallow((s) => ({ listings: s.listings, users: s.users, reviews: s.reviews, bookings: s.bookings, search: s.search, scope: s.scope, viewerId: s.viewerId, listingBusy: s.listingBusy })));
  const setSearch = useAppStore((s) => s.setSearch);
  const now = useNow();
  const [sheet, setSheet] = useState<FilterKey | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const locLabel = useSearchLabel();

  const { search } = data;
  const local = useMemo(() => searchListings(data, filters, now), [data, filters, now]);
  // Server mode: membership + distance come from PostGIS; sorting, ratings and the date filter stay local.
  const server = useServerSearch(filters, search);
  const result = useMemo(() => {
    if (!server) return local;
    const dist = new Map(server.hits.map((h) => [h.id, h.distanceKm]));
    return { ...local, hits: local.hits.filter((h) => dist.has(h.listing.id)).map((h) => ({ ...h, distanceKm: dist.get(h.listing.id)! })), hiddenByProviderReach: server.hiddenByProviderReach };
  }, [local, server]);
  const nextRadius = RADIUS_OPTIONS.find((r) => r > search.radiusKm);
  const nextRadiusCount = useMemo(
    () => (nextRadius && result.hits.length === 0 ? searchListings(data, filters, now, { ...search, radiusKm: nextRadius }).hits.length : 0),
    [data, filters, now, search, nextRadius, result.hits.length],
  );

  const place = search.origin === "lokasi-saya" ? "lokasimu" : AREA_BY_ID[search.areaId]?.name ?? "UGM";
  const count = result.hits.length;
  const widen = () => {
    if (!nextRadius) return;
    setSearch({ radiusKm: nextRadius });
    toast(`Radius diperluas ke ${nextRadius} km.`, "success");
  };

  return (
    <Container className="pb-10">
      {/* Title row: count + search point/radius (FR-S1) */}
      <div className="flex items-start justify-between gap-3 pb-3 pt-4 lg:pt-8">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.5px] text-ink lg:text-[26px]">Cari barang</h1>
          <p className="mt-1 text-body-sm text-smoke" aria-live="polite">
            <span className="font-semibold text-ink">{count} barang</span>
            {filters.q ? ` untuk “${filters.q}”` : ""} dalam {search.radiusKm} km dari {place}
          </p>
        </div>
        <button type="button" onClick={() => setLocOpen(true)} className={chipClass(false, "max-w-[48%] sm:max-w-none")} aria-label={`Ubah lokasi dan radius: ${locLabel}`}>
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{locLabel}</span>
          <ChevronDown className="size-3.5 shrink-0 text-smoke" />
        </button>
      </div>

      <QueryBox key={filters.q ?? ""} initial={filters.q ?? ""} onSubmit={(q) => update({ q: q || null })} />

      <div className="mt-3">
        <FilterBar filters={filters} onOpen={setSheet} onClear={clear} />
      </div>

      {/* List / map toggle + reset */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Tampilan hasil">
          <Chip active={view === "daftar"} onClick={() => update({ tampilan: null })}>
            <List className="size-3.5" /> Daftar
          </Chip>
          <Chip active={view === "peta"} onClick={() => update({ tampilan: "peta" })}>
            <MapIcon className="size-3.5" /> Peta
          </Chip>
        </div>
        {activeCount > 0 && (
          <button type="button" onClick={reset} className="h-9 px-1 text-nav font-medium text-ink underline underline-offset-4 hover:text-graphite">
            Reset{activeCount > 1 ? ` (${activeCount})` : ""}
          </button>
        )}
      </div>

      {/* FR-S3: be open about the two-way radius rule */}
      {result.hiddenByProviderReach > 0 && (
        <p className="mt-3 flex gap-2 text-caption text-smoke">
          <Info className="mt-px size-3.5 shrink-0 text-graphite" aria-hidden />
          <span>
            <span className="font-semibold text-graphite">{result.hiddenByProviderReach} barang lain di luar jangkauan penyedia.</span> Barang hanya tampil kalau
            jaraknya masuk radius pencarianmu <em>dan</em> radius jangkauan yang diatur penyedianya.
          </span>
        </p>
      )}
      {server && <p className="mt-2 text-micro text-ash">Dihitung server dengan PostGIS: jarak ≤ radius pencarian dan ≤ radius jangkauan penyedia.</p>}

      <div className="mt-5">
        {count === 0 ? (
          <EmptyResults
            query={filters.q}
            radiusKm={search.radiusKm}
            nextRadius={nextRadius}
            nextRadiusCount={nextRadiusCount}
            hasFilters={activeCount > 0}
            onWiden={widen}
            onReset={reset}
          />
        ) : view === "peta" ? (
          <ResultsMap hits={result.hits} search={search} />
        ) : (
          <ListingGrid>
            {result.hits.map((h, i) => (
              <ListingCard key={h.listing.id} listing={h.listing} owner={h.owner} rating={h.rating} distanceKm={h.distanceKm} priority={i < 4} />
            ))}
          </ListingGrid>
        )}
      </div>

      {count > 0 && (
        <div className="mt-10 flex flex-col items-start gap-3 rounded-card bg-soft-gray p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-body font-semibold text-ink">Belum nemu yang pas?</p>
            <p className="mt-0.5 text-body-sm text-smoke">Tulis di papan permintaan. Penyedia di sekitar yang punya barang sejenis langsung dapat notifikasi.</p>
          </div>
          <ButtonLink href={`/papan?buat=1${filters.q ? `&q=${encodeURIComponent(filters.q)}` : ""}`} variant="secondary" className="shrink-0">
            <Megaphone className="size-4" /> Buat permintaan
          </ButtonLink>
        </div>
      )}

      <FilterSheet openKey={sheet} filters={filters} onClose={() => setSheet(null)} update={update} />
      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </Container>
  );
}

/** Free-text query for this page. Same param as the header search (`/cari?q=`), but keeps the other filters. */
function QueryBox({ initial, onSubmit }: { initial: string; onSubmit: (q: string) => void }) {
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      className="relative sm:max-w-lg"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(q.trim());
      }}
    >
      <label htmlFor="cari-q" className="sr-only">
        Kata kunci
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-smoke" aria-hidden />
      <input
        id="cari-q"
        type="search"
        enterKeyHint="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Mau sewa apa? Tenda, kamera, kebaya…"
        className="h-11 w-full rounded-control border border-border-gray bg-white pl-10 pr-12 text-body text-ink placeholder:text-ash focus:border-ink focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {q && (
        <button
          type="button"
          aria-label="Hapus kata kunci"
          onClick={() => {
            setQ("");
            onSubmit("");
          }}
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-graphite hover:bg-soft-gray"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}

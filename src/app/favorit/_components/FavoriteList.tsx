"use client";

import { Heart, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ListingCard, ListingGrid } from "@/components/listing/ListingCard";
import { LocationSheet, useSearchLabel } from "@/components/shell/LocationSheet";
import { ButtonLink } from "@/components/ui/Button";
import { RequireAuth } from "@/components/ui/Gate";
import { Container, EmptyState, PageHeader } from "@/components/ui/Layout";
import { distanceTo, findUser, listingRating, liveListings, type ListingHit } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import type { User } from "@/lib/types";

export function FavoriteList() {
  return <RequireAuth>{(user) => <Favorites user={user} />}</RequireAuth>;
}

/** Saved listings, newest first, with distance from the current search point. Paused/removed ones are listed separately. */
function Favorites({ user }: { user: User }) {
  const s = useAppStore(
    useShallow((st) => ({ favorites: st.favorites, listings: st.listings, users: st.users, reviews: st.reviews, search: st.search })),
  );
  const now = useNow();
  const label = useSearchLabel();
  const [locOpen, setLocOpen] = useState(false);

  const { available, unavailable } = useMemo(() => {
    const ids = [...(s.favorites[user.id] ?? [])].reverse(); // toggleFavorite appends → newest last
    const live = new Set(liveListings(s).map((l) => l.id));
    const hits: ListingHit[] = [];
    for (const id of ids) {
      const listing = s.listings.find((l) => l.id === id);
      if (!listing) continue;
      hits.push({ listing, owner: findUser(s, listing.ownerId), distanceKm: distanceTo(listing, s.search), rating: listingRating(s, listing, now) });
    }
    return { available: hits.filter((h) => live.has(h.listing.id)), unavailable: hits.filter((h) => !live.has(h.listing.id)) };
  }, [s, user.id, now]);

  const total = available.length + unavailable.length;

  return (
    <Container>
      <PageHeader
        title="Favorit"
        subtitle={
          total ? (
            <>
              {total} barang tersimpan · jarak dihitung dari{" "}
              <button type="button" onClick={() => setLocOpen(true)} className="inline-flex items-center gap-1 font-medium text-ink underline-offset-4 hover:underline">
                <MapPin className="size-3" aria-hidden />
                {label}
              </button>
            </>
          ) : (
            "Barang yang kamu simpan akan muncul di sini."
          )
        }
      />

      {total === 0 ? (
        <EmptyState
          className="mt-2"
          icon={<Heart className="size-5" />}
          title="Belum ada favorit"
          description="Ketuk ikon hati di barang yang kamu suka, biar gampang dicari lagi waktu butuh."
          action={<ButtonLink href="/cari">Cari barang</ButtonLink>}
        />
      ) : (
        <div className="space-y-10">
          {available.length > 0 ? (
            <ListingGrid>
              {available.map((h) => (
                <ListingCard key={h.listing.id} listing={h.listing} owner={h.owner} rating={h.rating} distanceKm={h.distanceKm} />
              ))}
            </ListingGrid>
          ) : (
            <EmptyState
              icon={<Heart className="size-5" />}
              title="Semua favoritmu sedang tidak tersedia"
              description="Penyedianya sedang menjeda barang-barang ini. Coba cari barang serupa di sekitarmu."
              action={<ButtonLink href="/cari">Cari barang serupa</ButtonLink>}
            />
          )}

          {unavailable.length > 0 && (
            <section aria-labelledby="fav-off-title">
              <h2 id="fav-off-title" className="text-body-lg font-semibold text-ink">
                Sedang tidak tersedia
              </h2>
              <p className="mb-4 mt-1 text-body-sm text-smoke">Dijeda atau diturunkan oleh penyedia. Tetap tersimpan kalau nanti aktif lagi.</p>
              <ListingGrid className="opacity-60">
                {unavailable.map((h) => (
                  <ListingCard key={h.listing.id} listing={h.listing} owner={h.owner} rating={h.rating} distanceKm={h.distanceKm} />
                ))}
              </ListingGrid>
            </section>
          )}
        </div>
      )}
      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </Container>
  );
}

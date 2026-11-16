"use client";

import { ChevronRight, PackageSearch } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { ReviewsBlock } from "@/app/barang/_components/Reviews";
import { ButtonLink } from "@/components/ui/Button";
import { Ready } from "@/components/ui/Gate";
import { Container, EmptyState, SectionHeading } from "@/components/ui/Layout";
import { AREA_BY_ID } from "@/lib/data/areas";
import { CATEGORY_BY_ID } from "@/lib/data/categories";
import { isoDate } from "@/lib/format";
import { isHighValue } from "@/lib/pricing";
import { useEnsureUsers } from "@/lib/profiles";
import { distanceTo, findUser, listingRating, liveListings, trustScore, userRating, visibleReviews, type ListingHit } from "@/lib/selectors";
import { useCurrentUser } from "@/lib/session";
import { useAppStore, useNow } from "@/lib/store";
import { AntiFraudNotice, ConditionNotes, ProviderRules, RiskNotice, Section, VehicleInfoBlock } from "./DetailSections";
import { Gallery } from "./Gallery";
import { InfoPanel, ctaState } from "./InfoPanel";
import { MobileCta } from "./MobileCta";
import { RelatedListings } from "./RelatedListings";

/** /barang/[id] — listing detail (DESIGN.md › Product Detail Compatibility, PRD 8.1 step 3). */
export function ListingDetail({ id }: { id: string }) {
  return (
    <Ready>
      <DetailBody id={id} />
    </Ready>
  );
}

function DetailBody({ id }: { id: string }) {
  const user = useCurrentUser();
  const now = useNow();
  const data = useAppStore(
    useShallow((s) => ({
      listings: s.listings,
      users: s.users,
      reviews: s.reviews,
      bookings: s.bookings,
      disputes: s.disputes,
      search: s.search,
      scope: s.scope,
      viewerId: s.viewerId,
      collateralRules: s.collateralRules,
    })),
  );
  const listing = data.listings.find((l) => l.id === id);
  useEnsureUsers([listing?.ownerId]);

  const view = useMemo(() => {
    if (!listing) return null;
    const owner = findUser(data, listing.ownerId);
    const reviews = visibleReviews(data, now, (r) => r.listingId === listing.id && r.fromRole === "penyewa");
    const related: ListingHit[] = liveListings(data)
      .filter((l) => l.category === listing.category && l.id !== listing.id)
      .map((l) => ({ listing: l, owner: findUser(data, l.ownerId), distanceKm: distanceTo(l, data.search), rating: listingRating(data, l, now) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 8);
    return {
      owner,
      reviews,
      related,
      rating: listingRating(data, listing, now),
      ownerRating: userRating(data, listing.ownerId, now),
      ownerTrust: trustScore(data, listing.ownerId, now),
      distanceKm: distanceTo(listing, data.search),
      originLabel: data.search.origin === "lokasi-saya" ? "lokasimu" : AREA_BY_ID[data.search.areaId]?.name ?? "titik pencarian",
      highValue: isHighValue(listing.itemValue, data.collateralRules),
    };
  }, [listing, data, now]);

  if (!listing || !view) {
    return (
      <Container className="py-10">
        <EmptyState
          icon={<PackageSearch className="size-5" />}
          title="Barang tidak ditemukan"
          description="Mungkin listing ini sudah dihapus penyedia, atau tautannya salah."
          action={<ButtonLink href="/cari">Cari barang lain</ButtonLink>}
        />
      </Container>
    );
  }

  const category = CATEGORY_BY_ID[listing.category];
  const risk = category?.risk;

  return (
    <Container className="pt-3 lg:pt-6">
      <nav aria-label="Breadcrumb" className="mb-3 flex min-w-0 items-center gap-1 text-caption text-smoke lg:mb-5">
        <Link href="/cari" className="shrink-0 hover:text-ink">
          Cari
        </Link>
        <ChevronRight className="size-3 shrink-0" aria-hidden />
        <Link href={`/cari?kategori=${listing.category}`} className="shrink-0 hover:text-ink">
          {category?.name ?? "Barang"}
        </Link>
        <ChevronRight className="size-3 shrink-0" aria-hidden />
        <span className="truncate text-graphite" aria-current="page">
          {listing.title}
        </span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] lg:gap-x-12 lg:gap-y-10">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Gallery photos={listing.photos} title={listing.title} />
        </div>

        <aside className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-label="Ringkasan sewa">
          {/* Sticky only when the viewport is tall enough to show the whole panel. */}
          <div className="lg:top-[116px] lg:[@media(min-height:820px)]:sticky">
            <InfoPanel
              listing={listing}
              owner={view.owner}
              user={user}
              rating={view.rating}
              ownerRating={view.ownerRating}
              ownerTrust={view.ownerTrust}
              distanceKm={view.distanceKm}
              originLabel={view.originLabel}
              highValue={view.highValue}
            />
          </div>
        </aside>

        <div className="min-w-0 border-b border-border-gray lg:col-start-1 lg:row-start-2">
          <Section title="Deskripsi">
            <p className="whitespace-pre-line text-body leading-[1.6] text-graphite">{listing.description}</p>
          </Section>
          <Section title="Kondisi saat ini">
            <ConditionNotes listing={listing} />
          </Section>
          <Section title="Aturan penyedia" id="aturan">
            <ProviderRules listing={listing} owner={view.owner} />
          </Section>
          {listing.vehicle && (
            <Section title="Kendaraan">
              <VehicleInfoBlock vehicle={listing.vehicle} today={isoDate(now)} />
            </Section>
          )}
          <Section title="Sewa dengan aman">
            <div className="space-y-3">
              {risk && <RiskNotice risk={risk} />}
              <AntiFraudNotice />
            </div>
          </Section>
        </div>
      </div>

      <section id="ulasan" className="mt-14 scroll-mt-32" aria-labelledby="ulasan-judul">
        <SectionHeading title={<span id="ulasan-judul">Ulasan penyewa</span>} description="Rating barang ini dari penyewa sebelumnya." />
        <ReviewsBlock
          summary={view.rating}
          base={{ rating: listing.baseRating, count: listing.baseRatingCount }}
          reviews={view.reviews}
          users={data.users}
          emptyText="Belum ada ulasan. Jadilah penyewa pertama!"
        />
      </section>

      <RelatedListings hits={view.related} categoryId={listing.category} categoryName={category?.name ?? "Barang"} />

      <MobileCta listing={listing} state={ctaState(listing, view.owner, user)} />
    </Container>
  );
}

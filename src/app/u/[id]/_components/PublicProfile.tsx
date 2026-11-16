"use client";

import { BadgeCheck, Clock, Flag, GraduationCap, MapPin, Pencil, RefreshCw, Sprout, Store, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ReportSheet } from "@/app/barang/_components/ReportSheet";
import { ReviewsBlock } from "@/app/barang/_components/Reviews";
import { memberSince } from "@/app/barang/_components/util";
import { ListingCard, ListingGrid } from "@/components/listing/ListingCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Ready } from "@/components/ui/Gate";
import { Container, EmptyState, Notice, PageSkeleton, SectionHeading } from "@/components/ui/Layout";
import { Stars } from "@/components/ui/Stars";
import { areaName } from "@/lib/data/areas";
import { useApiStatus } from "@/lib/api";
import { number } from "@/lib/format";
import { retryProfile, usePublicProfile } from "@/lib/profiles";
import { distanceTo, findUser, isVerified, listingRating, liveListings, providerLabel, publicName, publicStrikes, userRating, userStats, visibleReviews } from "@/lib/selectors";
import { useCurrentUser } from "@/lib/session";
import { useAppStore, useNow } from "@/lib/store";

/**
 * /u/[id] — public profile. Shows only the public name / store name and "Terverifikasi" (FR-A5): never full name,
 * phone, or NIK. A user the snapshot does not carry (scoped v2 snapshot) comes from GET /api/v1/users/{id}.
 */
export function PublicProfile({ id }: { id: string }) {
  return (
    <Ready>
      <ProfileBody id={id} />
    </Ready>
  );
}

function ProfileBody({ id }: { id: string }) {
  const viewer = useCurrentUser();
  const now = useNow();
  const [reporting, setReporting] = useState(false);
  const online = useApiStatus((s) => s.status === "online");
  const remote = usePublicProfile(id);
  const snapshot = useAppStore(
    useShallow((s) => ({ listings: s.listings, users: s.users, reviews: s.reviews, bookings: s.bookings, disputes: s.disputes, search: s.search, scope: s.scope, viewerId: s.viewerId })),
  );
  // Snapshot data wins; the profile response only adds what the snapshot does not carry.
  const data = useMemo(() => {
    if (remote?.status !== "ok" || !remote.user) return snapshot;
    const user = remote.user;
    const listingIds = new Set(snapshot.listings.map((l) => l.id));
    const reviewIds = new Set(snapshot.reviews.map((r) => r.id));
    return {
      ...snapshot,
      users: snapshot.users.some((u) => u.id === user.id) ? snapshot.users : [...snapshot.users, user],
      listings: [...snapshot.listings, ...remote.listings.filter((l) => !listingIds.has(l.id))],
      reviews: [...snapshot.reviews, ...remote.reviews.filter((r) => !reviewIds.has(r.id))],
    };
  }, [snapshot, remote]);
  const person = findUser(data, id);

  const view = useMemo(() => {
    if (!person) return null;
    const listings = liveListings(data)
      .filter((l) => l.ownerId === person.id)
      .map((l) => ({ listing: l, distanceKm: distanceTo(l, data.search), rating: listingRating(data, l, now) }))
      .sort((a, b) => b.listing.createdAt - a.listing.createdAt);
    const stats = userStats(data, person.id, now);
    return {
      listings,
      completed: stats.completedRentals,
      strikes: publicStrikes(data, person.id),
      rating: userRating(data, person.id, now),
      trust: stats.trustScore,
      reviews: visibleReviews(data, now, (r) => r.toId === person.id),
    };
  }, [person, data, now]);

  if (!person && online && (!remote || remote.status === "loading")) return <PageSkeleton />;

  if (!person && remote?.status === "error") {
    return (
      <Container className="py-10">
        <EmptyState
          icon={<UserX className="size-5" />}
          title="Profil belum bisa dimuat"
          description={remote.error ?? "Server sedang sibuk. Coba lagi sebentar lagi."}
          action={
            <Button variant="secondary" onClick={() => void retryProfile(id)}>
              <RefreshCw className="size-4" /> Coba lagi
            </Button>
          }
        />
      </Container>
    );
  }

  if (!person || !view) {
    return (
      <Container className="py-10">
        <EmptyState icon={<UserX className="size-5" />} title="Pengguna tidak ditemukan" description="Akun ini mungkin sudah tidak ada, atau tautannya salah." action={<ButtonLink href="/cari">Cari barang</ButtonLink>} />
      </Container>
    );
  }

  const isStore = person.accountType === "toko" && !!person.store;
  const label = providerLabel(person);
  const isSelf = viewer?.id === person.id;
  const listingTitle = (listingId: string) => data.listings.find((l) => l.id === listingId)?.title;

  return (
    <Container className="pt-6 lg:pt-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar name={label} size={80} dark={isStore} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink lg:text-[32px]">{label}</h1>
          {isStore && <p className="mt-0.5 text-body-sm text-smoke">Dikelola oleh {publicName(person)}</p>}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {isVerified(person) ? (
              <Badge tone="ink" icon={<BadgeCheck className="size-3" />}>
                Terverifikasi
              </Badge>
            ) : (
              <Badge tone="outline">Belum terverifikasi</Badge>
            )}
            {isStore && (
              <Badge tone="soft" icon={<Store className="size-3" />}>
                Toko rental
              </Badge>
            )}
            {person.studentVerified && (
              <Badge tone="soft" icon={<GraduationCap className="size-3" />}>
                Mahasiswa{person.campus ? ` ${person.campus}` : ""}
              </Badge>
            )}
            {person.earlyLender && (
              <Badge tone="soft" icon={<Sprout className="size-3" />}>
                Early Lender
              </Badge>
            )}
            {(view.strikes ?? 0) > 0 && <Badge tone="outline">Pernah bersengketa · {view.strikes} strike</Badge>}
          </div>
          <ul className="mt-3 space-y-1 text-body-sm text-graphite">
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-smoke" />
              Area {areaName(isStore && person.store ? person.store.areaId : person.areaId)} · Bergabung {memberSince(person.joinedAt)}
            </li>
            {isStore && person.store && (
              <li className="flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-smoke" />
                Jam operasional {person.store.hours}
              </li>
            )}
          </ul>
          {person.bio && <p className="mt-3 max-w-2xl text-body text-graphite">{person.bio}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          {isSelf ? (
            <ButtonLink href="/profil" variant="secondary" size="sm">
              <Pencil className="size-3.5" /> Edit profil
            </ButtonLink>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setReporting(true)}>
              <Flag className="size-3.5" /> Laporkan pengguna
            </Button>
          )}
        </div>
      </header>

      <dl className="mt-6 grid grid-cols-3 divide-x divide-border-gray rounded-benefit border border-border-gray">
        <div className="px-3 py-3.5 sm:px-5">
          <dt className="text-caption text-smoke">Rating</dt>
          <dd className="mt-1">
            <span className="block text-[20px] font-bold leading-none text-ink">{view.rating.rating ? view.rating.rating.toFixed(1) : "–"}</span>
            <Stars rating={view.rating.rating} showScore={false} className="mt-1" />
            <span className="block text-micro text-smoke">{view.rating.count} ulasan</span>
          </dd>
        </div>
        <div className="px-3 py-3.5 sm:px-5">
          <dt className="text-caption text-smoke">Skor kepercayaan</dt>
          <dd className="mt-1">
            <span className="block text-[20px] font-bold leading-none text-ink">
              {view.trust ?? "–"}
              {view.trust != null && <span className="text-caption font-normal text-smoke">/100</span>}
            </span>
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-soft-gray" aria-hidden>
              <span className="block h-full rounded-full bg-ink" style={{ width: `${view.trust ?? 0}%` }} />
            </span>
          </dd>
        </div>
        <div className="px-3 py-3.5 sm:px-5">
          <dt className="text-caption text-smoke">Sewa selesai</dt>
          <dd className="mt-1">
            <span className="block text-[20px] font-bold leading-none text-ink">{view.completed != null ? number(view.completed) : "–"}</span>
            <span className="mt-1 block text-micro text-smoke">sebagai penyewa & penyedia</span>
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-caption text-ash">Skor dihitung dari verifikasi, rating, jumlah sewa selesai, sengketa, dan strike.</p>

      {person.status && person.status !== "aktif" && (
        <Notice className="mt-6" title={person.status === "suspend" ? "Akun sedang ditangguhkan" : "Akun diblokir"}>
          Barang dari akun ini tidak bisa disewa untuk sementara.
        </Notice>
      )}

      <section className="mt-12" aria-labelledby="barang-judul">
        <SectionHeading title={<span id="barang-judul">Barang yang disewakan</span>} description={view.listings.length ? `${view.listings.length} barang aktif` : undefined} />
        {view.listings.length ? (
          <ListingGrid>
            {view.listings.map((h) => (
              <ListingCard key={h.listing.id} listing={h.listing} owner={person} rating={h.rating} distanceKm={h.distanceKm} />
            ))}
          </ListingGrid>
        ) : (
          <p className="rounded-card bg-soft-gray p-4 text-body-sm text-smoke">{isSelf ? "Kamu belum punya barang aktif." : "Belum ada barang yang disewakan saat ini."}</p>
        )}
      </section>

      <section className="mt-14" aria-labelledby="ulasan-judul">
        <SectionHeading title={<span id="ulasan-judul">Ulasan untuk {label}</span>} description="Dari penyewa dan penyedia yang pernah bertransaksi." />
        <ReviewsBlock
          summary={view.rating}
          base={{ rating: person.baseRating ?? 0, count: person.baseRatingCount ?? 0 }}
          reviews={view.reviews}
          users={data.users}
          context={(r) => [r.fromRole === "penyewa" ? "Sebagai penyedia" : "Sebagai penyewa", listingTitle(r.listingId)].filter(Boolean).join(" · ")}
          emptyText="Belum ada ulasan untuk pengguna ini."
        />
      </section>

      <ReportSheet open={reporting} onClose={() => setReporting(false)} targetType="user" targetId={person.id} targetLabel={label} />
    </Container>
  );
}

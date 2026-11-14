"use client";

import { MessageCircle, PackagePlus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { RequireAuth } from "@/components/ui/Gate";
import { Container, EmptyState, PageHeader, PageSkeleton } from "@/components/ui/Layout";
import { cn } from "@/components/ui/cn";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { formatDateRange, rupiah } from "@/lib/format";
import { nextAction, publicName, unreadMessages } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import type { Booking, BookingStatus, Listing, User } from "@/lib/types";

type Side = "penyewa" | "penyedia";
type Filter = "semua" | "aksi" | "berjalan" | "selesai" | "batal";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "aksi", label: "Perlu tindakan" },
  { value: "berjalan", label: "Berjalan" },
  { value: "selesai", label: "Selesai" },
  { value: "batal", label: "Batal" },
];

const GROUP: Record<"berjalan" | "selesai" | "batal", BookingStatus[]> = {
  berjalan: ["REQUESTED", "ACCEPTED", "ACTIVE", "RETURNED", "DISPUTED"],
  selesai: ["COMPLETED", "RESOLVED"],
  batal: ["DECLINED", "EXPIRED", "CANCELLED"],
};

interface Row {
  b: Booking;
  side: Side;
  listing?: Listing;
  other?: User;
  action: string | null;
  unread: number;
  last: number;
}

/** Most recent thing that happened on a booking (for "terbaru" ordering). */
const lastActivity = (b: Booking) =>
  Math.max(
    b.createdAt,
    b.acceptedAt ?? 0,
    b.declinedAt ?? 0,
    b.cancelledAt ?? 0,
    b.activeAt ?? 0,
    b.checkout?.submittedAt ?? 0,
    b.returnedAt ?? 0,
    b.collateralReturn?.providerReturnedAt ?? 0,
    b.completedAt ?? 0,
    b.resolvedAt ?? 0,
  );

const matches = (r: Row, f: Filter) => (f === "semua" ? true : f === "aksi" ? !!r.action : GROUP[f].includes(r.b.status));

export default function SewaanPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RequireAuth>{(user) => <BookingList user={user} />}</RequireAuth>
    </Suspense>
  );
}

function BookingList({ user }: { user: User }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const bookings = useAppStore((s) => s.bookings);
  const listings = useAppStore((s) => s.listings);
  const users = useAppStore((s) => s.users);
  const reviews = useAppStore((s) => s.reviews);
  const messages = useAppStore((s) => s.messages);
  const chatReads = useAppStore((s) => s.chatReads);
  const [filter, setFilter] = useState<Filter>("semua");

  const rows = useMemo(() => {
    const list: Row[] = bookings
      .filter((b) => b.renterId === user.id || b.providerId === user.id)
      .map((b) => {
        const side: Side = b.renterId === user.id ? "penyewa" : "penyedia";
        return {
          b,
          side,
          listing: listings.find((l) => l.id === b.listingId),
          other: users.find((u) => u.id === (side === "penyewa" ? b.providerId : b.renterId)),
          action: nextAction(b, user.id, reviews),
          unread: unreadMessages({ messages, chatReads, bookings }, user.id, b.id),
          last: lastActivity(b),
        };
      });
    // Needs-action first, then most recent activity.
    return list.sort((a, b) => Number(!!b.action) - Number(!!a.action) || b.last - a.last);
  }, [bookings, listings, users, reviews, messages, chatReads, user.id]);

  const bySide = (s: Side) => rows.filter((r) => r.side === s);
  const actionCount = (s: Side) => bySide(s).filter((r) => r.action).length;

  const param = params.get("tab");
  // No tab in the URL: open the side where something is waiting (providers land on "Disewa orang").
  const side: Side =
    param === "penyewa" || param === "penyedia"
      ? param
      : bySide("penyewa").length === 0 && bySide("penyedia").length > 0
        ? "penyedia"
        : actionCount("penyewa") === 0 && actionCount("penyedia") > 0
          ? "penyedia"
          : "penyewa";

  const tabRows = bySide(side);
  const visible = tabRows.filter((r) => matches(r, filter));

  const changeSide = (s: Side) => {
    setFilter("semua");
    router.replace(`${pathname}?tab=${s}`, { scroll: false });
  };

  return (
    <Container className="pb-10">
      <PageHeader title="Sewaan saya" subtitle="Pantau request, serah terima, pengembalian, jaminan, dan rating di satu tempat." />

      <Tabs<Side>
        value={side}
        onChange={changeSide}
        items={[
          { value: "penyewa", label: "Saya menyewa", count: actionCount("penyewa") },
          { value: "penyedia", label: "Disewa orang", count: actionCount("penyedia") },
        ]}
      />

      {tabRows.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter status">
          <SlidersHorizontal className="mt-2 size-4 shrink-0 text-smoke" aria-hidden />
          {FILTERS.map((f) => {
            const n = tabRows.filter((r) => matches(r, f.value)).length;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border px-3.5 text-nav font-medium transition-colors",
                  filter === f.value ? "border-ink bg-ink text-white" : "border-border-gray bg-white text-ink hover:border-ink",
                )}
              >
                {f.label}
                <span className={filter === f.value ? "text-white/70" : "text-ash"}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        {tabRows.length === 0 ? (
          side === "penyewa" ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="Belum ada barang yang kamu sewa"
              description="Cari barang di sekitar kampus: tenda, kamera, kebaya, sampai panci besar. Identitas penyedia sudah terverifikasi."
              action={<ButtonLink href="/cari">Cari barang</ButtonLink>}
            />
          ) : (
            <EmptyState
              icon={<PackagePlus className="size-5" />}
              title="Belum ada yang menyewa barangmu"
              description="Pasang barang yang jarang kamu pakai, atur harga dan jaminan sendiri, lalu terima request dari sekitar kampus."
              action={<ButtonLink href="/penyedia/barang/baru">Sewakan barang</ButtonLink>}
            />
          )
        ) : visible.length === 0 ? (
          <EmptyState
            title="Tidak ada sewaan di filter ini"
            description="Coba filter lain atau lihat semua sewaan."
            action={
              <Button variant="secondary" onClick={() => setFilter("semua")}>
                Lihat semua
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {visible.map((r) => (
              <li key={r.b.id}>
                <BookingRow row={r} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}

function BookingRow({ row }: { row: Row }) {
  const { b, side, listing, other, action, unread } = row;
  const title = listing?.title ?? b.agreement.listingTitle;
  return (
    <Link href={`/sewaan/${b.id}`} className="flex h-full gap-3 rounded-card border border-border-gray bg-white p-3 transition-colors hover:border-ink">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-image bg-soft-gray sm:size-24">
        <ListingImage src={listing?.photos[0] ?? b.agreement.referencePhotos[0]} alt={title} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="line-clamp-2 min-w-0 flex-1 text-product-title font-semibold text-ink">{title}</p>
          {unread > 0 && (
            <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-control bg-soft-gray px-1.5 text-micro font-semibold text-ink" aria-label={`${unread} pesan belum dibaca`}>
              <MessageCircle className="size-3" />
              {unread}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-caption text-smoke">
          {side === "penyewa" ? "Penyedia" : "Penyewa"}: {publicName(other)} · {formatDateRange(b.startDate, b.endDate)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge status={b.status} overdue={b.overdue && (b.status === "ACTIVE" || b.status === "DISPUTED")} />
          <span className="text-body-sm font-semibold text-ink">{rupiah(b.agreement.quote.total)}</span>
        </div>
        {action && (
          <span className="mt-2 inline-flex max-w-full items-center rounded-control bg-ink px-2.5 py-1 text-caption font-semibold text-white">
            <span className="truncate">Perlu: {action}</span>
          </span>
        )}
      </div>
    </Link>
  );
}

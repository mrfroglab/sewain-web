"use client";

// Antrean sengketa (PRD 9.8, 11.2): L2 cases waiting for the mediator first, then live L1 negotiations,
// then closed cases. Each row opens the mediator workspace at /admin/sengketa/[id].

import { ChevronRight, Hourglass, Scale } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Layout";
import { Tabs } from "@/components/ui/Tabs";
import { categoryName } from "@/lib/data/categories";
import { formatDuration, relativeTime } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import type { Booking, Dispute, Listing, User } from "@/lib/types";
import { AdminTitle } from "../../_components/AdminUi";
import { CASE_GUIDE } from "./cases";
import { disputeLayer, hasSanction, type MediatorLayer } from "./layers";

type Tab = Dispute["status"];

interface Row {
  dispute: Dispute;
  booking?: Booking;
  listing?: Listing;
  renter?: User;
  provider?: User;
  layer: MediatorLayer;
}

const TAB_EMPTY: Record<Tab, { title: string; description: string }> = {
  mediasi: { title: "Tidak ada yang menunggu mediasi", description: "Sengketa yang buntu di negosiasi 48 jam (atau dinaikkan salah satu pihak) muncul di sini." },
  negosiasi: { title: "Tidak ada negosiasi berjalan", description: "Laporan masalah baru mulai di L1: kedua pihak saling mengajukan solusi selama 48 jam." },
  selesai: { title: "Belum ada sengketa selesai", description: "Sengketa yang disepakati di L1 atau ditutup admin tercatat di sini." },
};

export function DisputeQueue() {
  const disputes = useAppStore((s) => s.disputes);
  const bookings = useAppStore((s) => s.bookings);
  const listings = useAppStore((s) => s.listings);
  const users = useAppStore((s) => s.users);
  const strikes = useAppStore((s) => s.strikes);
  const now = useNow();
  const [tab, setTab] = useState<Tab>("mediasi");

  const rows = useMemo<Row[]>(
    () =>
      disputes.map((d) => {
        const booking = bookings.find((b) => b.id === d.bookingId);
        return {
          dispute: d,
          booking,
          listing: booking && listings.find((l) => l.id === booking.listingId),
          renter: booking && users.find((u) => u.id === booking.renterId),
          provider: booking && users.find((u) => u.id === booking.providerId),
          layer: disputeLayer(d, hasSanction(d, strikes)),
        };
      }),
    [disputes, bookings, listings, users, strikes],
  );

  const count = (t: Tab) => rows.filter((r) => r.dispute.status === t).length;
  const visible = useMemo(() => {
    const list = rows.filter((r) => r.dispute.status === tab);
    if (tab === "mediasi")
      // Cases still waiting for a recommendation first, oldest first (SLA ≤ 5 hari kerja).
      return list.sort((a, b) => Number(!!a.dispute.recommendation) - Number(!!b.dispute.recommendation) || a.dispute.createdAt - b.dispute.createdAt);
    if (tab === "negosiasi") return list.sort((a, b) => a.dispute.l1Deadline - b.dispute.l1Deadline);
    return list.sort((a, b) => (b.dispute.resolvedAt ?? 0) - (a.dispute.resolvedAt ?? 0));
  }, [rows, tab]);

  return (
    <div>
      <AdminTitle
        title="Sengketa"
        subtitle="Bukti dulu, opini belakangan. Negosiasi 48 jam antar pengguna (L1); yang buntu naik ke mediasi admin (L2) dengan target rekomendasi ≤ 5 hari kerja."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "mediasi", label: "Mediasi (L2)", count: count("mediasi") },
          { value: "negosiasi", label: "Negosiasi (L1)", count: count("negosiasi") },
          { value: "selesai", label: "Selesai", count: count("selesai") },
        ]}
      />

      {visible.length === 0 ? (
        <EmptyState className="mt-6" icon={<Scale className="size-5" />} title={TAB_EMPTY[tab].title} description={TAB_EMPTY[tab].description} />
      ) : (
        <ul className="mt-4 divide-y divide-border-gray border-y border-border-gray">
          {visible.map((r) => (
            <QueueRow key={r.dispute.id} row={r} now={now} />
          ))}
        </ul>
      )}
    </div>
  );
}

function QueueRow({ row, now }: { row: Row; now: number }) {
  const { dispute: d, booking, listing, renter, provider, layer } = row;
  const title = listing?.title ?? booking?.agreement.listingTitle ?? "Barang";
  const category = listing ? categoryName(listing.category) : booking ? categoryName(booking.agreement.category) : "";
  const left = d.l1Deadline - now;

  return (
    <li>
      <Link href={`/admin/sengketa/${d.id}`} className="group flex gap-3 py-4 transition-colors hover:bg-soft-gray/60 sm:gap-4 sm:px-2">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-image bg-soft-gray sm:size-[72px]">
          <ListingImage src={listing?.photos[0] ?? booking?.agreement.referencePhotos[0]} alt="" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={d.status === "mediasi" ? "ink" : "outline"}>{d.status === "selesai" ? `Selesai di ${layer}` : layer}</Badge>
            <Badge tone="soft">{CASE_GUIDE[d.caseType].label}</Badge>
            {booking && <span className="font-mono text-caption text-smoke">{booking.code}</span>}
          </div>
          <p className="mt-1.5 truncate text-product-title font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-caption text-smoke">
            {category && `${category} · `}
            <span className="text-graphite">{publicName(renter)}</span> (penyewa) vs <span className="text-graphite">{publicName(provider)}</span> (penyedia)
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
            {d.status === "negosiasi" && (
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <Hourglass className="size-3.5" />
                {left > 0 ? `Batas L1: sisa ${formatDuration(left)}` : "Batas L1 habis, naik ke L2 otomatis"}
              </span>
            )}
            {d.status === "mediasi" && (
              <>
                <span className={d.recommendation ? "text-graphite" : "font-semibold text-ink"}>
                  {d.recommendation ? `Rekomendasi terkirim ${relativeTime(d.recommendation.at, now)}` : "Menunggu rekomendasi"}
                </span>
                <span className="text-smoke">{left > 0 ? `Dinaikkan sebelum batas L1 (sisa ${formatDuration(left)})` : `Batas L1 lewat ${relativeTime(d.l1Deadline, now)}`}</span>
              </>
            )}
            {d.status === "selesai" && d.resolvedAt && <span className="text-graphite">Ditutup {relativeTime(d.resolvedAt, now)}</span>}
            <span className="text-smoke">Dibuka {relativeTime(d.createdAt, now)}</span>
          </div>
          {d.status === "selesai" && d.outcome && <p className="mt-1.5 line-clamp-2 text-caption text-smoke">{d.outcome}</p>}
        </div>

        <ChevronRight className="mt-1 size-4 shrink-0 self-center text-ash transition-colors group-hover:text-ink" aria-hidden />
      </Link>
    </li>
  );
}

"use client";

import { Eye, PackagePlus, Pause, Pencil, Play, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { EmptyState, SectionHeading } from "@/components/ui/Layout";
import { Tabs } from "@/components/ui/Tabs";
import { rupiah } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Listing, ListingStatus, User } from "@/lib/types";

const STATUS: Record<ListingStatus, { label: string; cls: string }> = {
  aktif: { label: "Aktif", cls: "border border-ink bg-white text-ink" },
  jeda: { label: "Dijeda", cls: "bg-soft-gray text-smoke" },
  diturunkan: { label: "Diturunkan", cls: "bg-ink text-white" },
};

type Filter = "semua" | ListingStatus;

/** Compact pill action (40px tall, tight padding so three fit side by side on a phone). */
const action = "inline-flex h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-2 text-[13px] font-semibold text-ink transition-colors disabled:pointer-events-none disabled:opacity-40";

function ListingRow({ listing, userId }: { listing: Listing; userId: string }) {
  const setListingStatus = useAppStore((s) => s.setListingStatus);
  const st = STATUS[listing.status];
  const toggle = () => {
    const next = listing.status === "aktif" ? "jeda" : "aktif";
    toastResult(setListingStatus(userId, listing.id, next), next === "jeda" ? "Listing dijeda. Penyewa tidak bisa melihatnya dulu." : "Listing aktif lagi dan bisa dicari penyewa.");
  };
  return (
    <article className="rounded-card border border-border-gray bg-white p-3">
      <div className="flex gap-3">
        <Link href={`/barang/${listing.id}`} className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-image bg-soft-gray sm:w-24">
          <ListingImage src={listing.photos[0]} alt={listing.title} className={listing.status !== "aktif" ? "opacity-60" : undefined} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-product-title font-semibold text-ink">{listing.title}</h3>
            <span className={cn("inline-flex h-6 shrink-0 items-center rounded-control px-2.5 text-caption font-semibold", st.cls)}>{st.label}</span>
          </div>
          <p className="mt-1 text-product-title font-semibold text-ink">
            {rupiah(listing.pricePerDay)}
            <span className="font-normal text-smoke"> /hari</span>
          </p>
          <p className="mt-1 text-caption text-smoke">
            Stok {listing.stock} · Disewa {listing.rentCount}×
          </p>
          {listing.status === "diturunkan" && (
            <p className="mt-1.5 flex items-start gap-1 text-caption text-graphite">
              <ShieldAlert className="mt-px size-3.5 shrink-0" /> Diturunkan admin karena melanggar aturan.
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Link href={`/penyedia/barang/${listing.id}`} className={cn(action, "border border-border-gray bg-white hover:border-ink")}>
          <Pencil className="size-4" /> Edit
        </Link>
        <button type="button" onClick={toggle} disabled={listing.status === "diturunkan"} className={cn(action, "border border-border-gray bg-white hover:border-ink")}>
          {listing.status === "aktif" ? (
            <>
              <Pause className="size-4" /> Jeda
            </>
          ) : (
            <>
              <Play className="size-4" /> Aktifkan
            </>
          )}
        </button>
        <Link href={`/barang/${listing.id}`} className={cn(action, "hover:bg-soft-gray")}>
          <Eye className="size-4" /> Lihat
        </Link>
      </div>
    </article>
  );
}

/** "Listing saya": status pill (aktif/jeda/diturunkan), stock, rent count; edit, pause (FR-L5), view. */
export function MyListings({ listings, user }: { listings: Listing[]; user: User }) {
  const [filter, setFilter] = useState<Filter>("semua");
  const count = (s: ListingStatus) => listings.filter((l) => l.status === s).length;
  const items: { value: Filter; label: string; count?: number }[] = [
    { value: "semua", label: "Semua", count: listings.length },
    { value: "aktif", label: "Aktif", count: count("aktif") },
    { value: "jeda", label: "Dijeda", count: count("jeda") },
    ...(count("diturunkan") ? [{ value: "diturunkan" as const, label: "Diturunkan", count: count("diturunkan") }] : []),
  ];
  const shown = filter === "semua" ? listings : listings.filter((l) => l.status === filter);

  return (
    <section id="listing" className="scroll-mt-24">
      <SectionHeading title="Listing saya" description="Jeda listing kalau barangnya lagi dipakai sendiri. Tidak perlu dihapus." />
      {listings.length === 0 ? (
        <EmptyState
          icon={<PackagePlus className="size-5" />}
          title="Belum ada barang yang disewakan"
          description="Foto barangnya, tentukan harga dan jaminan. Selesai dalam ±3 menit."
          action={<ButtonLink href="/penyedia/barang/baru">Sewakan barang pertamamu</ButtonLink>}
        />
      ) : (
        <>
          {listings.length > 3 && <Tabs value={filter} onChange={setFilter} items={items} className="mb-4" />}
          {shown.length === 0 ? (
            <p className="rounded-card bg-soft-gray p-4 text-body-sm text-smoke">Tidak ada listing dengan status ini.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((l) => (
                <ListingRow key={l.id} listing={l} userId={user.id} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

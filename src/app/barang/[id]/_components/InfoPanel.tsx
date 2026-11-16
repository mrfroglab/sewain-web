"use client";

import { CalendarCheck, Flag, Gem, Handshake, Heart, MapPin, PauseCircle, Send, Settings2, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ReportSheet } from "@/app/barang/_components/ReportSheet";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { RequireVerified } from "@/components/ui/Gate";
import { Notice } from "@/components/ui/Layout";
import { Stars } from "@/components/ui/Stars";
import { CATEGORY_BY_ID, HANDOVER_LABEL } from "@/lib/data/categories";
import { formatDistance, rupiah } from "@/lib/format";
import { collateralChip } from "@/lib/pricing";
import { areaLabel, isVerified, type RatingSummary } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { Listing, User } from "@/lib/types";
import { ProviderCard } from "./ProviderCard";

export type CtaState = "owner" | "unavailable" | "guest" | "unverified" | "restricted" | "ok";

export function ctaState(listing: Listing, owner: User | undefined, user: User | null): CtaState {
  if (user && user.id === listing.ownerId) return "owner";
  if (listing.status !== "aktif" || owner?.status !== "aktif") return "unavailable";
  if (!user) return "guest";
  if (!isVerified(user)) return "unverified";
  if (user.status !== "aktif") return "restricted";
  return "ok";
}

/** Why a listing cannot be requested right now (paused by provider, taken down, provider inactive). */
function UnavailableNotice({ listing, owner, isOwner }: { listing: Listing; owner?: User; isOwner: boolean }) {
  const text =
    listing.status === "jeda"
      ? isOwner
        ? "Listing ini sedang kamu jeda, jadi tidak muncul di pencarian. Aktifkan lagi lewat Kelola listing."
        : "Penyedia sedang menjeda listing ini. Simpan ke favorit dan cek lagi nanti."
      : listing.status === "diturunkan"
        ? "Listing ini diturunkan admin karena melanggar aturan, jadi tidak bisa disewa."
        : owner?.status !== "aktif"
          ? "Akun penyedia sedang tidak aktif, jadi barang ini belum bisa disewa."
          : null;
  if (!text) return null;
  return (
    <Notice icon={<PauseCircle className="size-4" />} title={listing.status === "jeda" ? "Sedang dijeda" : "Tidak tersedia"}>
      {text}
    </Notice>
  );
}

export function InfoPanel({
  listing,
  owner,
  user,
  rating,
  ownerRating,
  ownerTrust,
  distanceKm,
  originLabel,
  highValue,
}: {
  listing: Listing;
  owner?: User;
  user: User | null;
  rating: RatingSummary;
  ownerRating: RatingSummary;
  ownerTrust: number | null;
  distanceKm: number;
  originLabel: string;
  highValue: boolean;
}) {
  const [reporting, setReporting] = useState(false);
  const fav = useAppStore((s) => (user ? (s.favorites[user.id] ?? []).includes(listing.id) : false));
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const category = CATEGORY_BY_ID[listing.category];
  const state = ctaState(listing, owner, user);
  const isVehicle = category?.risk === "kendaraan";

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/barang/${listing.id}` : `/barang/${listing.id}`;
  const waText = `${listing.title}: ${rupiah(listing.pricePerDay)}/hari di Sewain, area ${areaLabel(listing)}. Penyedia terverifikasi, jaminan tercatat. ${shareUrl}`;

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/cari?kategori=${listing.category}`} className="text-caption font-semibold uppercase tracking-[0.08em] text-smoke hover:text-ink">
          {category?.name ?? "Barang"}
        </Link>
        <div className="mt-1.5 flex items-start gap-3">
          <h1 className="min-w-0 flex-1 text-[24px] font-semibold leading-[1.15] tracking-[-0.6px] text-ink lg:text-[30px]">{listing.title}</h1>
          <IconButton
            label={fav ? "Hapus dari favorit" : "Simpan ke favorit"}
            aria-pressed={fav}
            onClick={() => {
              if (!user) return toast("Masuk dulu untuk menyimpan favorit.");
              toggleFavorite(user.id, listing.id);
              toast(fav ? "Dihapus dari favorit." : "Disimpan ke favorit.", "success");
            }}
            className="mt-0.5"
          >
            <Heart className="size-4" fill={fav ? "currentColor" : "none"} />
          </IconButton>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-smoke">
          <a href="#ulasan" className="inline-flex items-center gap-1 hover:text-ink">
            <Stars rating={rating.rating} size={12} />
            <span className="underline-offset-2 hover:underline">{rating.count ? `${rating.count} ulasan` : "Belum ada ulasan"}</span>
          </a>
          {listing.rentCount > 0 && <span>· Disewa {listing.rentCount}×</span>}
        </div>
      </div>

      <div>
        <p className="flex items-baseline gap-1.5">
          <span className="text-[28px] font-bold leading-none tracking-[-0.8px] text-ink">{rupiah(listing.pricePerDay)}</span>
          <span className="text-body text-smoke">/hari</span>
        </p>
        {!!(listing.pricePerHour || listing.pricePerWeek) && (
          <p className="mt-1.5 text-body-sm text-graphite">
            {[listing.pricePerHour && `${rupiah(listing.pricePerHour)}/jam`, listing.pricePerWeek && `${rupiah(listing.pricePerWeek)}/minggu`].filter(Boolean).join(" · ")}
          </p>
        )}
        {listing.durationDiscount && (
          <span className="mt-2 inline-flex h-6 items-center rounded-control bg-sale-rose px-2.5 text-caption font-medium text-sale-text">
            Hemat {listing.durationDiscount.percent}% untuk sewa ≥ {listing.durationDiscount.minDays} hari
          </span>
        )}
      </div>

      {(owner?.accountType === "toko" || highValue || isVehicle) && (
        <div className="flex flex-wrap gap-1.5">
          {owner?.accountType === "toko" && (
            <Badge tone="soft" icon={<Store className="size-3" />}>
              Toko · stok {listing.stock}
            </Badge>
          )}
          {highValue && (
            <Badge tone="soft" icon={<Gem className="size-3" />}>
              Barang bernilai tinggi
            </Badge>
          )}
          {isVehicle && (
            <Badge tone="outline">
              Kendaraan · syarat tambahan
            </Badge>
          )}
        </div>
      )}

      <ul className="space-y-2 text-body-sm text-graphite">
        <li className="flex gap-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-ink" />
          <span>
            <span className="font-medium text-ink">{formatDistance(distanceKm)}</span> dari {originLabel} · area {areaLabel(listing)}
            <span className="block text-caption text-smoke">Jangkauan penyedia {listing.radiusKm.toLocaleString("id-ID")} km. Lokasi persis dibagikan setelah disetujui.</span>
          </span>
        </li>
        <li className="flex gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ink" />
          <span>
            Jaminan: <span className="font-medium text-ink">{collateralChip(listing.collateralOptions)}</span>
            {listing.collateralOptions.length > 1 && <span className="text-smoke"> · {listing.collateralOptions.length} pilihan</span>}
          </span>
        </li>
        <li className="flex gap-2.5">
          <Handshake className="mt-0.5 size-4 shrink-0 text-ink" />
          <span>{listing.handover.map((h) => HANDOVER_LABEL[h]).join(" · ")}</span>
        </li>
        <li className="flex gap-2.5">
          <CalendarCheck className="mt-0.5 size-4 shrink-0 text-ink" />
          <span>{listing.approval === "otomatis" ? "Bisa disetujui otomatis untuk penyewa dengan rating tinggi" : "Penyedia merespons maksimal 24 jam"}</span>
        </li>
      </ul>

      <UnavailableNotice listing={listing} owner={owner} isOwner={state === "owner"} />

      <div className="space-y-2.5">
        {state === "owner" ? (
          <ButtonLink href={`/penyedia/barang/${listing.id}`} block size="lg">
            <Settings2 className="size-4" /> Kelola listing
          </ButtonLink>
        ) : state === "unavailable" ? (
          <Button block size="lg" disabled>
            Belum bisa diajukan
          </Button>
        ) : (
          <RequireVerified user={user} compact>
            <ButtonLink href={`/barang/${listing.id}/ajukan`} block size="lg">
              Ajukan sewa
            </ButtonLink>
          </RequireVerified>
        )}
        <div className="flex gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-control border border-border-gray bg-white px-4 text-[13px] font-semibold text-ink transition-colors hover:border-ink"
          >
            <Send className="size-4" /> Bagikan ke WhatsApp
          </a>
          {state !== "owner" && (
            <Button variant="ghost" onClick={() => setReporting(true)}>
              <Flag className="size-4" /> Laporkan
            </Button>
          )}
        </div>
      </div>

      {owner && <ProviderCard owner={owner} rating={ownerRating} trust={ownerTrust} />}

      <ReportSheet open={reporting} onClose={() => setReporting(false)} targetType="listing" targetId={listing.id} targetLabel={listing.title} />
    </div>
  );
}

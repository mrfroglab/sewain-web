"use client";

import { BadgeCheck, CalendarDays, Check, ChevronRight, HandHelping, MapPin, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { areaName } from "@/lib/data/areas";
import { CATEGORY_BY_ID } from "@/lib/data/categories";
import { formatDate, formatDateRange, formatDistance, relativeTime, rupiah } from "@/lib/format";
import { findUser, isVerified, providerLabel, publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { User, WantedPost } from "@/lib/types";

const STATUS: Record<WantedPost["status"], { label: string; className: string }> = {
  terbuka: { label: "Terbuka", className: "border border-ink bg-white text-ink" },
  terpenuhi: { label: "Terpenuhi", className: "bg-ink text-white" },
  ditutup: { label: "Ditutup", className: "bg-soft-gray text-smoke" },
};

export function WantedStatus({ status }: { status: WantedPost["status"] }) {
  const s = STATUS[status];
  return <span className={cn("inline-flex h-6 shrink-0 items-center rounded-control px-2.5 text-caption font-semibold", s.className)}>{s.label}</span>;
}

function Meta({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-smoke" aria-hidden />
      <span className="truncate">{children}</span>
    </p>
  );
}

function neededLabel(post: WantedPost): string {
  if (post.neededFrom && post.neededUntil) return post.neededFrom === post.neededUntil ? formatDate(post.neededFrom) : formatDateRange(post.neededFrom, post.neededUntil);
  if (post.neededFrom) return `Mulai ${formatDate(post.neededFrom)}`;
  return "Tanggal fleksibel";
}

/**
 * One wanted post (PRD 7.3). Public info only: requester's public name + "Terverifikasi", area + rounded distance (FR-S6).
 * Requester can close it; verified providers (not the requester) can offer one of their listings.
 */
export function WantedCard({ post, distanceKm, now, user, onOffer }: { post: WantedPost; distanceKm: number; now: number; user: User | null; onOffer: () => void }) {
  const users = useAppStore((s) => s.users);
  const listings = useAppStore((s) => s.listings);
  const closeWanted = useAppStore((s) => s.closeWanted);
  const requester = findUser({ users }, post.requesterId);
  const name = publicName(requester);
  const isMine = !!user && user.id === post.requesterId;
  const offeredByMe = !!user && post.offers.some((o) => o.providerId === user.id);
  const open = post.status === "terbuka";

  const close = (status: "terpenuhi" | "ditutup") => {
    if (!user) return;
    toastResult(closeWanted(user.id, post.id, status), status === "terpenuhi" ? "Sip, permintaan ditandai terpenuhi." : "Permintaan ditutup.");
  };

  return (
    <article className="flex flex-col rounded-card bg-white p-4 shadow-hairline sm:p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-smoke">
        <WantedStatus status={post.status} />
        {post.category && <span>{CATEGORY_BY_ID[post.category]?.name}</span>}
        {post.category && <span aria-hidden>·</span>}
        <span>{relativeTime(post.createdAt, now)}</span>
      </div>

      <h3 className="mt-2.5 text-body-lg font-semibold leading-snug text-ink">{post.title}</h3>
      {post.description && <p className="mt-1 text-body-sm text-smoke">{post.description}</p>}

      <div className="mt-3 grid gap-1.5 text-body-sm text-graphite sm:grid-cols-2">
        <Meta icon={MapPin}>
          {formatDistance(distanceKm)} · {areaName(post.areaId)}
        </Meta>
        <Meta icon={CalendarDays}>{neededLabel(post)}</Meta>
        <Meta icon={Wallet}>{post.budgetPerDay ? `Budget ≤ ${rupiah(post.budgetPerDay)}/hari` : "Budget bisa nego"}</Meta>
        <Meta icon={HandHelping}>{post.offers.length ? `${post.offers.length} penawaran` : "Belum ada penawaran"}</Meta>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border-gray pt-3">
        <Avatar name={name} size={28} />
        <span className="min-w-0 truncate text-body-sm font-medium text-ink">
          {name}
          {isMine && <span className="font-normal text-smoke"> (kamu)</span>}
        </span>
        {isVerified(requester) && (
          <span className="inline-flex shrink-0 items-center gap-1 text-caption text-smoke">
            <BadgeCheck className="size-3.5 text-graphite" aria-hidden /> Terverifikasi
          </span>
        )}
      </div>

      {post.offers.length > 0 && (
        <ul className="mt-3 space-y-3" aria-label="Penawaran">
          {post.offers.map((o) => {
            const provider = findUser({ users }, o.providerId);
            const listing = o.listingId ? listings.find((l) => l.id === o.listingId) : undefined;
            const label = providerLabel(provider);
            return (
              <li key={o.id} className="flex gap-2.5">
                <Avatar name={label} size={28} dark />
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm text-ink">
                    <span className="font-semibold">{label}</span>
                    <span className="text-caption text-smoke"> · {relativeTime(o.at, now)}</span>
                  </p>
                  <p className="text-body-sm text-graphite">{o.message}</p>
                  {listing && (
                    <Link href={`/barang/${listing.id}`} className="mt-2 flex items-center gap-2.5 rounded-[12px] bg-soft-gray p-2 pr-3 transition-colors hover:bg-image-gray">
                      <span className="relative block h-12 w-10 shrink-0 overflow-hidden rounded-[8px] bg-image-gray">
                        <ListingImage src={listing.photos[0]} alt={listing.title} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm font-semibold text-ink">{listing.title}</span>
                        <span className="block text-caption text-smoke">{rupiah(listing.pricePerDay)}/hari · lihat barang</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-smoke" aria-hidden />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto pt-4">
        {!open ? (
          <p className="text-caption text-smoke">Permintaan ini sudah {post.status === "terpenuhi" ? "terpenuhi" : "ditutup"}.</p>
        ) : isMine ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => close("terpenuhi")}>
              <Check className="size-4" /> Sudah terpenuhi
            </Button>
            <Button variant="secondary" onClick={() => close("ditutup")}>
              Tutup permintaan
            </Button>
          </div>
        ) : offeredByMe ? (
          <p className="flex items-center gap-1.5 text-caption text-smoke">
            <Check className="size-3.5 text-ink" aria-hidden /> Kamu sudah menawarkan. {name} sudah dapat notifikasi.
          </p>
        ) : (
          <Button onClick={onOffer}>
            <HandHelping className="size-4" /> Tawarkan barang
          </Button>
        )}
      </div>
    </article>
  );
}

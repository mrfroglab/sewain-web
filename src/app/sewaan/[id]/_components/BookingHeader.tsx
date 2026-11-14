"use client";

import { ArrowLeft, BadgeCheck, ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/components/ui/cn";
import { Stars } from "@/components/ui/Stars";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateRange, rupiah } from "@/lib/format";
import { isVerified, publicName, unreadMessages, userRating } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { otherParty, type BookingView } from "./shared";

const ROLE_CHIP = { penyewa: "Kamu penyewa", penyedia: "Kamu penyedia", admin: "Kamu admin · mediator" } as const;

/** Listing + booking identity, status, role and the other party (+ chat). */
export function BookingHeader({ view, className }: { view: BookingView; className?: string }) {
  const { b, listing, role, user, renter, provider } = view;
  const unread = useAppStore((s) => (role === "admin" ? 0 : unreadMessages(s, user.id, b.id)));
  const title = listing?.title ?? b.agreement.listingTitle;
  const other = otherParty(view);

  return (
    <section className={className}>
      <Link href={`/sewaan?tab=${role === "penyedia" ? "penyedia" : "penyewa"}`} className="inline-flex min-h-9 items-center gap-1.5 text-nav font-medium text-graphite hover:text-ink">
        <ArrowLeft className="size-4" /> Sewaan saya
      </Link>

      <div className="mt-2 flex gap-3 sm:gap-4">
        <Link href={`/barang/${b.listingId}`} className="relative size-20 shrink-0 overflow-hidden rounded-image bg-soft-gray sm:size-24" aria-label={`Lihat ${title}`}>
          <ListingImage src={listing?.photos[0] ?? b.agreement.referencePhotos[0]} alt={title} priority />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-caption text-smoke">{b.code}</p>
          <h1 className="mt-0.5 text-[20px] font-semibold leading-tight tracking-[-0.4px] text-ink lg:text-[26px]">
            <Link href={`/barang/${b.listingId}`} className="hover:underline hover:underline-offset-4">
              {title}
            </Link>
          </h1>
          <p className="mt-1 text-body-sm text-smoke">
            {formatDateRange(b.startDate, b.endDate)} · {b.agreement.quote.days} hari · {rupiah(b.agreement.quote.total)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={b.status} overdue={b.overdue && (b.status === "ACTIVE" || b.status === "DISPUTED")} />
            <span className="inline-flex h-6 items-center rounded-control bg-soft-gray px-2.5 text-caption font-medium text-graphite">{ROLE_CHIP[role]}</span>
          </div>
        </div>
      </div>

      {other ? (
        <div className="mt-4 flex items-stretch gap-2">
          <PartyCard person={other} label={role === "penyewa" ? "Penyedia" : "Penyewa"} now={view.now} className="flex-1" />
          <Link
            href={`/sewaan/${b.id}/chat`}
            className="relative flex w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-card border border-border-gray bg-white text-caption font-semibold text-ink transition-colors hover:border-ink"
            aria-label={`Chat${unread ? `, ${unread} pesan belum dibaca` : ""}`}
          >
            <MessageCircle className="size-5" />
            Chat
            {unread > 0 && <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold text-white">{unread}</span>}
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <PartyCard person={renter} label="Penyewa" now={view.now} />
          <PartyCard person={provider} label="Penyedia" now={view.now} />
        </div>
      )}
    </section>
  );
}

function PartyCard({ person, label, now, className }: { person?: User; label: string; now: number; className?: string }) {
  const users = useAppStore((s) => s.users);
  const reviews = useAppStore((s) => s.reviews);
  const rating = useMemo(() => (person ? userRating({ users, reviews }, person.id, now) : { rating: 0, count: 0 }), [person, users, reviews, now]);
  const name = publicName(person);
  const store = person?.accountType === "toko" ? person.store?.name : undefined;
  const body = (
    <>
      <Avatar name={name} size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-micro font-medium uppercase tracking-[0.06em] text-ash">{label}</p>
        <p className="truncate text-body-sm font-semibold text-ink">
          {name}
          {store && <span className="font-normal text-smoke"> · {store}</span>}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {isVerified(person) && (
            <span className="inline-flex items-center gap-1 text-caption font-medium text-graphite">
              <BadgeCheck className="size-3.5" /> Terverifikasi
            </span>
          )}
          <Stars rating={rating.rating} count={rating.count} />
        </div>
      </div>
      {person && <ChevronRight className="size-4 shrink-0 text-ash" />}
    </>
  );
  const cls = cn("flex min-w-0 items-center gap-3 rounded-card border border-border-gray bg-white p-3", person && "transition-colors hover:border-ink", className);
  return person ? (
    <Link href={`/u/${person.id}`} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

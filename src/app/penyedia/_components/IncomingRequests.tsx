"use client";

import { BadgeCheck, Check, ChevronRight, Hourglass, Inbox, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/Layout";
import { Stars } from "@/components/ui/Stars";
import { HANDOVER_LABEL } from "@/lib/data/categories";
import { formatDateRange, formatDuration, rupiah } from "@/lib/format";
import { describeCollateral } from "@/lib/pricing";
import { isVerified, publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Booking, User } from "@/lib/types";
import { DeclineSheet } from "./DeclineSheet";
import type { ProviderData } from "./useProviderData";

/** "Request masuk": check the renter (FR: profil, rating, verifikasi), then approve or decline inline. */
export function IncomingRequests({ data, user }: { data: ProviderData; user: User }) {
  const acceptBooking = useAppStore((s) => s.acceptBooking);
  const [declining, setDeclining] = useState<Booking | null>(null);
  const { requests, now } = data;

  return (
    <section id="request" className="scroll-mt-24">
      <SectionHeading title="Request masuk" description="Cek profil dan rating penyewa dulu. Request kadaluarsa otomatis kalau tidak direspons 24 jam." href="/sewaan?tab=penyedia" linkLabel="Semua sewaan" />
      {requests.length === 0 ? (
        <div className="flex items-center gap-3 rounded-card bg-soft-gray p-4 text-body-sm text-smoke">
          <Inbox className="size-5 shrink-0 text-graphite" />
          Belum ada request baru. Kamu dapat notifikasi begitu ada yang ingin menyewa.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {requests.map((b) => {
            const listing = data.listingById.get(b.listingId);
            const renter = data.userById.get(b.renterId);
            const rating = data.ratingOf(b.renterId);
            const left = b.expiresAt - now;
            const name = publicName(renter);
            return (
              <article key={b.id} className="rounded-card border border-border-gray bg-white p-4">
                <div className="flex gap-3">
                  <Link href={`/sewaan/${b.id}`} className="relative size-16 shrink-0 overflow-hidden rounded-image bg-soft-gray">
                    <ListingImage src={listing?.photos[0]} alt={b.agreement.listingTitle} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/sewaan/${b.id}`} className="line-clamp-1 text-body font-semibold text-ink hover:underline">
                      {b.agreement.listingTitle}
                    </Link>
                    <p className="text-caption text-smoke">
                      {formatDateRange(b.startDate, b.endDate)} · {b.agreement.quote.days} hari · {HANDOVER_LABEL[b.handover]}
                    </p>
                    <p className="mt-0.5 text-body font-semibold text-ink">{rupiah(b.agreement.quote.total)}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 rounded-[12px] bg-soft-gray p-2.5">
                  <Avatar name={name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-body-sm">
                      <span className="font-semibold text-ink">{name}</span>
                      {isVerified(renter) ? (
                        <span className="inline-flex items-center gap-1 text-caption font-medium text-graphite">
                          <BadgeCheck className="size-3.5" /> Terverifikasi
                        </span>
                      ) : (
                        <span className="text-caption text-smoke">Belum terverifikasi</span>
                      )}
                    </p>
                    <Stars rating={rating.rating} count={rating.count} />
                  </div>
                  <Link href={`/u/${b.renterId}`} className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-control px-2 text-nav font-medium text-ink hover:bg-white">
                    Profil <ChevronRight className="size-3.5" />
                  </Link>
                </div>

                {b.note && <p className="mt-3 line-clamp-2 text-body-sm italic text-graphite">“{b.note}”</p>}
                <p className="mt-2 text-caption text-smoke">
                  Jaminan dipilih: <span className="text-graphite">{describeCollateral(b.collateral, b.agreement.itemValue)}</span>
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-caption font-medium text-ink">
                  <Hourglass className="size-3.5" /> {left > 0 ? `Kadaluarsa dalam ${formatDuration(left)}` : "Kadaluarsa sebentar lagi"}
                </p>

                <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Button variant="secondary" onClick={() => setDeclining(b)}>
                    <X className="size-4" /> Tolak
                  </Button>
                  <Button onClick={() => toastResult(acceptBooking(user.id, b.id), `Request disetujui. ${name} sekarang bisa melihat titik temu.`)}>
                    <Check className="size-4" /> Setujui
                  </Button>
                  <Link href={`/sewaan/${b.id}`} aria-label="Detail request" className="grid size-10 place-items-center rounded-full border border-border-gray text-ink hover:border-ink">
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <DeclineSheet booking={declining} renter={declining ? data.userById.get(declining.renterId) : undefined} userId={user.id} onClose={() => setDeclining(null)} />
    </section>
  );
}

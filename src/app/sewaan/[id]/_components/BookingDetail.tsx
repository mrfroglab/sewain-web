"use client";

import { Lock, SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container, EmptyState } from "@/components/ui/Layout";
import { bookingRole } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import type { User } from "@/lib/types";
import { ActionCard } from "./ActionCard";
import { AgreementCard } from "./AgreementCard";
import { BookingHeader } from "./BookingHeader";
import { EvidenceSection } from "./EvidenceSection";
import { CollateralCard, PaymentCard } from "./InfoCards";
import { StatusTimeline } from "./StatusTimeline";
import type { BookingView, ViewerRole } from "./shared";

/**
 * Booking detail — the hub of the demo. Phones: header → next step → timeline → agreement → photos → payment/collateral.
 * Desktop: main column (header, timeline, agreement, photos) + side column (next step, payment, collateral).
 * DOM order puts the next-step card right after the header (screen readers / tab order); the side wrapper is
 * `display: contents` on phones so `order-*` can move payment + collateral to the end.
 */
export function BookingDetail({ bookingId, user }: { bookingId: string; user: User }) {
  const b = useAppStore((s) => s.bookings.find((x) => x.id === bookingId));
  const listing = useAppStore((s) => (b ? s.listings.find((l) => l.id === b.listingId) : undefined));
  const renter = useAppStore((s) => (b ? s.users.find((u) => u.id === b.renterId) : undefined));
  const provider = useAppStore((s) => (b ? s.users.find((u) => u.id === b.providerId) : undefined));
  const dispute = useAppStore((s) => (b?.disputeId ? s.disputes.find((d) => d.id === b.disputeId) : undefined));
  const now = useNow(15_000);

  if (!b)
    return (
      <Container className="py-10">
        <EmptyState
          icon={<SearchX className="size-5" />}
          title="Sewaan tidak ditemukan"
          description="Mungkin tautannya salah atau data demo baru saja direset."
          action={<ButtonLink href="/sewaan">Ke daftar sewaan</ButtonLink>}
        />
      </Container>
    );

  const role: ViewerRole | null = bookingRole(b, user.id) ?? (user.role === "admin" ? "admin" : null);
  if (!role)
    return (
      <Container className="py-10">
        <EmptyState
          icon={<Lock className="size-5" />}
          title="Sewaan ini bukan milikmu"
          description="Detail sewa, foto bukti, dan jaminan hanya bisa dilihat oleh penyewa, penyedia, dan admin mediator."
          action={<ButtonLink href="/sewaan">Lihat sewaanku</ButtonLink>}
        />
      </Container>
    );

  const view: BookingView = { b, listing, renter, provider, dispute, user, role, now };

  return (
    <Container className="pb-10 pt-3 lg:pt-6">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-8">
        <BookingHeader view={view} className="order-1 min-w-0 lg:col-start-1 lg:row-start-1" />
        <div className="contents lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
          <ActionCard view={view} className="order-2" />
          <PaymentCard view={view} className="order-6" />
          <CollateralCard view={view} className="order-7" />
        </div>
        <StatusTimeline view={view} className="order-3 min-w-0 lg:col-start-1 lg:row-start-2" />
        <AgreementCard view={view} className="order-4 min-w-0 lg:col-start-1 lg:row-start-3" />
        <EvidenceSection view={view} className="order-5 min-w-0 lg:col-start-1 lg:row-start-4" />
      </div>
    </Container>
  );
}

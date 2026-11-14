"use client";

// Shared by /sewaan/[id]/serah-terima, /pengembalian and /sengketa (the three evidence pages).
// Resolves the booking from the URL, enforces "only the two parties (admin: read-only)",
// and renders the common header so each page only deals with its own flow.

import { Eye, Lock, SearchX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { ButtonLink } from "@/components/ui/Button";
import { RequireAuth } from "@/components/ui/Gate";
import { Container, EmptyState, Notice, PageHeader } from "@/components/ui/Layout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { bookingRole, publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import type { Booking, Listing, User } from "@/lib/types";

export type FrameRole = "penyewa" | "penyedia" | "admin";

export interface BookingCtx {
  user: User;
  booking: Booking;
  listing: Listing;
  renter?: User;
  provider?: User;
  role: FrameRole;
  /** Admin looking at someone else's booking: sees everything, can't act. */
  readOnly: boolean;
}

/** "Dina (penyedia)" / "Kamu" — never the full name (FR-A5). */
export function partyName(ctx: BookingCtx, userId: string): string {
  if (userId === ctx.user.id) return "Kamu";
  const u = userId === ctx.booking.renterId ? ctx.renter : userId === ctx.booking.providerId ? ctx.provider : undefined;
  return publicName(u);
}

export function BookingFrame({ title, description, children }: { title: string; description?: string; children: (ctx: BookingCtx) => ReactNode }) {
  const params = useParams<{ id: string }>();
  return (
    <RequireAuth>
      {(user) => (
        <FrameInner id={params.id} user={user} title={title} description={description}>
          {children}
        </FrameInner>
      )}
    </RequireAuth>
  );
}

function FrameInner({ id, user, title, description, children }: { id: string; user: User; title: string; description?: string; children: (ctx: BookingCtx) => ReactNode }) {
  const booking = useAppStore((s) => s.bookings.find((b) => b.id === id));
  const listing = useAppStore((s) => (booking ? s.listings.find((l) => l.id === booking.listingId) : undefined));
  const renter = useAppStore((s) => (booking ? s.users.find((u) => u.id === booking.renterId) : undefined));
  const provider = useAppStore((s) => (booking ? s.users.find((u) => u.id === booking.providerId) : undefined));

  if (!booking || !listing)
    return (
      <Container className="py-10">
        <EmptyState
          icon={<SearchX className="size-5" />}
          title="Sewaan tidak ditemukan"
          description="Mungkin link-nya keliru, atau data demo baru saja di-reset."
          action={<ButtonLink href="/sewaan">Ke daftar sewaan</ButtonLink>}
        />
      </Container>
    );

  const party = bookingRole(booking, user.id);
  if (!party && user.role !== "admin")
    return (
      <Container className="py-10">
        <EmptyState
          icon={<Lock className="size-5" />}
          title="Khusus pihak yang bersewa"
          description="Foto bukti dan foto jaminan hanya bisa dilihat penyewa, penyedia, dan mediator Sewain."
          action={<ButtonLink href="/sewaan">Ke sewaanku</ButtonLink>}
        />
      </Container>
    );

  const role: FrameRole = party ?? "admin";
  const ctx: BookingCtx = { user, booking, listing, renter, provider, role, readOnly: role === "admin" };
  const other = role === "penyedia" ? renter : provider;

  return (
    <Container className="pb-12">
      <PageHeader back={`/sewaan/${booking.id}`} title={title} subtitle={description} />
      <Link href={`/sewaan/${booking.id}`} className="flex items-center gap-3 rounded-card border border-border-gray p-2.5 pr-4 transition-colors hover:border-ash">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-[10px] bg-soft-gray">
          <ListingImage src={listing.photos[0]} alt={listing.title} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-product-title font-semibold text-ink">{listing.title}</span>
          <span className="mt-0.5 block truncate text-caption text-smoke">
            {booking.code} ·{" "}
            {role === "admin" ? `${publicName(renter)} ↔ ${publicName(provider)}` : `${role === "penyedia" ? "Penyewa" : "Penyedia"}: ${publicName(other)}`}
          </span>
        </span>
        <StatusBadge status={booking.status} overdue={booking.overdue} className="hidden shrink-0 sm:inline-flex" />
      </Link>
      <StatusBadge status={booking.status} overdue={booking.overdue} className="mt-2 sm:hidden" />
      {role === "admin" && (
        <Notice icon={<Eye className="size-4" />} className="mt-4" title="Mode admin: hanya melihat">
          Kamu melihat bukti sewaan ini sebagai mediator. Tindakan mediasi ada di panel admin.
        </Notice>
      )}
      <div className="mt-6 lg:mt-8">{children(ctx)}</div>
    </Container>
  );
}

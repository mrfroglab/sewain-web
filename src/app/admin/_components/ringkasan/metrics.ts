// Pure aggregation for the admin summary (PRD 9.8 "Ringkasan data" + PRD 17 metrics).

import { CATEGORY_BY_ID } from "@/lib/data/categories";
import { STATUS_LABEL, liveListings } from "@/lib/selectors";
import type { Booking, BookingStatus, CategoryId, DataState } from "@/lib/types";
import type { BarRow } from "../AdminUi";

const D = 86_400_000;

/** Display order: the happy path first, then disputes, then the "never rented" outcomes. */
export const STATUS_ORDER: BookingStatus[] = ["REQUESTED", "ACCEPTED", "ACTIVE", "RETURNED", "COMPLETED", "DISPUTED", "RESOLVED", "DECLINED", "EXPIRED", "CANCELLED"];

/** Bookings that never turned into a rental are left out of money totals. */
const NOT_RENTED: BookingStatus[] = ["DECLINED", "EXPIRED", "CANCELLED"];

/** PRD 17: dispute-to-completed-rental ratio target. */
export const DISPUTE_RATIO_TARGET = 0.05;

const sum = (list: Booking[], pick: (b: Booking) => number) => list.reduce((acc, b) => acc + pick(b), 0);

export type SummaryInput = Pick<DataState, "bookings" | "disputes" | "users" | "listings">;

export function summarize(s: SummaryInput, now: number) {
  const byStatus = Object.fromEntries(STATUS_ORDER.map((k) => [k, 0])) as Record<BookingStatus, number>;
  for (const b of s.bookings) byStatus[b.status] += 1;
  const overdue = s.bookings.filter((b) => b.overdue && (b.status === "ACTIVE" || b.status === "DISPUTED")).length;
  const statusRows: BarRow[] = STATUS_ORDER.map((k) => ({
    key: k,
    label: STATUS_LABEL[k],
    value: byStatus[k],
    note: k === "ACTIVE" && overdue > 0 ? `${overdue} telat` : undefined,
  }));

  // Money (FR-K4: commission is computed from the rent value only, never from the deposit).
  const rented = s.bookings.filter((b) => !NOT_RENTED.includes(b.status));
  const rentValue = sum(rented, (b) => b.agreement.quote.total);
  const commissionIf = sum(rented, (b) => b.agreement.commission.amount);
  const commissionCharged = sum(rented, (b) => b.agreement.commission.charged);

  // Disputes per category (via the booking's agreement snapshot).
  const perCategory = new Map<CategoryId, number>();
  for (const d of s.disputes) {
    const b = s.bookings.find((x) => x.id === d.bookingId);
    const cat = b?.agreement.category ?? s.listings.find((l) => l.id === b?.listingId)?.category;
    if (cat) perCategory.set(cat, (perCategory.get(cat) ?? 0) + 1);
  }
  const disputeRows: BarRow[] = [...perCategory]
    .map(([id, n]) => ({ key: id, label: CATEGORY_BY_ID[id]?.name ?? id, value: n }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const finished = byStatus.COMPLETED + byStatus.RESOLVED;
  const disputeRatio = finished > 0 ? s.disputes.length / finished : null;
  const disputesOpen = s.disputes.filter((d) => d.status !== "selesai").length;

  // People & supply.
  const members = s.users.filter((u) => u.role !== "admin");
  const verifiedMembers = members.filter((u) => u.verification.status === "terverifikasi");
  const owners = new Set(s.listings.map((l) => l.ownerId));
  const verifiedProviders = verifiedMembers.filter((u) => owners.has(u.id));
  const live = liveListings(s).length;

  // North Star (PRD 17): completed rentals per week on the demo clock, last 6 weeks (oldest first).
  const weeks: BarRow[] = [];
  for (let w = 5; w >= 0; w--) {
    const end = now - w * 7 * D;
    const start = end - 7 * D;
    weeks.push({
      key: `w${w}`,
      label: w === 0 ? "Minggu ini" : `${w} mgg lalu`,
      value: s.bookings.filter((b) => b.status === "COMPLETED" && b.completedAt != null && b.completedAt > start && b.completedAt <= end).length,
    });
  }

  return {
    totalBookings: s.bookings.length,
    statusRows,
    overdue,
    rentedCount: rented.length,
    rentValue,
    commissionIf,
    commissionCharged,
    disputeRows,
    disputeCount: s.disputes.length,
    disputesOpen,
    finished,
    disputeRatio,
    members: members.length,
    verified: verifiedMembers.length,
    verifiedProviders: verifiedProviders.length,
    tokoProviders: verifiedProviders.filter((u) => u.accountType === "toko").length,
    liveListings: live,
    totalListings: s.listings.length,
    pausedListings: s.listings.filter((l) => l.status === "jeda").length,
    removedListings: s.listings.filter((l) => l.status === "diturunkan").length,
    weeks,
    northStar: weeks[weeks.length - 1].value,
    northStarPrev: weeks[weeks.length - 2].value,
  };
}

export type Summary = ReturnType<typeof summarize>;

/** 0.1834 → "18,3%" */
export const percent = (r: number) => `${(r * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

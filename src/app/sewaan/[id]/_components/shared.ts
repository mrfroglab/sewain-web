// Shared types + pure helpers for the booking detail page (/sewaan/[id]).

import { endOfDay, isoDate, parseIsoDate } from "@/lib/format";
import type { Booking, Dispute, DisputeCase, DisputeLayer, Listing, PaymentMethod, User } from "@/lib/types";

/** Who is looking at the booking. Admin = mediator, read-only here. */
export type ViewerRole = "penyewa" | "penyedia" | "admin";

/** Everything a section of the detail page needs, resolved once in <BookingDetail/>. */
export interface BookingView {
  b: Booking;
  listing?: Listing;
  renter?: User;
  provider?: User;
  dispute?: Dispute;
  user: User;
  role: ViewerRole;
  /** demo-clock now (ms) */
  now: number;
}

const D = 86_400_000;

/**
 * OVERDUE flag details: days late (counted until the item came back, or until now) and the accrued
 * late fee = min(days × denda per hari, batas denda di kesepakatan).
 */
export function lateInfo(b: Booking, now: number): { days: number; fee: number; capped: boolean } | null {
  if (!b.overdue) return null;
  const due = endOfDay(b.endDate);
  const until = b.returnedAt ?? now;
  const days = Math.max(1, Math.ceil((until - due) / D));
  const raw = days * b.agreement.lateFeePerDay;
  return { days, fee: Math.min(raw, b.agreement.lateFeeCap), capped: raw >= b.agreement.lateFeeCap };
}

/** Whole days until the return date (0 = today, negative = past). */
export const daysUntilReturn = (b: Booking, now: number) => Math.round((parseIsoDate(b.endDate) - parseIsoDate(isoDate(now))) / D);

export function returnLabel(days: number): string {
  if (days < 0) return "lewat tanggal kembali";
  if (days === 0) return "kembali hari ini";
  if (days === 1) return "kembali besok";
  return `${days} hari lagi`;
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  qris: "QRIS",
  va: "Virtual account",
  ewallet: "E-wallet",
  langsung: "Bayar langsung ke penyedia",
  tunai: "Tunai di tempat",
};

export const DISPUTE_CASE_LABEL: Record<DisputeCase, string> = {
  "lecet-ringan": "Lecet / aus ringan",
  "rusak-ringan": "Rusak, bisa diperbaiki",
  "rusak-berat": "Rusak berat",
  hilang: "Hilang / kurang lengkap",
  telat: "Telat kembali",
  "tidak-kembali": "Barang tidak dikembalikan",
  "jaminan-tidak-kembali": "Jaminan tidak dikembalikan",
  "tidak-sesuai": "Barang tidak sesuai deskripsi",
  "batal-sepihak": "Batal sepihak",
  "no-show": "Tidak datang",
  "deposit-ditahan": "Deposit ditahan",
  kendaraan: "Kendaraan: tilang / kecelakaan",
  lainnya: "Lainnya",
};

export const LAYER_LABEL: Record<DisputeLayer, string> = {
  L1: "L1 · Negosiasi mandiri (48 jam)",
  L2: "L2 · Mediasi admin",
  L3: "L3 · Tindakan platform",
};

/** The other party from the viewer's point of view (admin has none). */
export const otherParty = (v: BookingView) => (v.role === "penyewa" ? v.provider : v.role === "penyedia" ? v.renter : undefined);

// Which dispute layer (PRD 11.2) a case is in. L3 has no explicit store transition: a case counts as
// L3 once a platform consequence (strike tied to the booking) was given, or the store marked it L3.

import type { Dispute, Strike } from "@/lib/types";

export type MediatorLayer = "L1" | "L2" | "L3";

export const MEDIATOR_LAYERS: { id: MediatorLayer; title: string; detail: string }[] = [
  { id: "L1", title: "Negosiasi", detail: "48 jam antar pengguna" },
  { id: "L2", title: "Mediasi admin", detail: "Rekomendasi ≤ 5 hari kerja" },
  { id: "L3", title: "Konsekuensi", detail: "Strike → suspend → blacklist" },
];

export const hasSanction = (d: Pick<Dispute, "bookingId">, strikes: Strike[]) => strikes.some((s) => s.bookingId === d.bookingId);

export function disputeLayer(d: Dispute, sanctioned: boolean): MediatorLayer {
  if (d.layer === "L3" || sanctioned) return "L3";
  if (d.status === "negosiasi") return "L1";
  if (d.status === "mediasi") return "L2";
  // selesai: L1 when a proposal was accepted without the admin
  return d.recommendation || d.layer === "L2" ? "L2" : "L1";
}

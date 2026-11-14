"use client";

import { useAppStore } from "@/lib/store";
import { ActionHead } from "./ActionBits";
import { CollateralActions } from "./CollateralActions";
import { DisputeSummary } from "./DisputeSummary";
import { ReviewSection } from "./ReviewSection";
import type { BookingView } from "./shared";

/** COMPLETED / RESOLVED: (RESOLVED: dispute outcome + leftover collateral steps) then two-way rating. */
export function FinishedActions({ view }: { view: BookingView }) {
  const { b, role, user } = view;
  const reviewed = useAppStore((s) => s.reviews.some((r) => r.bookingId === b.id && r.fromId === user.id));
  const collateralOpen = b.status === "RESOLVED" && !b.collateralReturn?.renterConfirmedAt;
  const done = reviewed || role === "admin";

  let title: string;
  let description: string;
  if (b.status === "RESOLVED") {
    title = collateralOpen ? "Sengketa selesai · urus sisa jaminan" : done ? "Sengketa selesai" : "Sengketa selesai · beri rating";
    description = collateralOpen ? "Kembalikan (atau konfirmasi) sisa jaminan sesuai hasil sengketa." : "Hasil sengketa tercatat di riwayat kedua pihak.";
  } else {
    title = done ? "Sewa selesai" : "Sewa selesai · beri rating";
    description = b.completedAuto
      ? "Selesai otomatis karena jaminan tidak dikonfirmasi dalam 48 jam."
      : "Barang kembali dan jaminan sudah dikonfirmasi. Terima kasih sudah saling menjaga!";
  }

  return (
    <>
      <ActionHead title={title} description={description} />
      {b.status === "RESOLVED" && <DisputeSummary view={view} compact />}
      {collateralOpen && <CollateralActions view={view} withHead={false} />}
      <ReviewSection view={view} />
    </>
  );
}

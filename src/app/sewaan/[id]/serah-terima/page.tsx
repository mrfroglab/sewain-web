"use client";

// Check-out / serah terima (PRD 10.1, FR-P*, FR-J5/J6): provider photographs the item (≥3) + the collateral,
// then BOTH parties press "Setuju kondisi". Only then does the booking become ACTIVE.

import { BookingFrame, type BookingCtx } from "./_shared/BookingFrame";
import { CheckoutClosed } from "./_components/CheckoutClosed";
import { CheckoutForm } from "./_components/CheckoutForm";
import { CheckoutReview } from "./_components/CheckoutReview";
import { CheckoutWaiting } from "./_components/CheckoutWaiting";

export default function SerahTerimaPage() {
  return (
    <BookingFrame title="Serah terima" description="Foto kondisi barang + jaminan, lalu kedua pihak menekan “Setuju kondisi”.">
      {(ctx) => <Checkout ctx={ctx} />}
    </BookingFrame>
  );
}

function Checkout({ ctx }: { ctx: BookingCtx }) {
  const { booking, role } = ctx;
  if (booking.status !== "ACCEPTED") return <CheckoutClosed ctx={ctx} />;
  if (booking.checkout) return <CheckoutReview ctx={ctx} />;
  return role === "penyedia" ? <CheckoutForm ctx={ctx} /> : <CheckoutWaiting ctx={ctx} />;
}

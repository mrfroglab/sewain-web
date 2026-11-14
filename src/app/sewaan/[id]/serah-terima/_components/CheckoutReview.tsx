"use client";

import { Lock } from "lucide-react";
import { EvidenceGrid } from "@/components/photo/EvidencePhoto";
import { formatDateTime } from "@/lib/format";
import { describeCollateral } from "@/lib/pricing";
import { publicName } from "@/lib/selectors";
import type { BookingCtx } from "../_shared/BookingFrame";
import { referencePhotos, useBookingEvidence } from "../_shared/evidence";
import { ReferencePanel, SectionTitle, VehicleReadout } from "../_shared/ui";
import { AgreementPanel } from "./AgreementPanel";

/** Check-out photos are in: both parties review them and press "Setuju kondisi". */
export function CheckoutReview({ ctx }: { ctx: BookingCtx }) {
  const { booking, listing, provider } = ctx;
  const ev = useBookingEvidence(booking);
  const checkout = booking.checkout!;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
      <div className="min-w-0 space-y-10">
        <CheckoutRecord ctx={ctx} />
        <ReferencePanel
          photos={referencePhotos(booking, listing)}
          conditionNotes={booking.agreement.conditionNotes || listing.conditionNotes}
          description="Bandingkan foto serah terima di atas dengan kondisi saat barang diiklankan."
        />
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <AgreementPanel ctx={ctx} />
        <p className="mt-3 text-caption text-smoke">
          Foto diunggah {publicName(provider)} pada {formatDateTime(checkout.submittedAt)} · {ev.checkout.length} foto barang + {ev.collateral.length} foto jaminan.
        </p>
      </aside>
    </div>
  );
}

/** The submitted check-out evidence: item photos, collateral photo, odometer/BBM. Reused on the "done" state. */
export function CheckoutRecord({ ctx }: { ctx: BookingCtx }) {
  const { booking } = ctx;
  const ev = useBookingEvidence(booking);
  const checkout = booking.checkout;
  if (!checkout) return null;
  return (
    <div className="space-y-10">
      <section>
        <SectionTitle title={`Foto kondisi barang (${ev.checkout.length})`} description="Ketuk foto untuk memperbesar dan melihat sidik digital SHA-256 lengkap." />
        <EvidenceGrid ids={ev.checkout} bookingCode={booking.code} cols={3} />
      </section>
      <section>
        <SectionTitle title="Foto jaminan" description={describeCollateral(booking.collateral, booking.agreement.itemValue)} />
        <EvidenceGrid ids={ev.collateral} bookingCode={booking.code} cols={3} />
        <p className="mt-2 flex items-center gap-1.5 text-caption text-smoke">
          <Lock className="size-3.5" /> Hanya terlihat oleh penyewa, penyedia, dan mediator Sewain.
        </p>
      </section>
      {(checkout.odometer || checkout.fuel) && (
        <section>
          <SectionTitle title="Odometer & BBM" />
          <VehicleReadout out={{ odometer: checkout.odometer, fuel: checkout.fuel }} />
        </section>
      )}
    </div>
  );
}

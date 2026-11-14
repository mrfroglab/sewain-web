"use client";

import { Ban, CircleCheck, Hourglass, MessageCircle, PackageX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { formatDate, formatDateTime } from "@/lib/format";
import { STATUS_LABEL, publicName } from "@/lib/selectors";
import type { BookingCtx } from "../_shared/BookingFrame";
import { StateHero } from "../_shared/ui";
import { CheckoutRecord } from "./CheckoutReview";

/** Any status other than ACCEPTED: success ("Sewa dimulai"), the recorded handover, or why it's not available. */
export function CheckoutClosed({ ctx }: { ctx: BookingCtx }) {
  const { booking, renter, provider } = ctx;
  const back = (
    <ButtonLink href={`/sewaan/${booking.id}`} size="lg">
      Ke detail sewaan
    </ButtonLink>
  );

  if (booking.checkout && booking.activeAt) {
    const justStarted = booking.status === "ACTIVE";
    return (
      <div className="space-y-12">
        <StateHero
          icon={<CircleCheck className="size-7" />}
          title={justStarted ? "Sewa dimulai" : "Serah terima tercatat"}
          actions={
            <>
              {back}
              <ButtonLink href={`/sewaan/${booking.id}/chat`} size="lg" variant="secondary">
                <MessageCircle className="size-4" /> Chat
              </ButtonLink>
            </>
          }
        >
          {publicName(provider)} dan {publicName(renter)} menyetujui kondisi barang dan jaminan pada {formatDateTime(booking.activeAt)}.{" "}
          {justStarted && <>Barang kembali paling lambat {formatDate(booking.endDate)}. Foto di bawah jadi pembanding saat pengembalian.</>}
        </StateHero>
        <CheckoutRecord ctx={ctx} />
      </div>
    );
  }

  if (booking.status === "REQUESTED")
    return (
      <StateHero icon={<Hourglass className="size-6" />} title="Request belum disetujui" actions={back}>
        Serah terima dibuka setelah penyedia menyetujui request dan titik temu disepakati.
      </StateHero>
    );

  if (booking.status === "CANCELLED") {
    const atHandover = booking.cancelReason?.startsWith("Barang tidak sesuai deskripsi");
    return (
      <div className="space-y-12">
        <StateHero icon={atHandover ? <PackageX className="size-6" /> : <Ban className="size-6" />} title={atHandover ? "Sewa dibatalkan tanpa penalti" : "Booking dibatalkan"} actions={back}>
          {atHandover
            ? "Penyewa melaporkan barang tidak sesuai deskripsi saat serah terima. Laporan sudah diteruskan ke admin, dan jaminan dikembalikan ke penyewa."
            : `Dibatalkan oleh ${booking.cancelledBy === booking.renterId ? "penyewa" : "penyedia"} sebelum serah terima.`}
          {booking.cancelReason && <span className="mt-2 block text-smoke">“{booking.cancelReason.replace(/^Barang tidak sesuai deskripsi:\s*/, "")}”</span>}
        </StateHero>
        {booking.checkout && <CheckoutRecord ctx={ctx} />}
      </div>
    );
  }

  return (
    <StateHero icon={<Ban className="size-6" />} title={`Booking ${STATUS_LABEL[booking.status].toLowerCase()}`} actions={back}>
      Tidak ada serah terima untuk booking ini.
    </StateHero>
  );
}

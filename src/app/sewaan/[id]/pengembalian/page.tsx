"use client";

// Check-in / pengembalian (PRD 10.1): provider photographs the returned item (≥3, same angles as check-out),
// compares side by side, then picks "Kondisi sesuai" or "Ada masalah" (type + photos → dispute L1).

import { Ban, Hourglass, Scale } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { STATUS_LABEL } from "@/lib/selectors";
import { BookingFrame, type BookingCtx } from "../serah-terima/_shared/BookingFrame";
import { StateHero } from "../serah-terima/_shared/ui";
import { CheckinForm } from "./_components/CheckinForm";
import { CheckinResult } from "./_components/CheckinResult";
import { CheckinWaiting } from "./_components/CheckinWaiting";

export default function PengembalianPage() {
  return (
    <BookingFrame title="Pengembalian" description="Foto kondisi saat barang kembali, bandingkan dengan serah terima, lalu konfirmasi.">
      {(ctx) => <Checkin ctx={ctx} />}
    </BookingFrame>
  );
}

function Checkin({ ctx }: { ctx: BookingCtx }) {
  const { booking, role } = ctx;
  if (booking.checkin) return <CheckinResult ctx={ctx} />;
  if (booking.status === "ACTIVE") return role === "penyedia" ? <CheckinForm ctx={ctx} /> : <CheckinWaiting ctx={ctx} />;

  const id = booking.id;
  if (booking.status === "REQUESTED" || booking.status === "ACCEPTED")
    return (
      <StateHero
        icon={<Hourglass className="size-6" />}
        title="Barang belum diserahkan"
        actions={
          <>
            {booking.status === "ACCEPTED" && (
              <ButtonLink href={`/sewaan/${id}/serah-terima`} size="lg">
                Ke serah terima
              </ButtonLink>
            )}
            <ButtonLink href={`/sewaan/${id}`} size="lg" variant={booking.status === "ACCEPTED" ? "secondary" : "primary"}>
              Ke detail sewaan
            </ButtonLink>
          </>
        }
      >
        Pengembalian dicatat setelah serah terima selesai dan sewa berjalan.
      </StateHero>
    );

  if (booking.status === "DISPUTED")
    return (
      <StateHero
        icon={<Scale className="size-6" />}
        title="Sewa ini sedang dalam sengketa"
        actions={
          <ButtonLink href={`/sewaan/${id}/sengketa`} size="lg">
            Buka sengketa
          </ButtonLink>
        }
      >
        Masalah dilaporkan sebelum barang kembali. Pengembalian barang dan jaminan diatur lewat negosiasi atau mediasi admin.
      </StateHero>
    );

  return (
    <StateHero
      icon={<Ban className="size-6" />}
      title={`Booking ${STATUS_LABEL[booking.status].toLowerCase()}`}
      actions={
        <ButtonLink href={`/sewaan/${id}`} size="lg">
          Ke detail sewaan
        </ButtonLink>
      }
    >
      Tidak ada pengembalian untuk booking ini.
    </StateHero>
  );
}

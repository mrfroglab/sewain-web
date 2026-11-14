"use client";

// Penyelesaian sengketa (PRD 11): report a problem, L1 negotiation (48h, proposals), L2 admin mediation,
// with the evidence board (referensi · check-out · check-in per angle) always visible.

import { Ban, Scale, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { STATUS_LABEL } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { BookingFrame, type BookingCtx } from "../serah-terima/_shared/BookingFrame";
import { StateHero } from "../serah-terima/_shared/ui";
import { DisputeView } from "./_components/DisputeView";
import { EvidenceBoard } from "./_components/EvidenceBoard";
import { ReportForm } from "./_components/ReportForm";

export default function SengketaPage() {
  return (
    <BookingFrame title="Sengketa" description="Bukti dulu, opini belakangan. Sewain menengahi, bukan menghakimi.">
      {(ctx) => <Sengketa ctx={ctx} />}
    </BookingFrame>
  );
}

function Sengketa({ ctx }: { ctx: BookingCtx }) {
  const { booking, role } = ctx;
  const dispute = useAppStore((s) => (booking.disputeId ? s.disputes.find((d) => d.id === booking.disputeId) : undefined));
  if (dispute) return <DisputeView ctx={ctx} dispute={dispute} />;

  const canReport = (booking.status === "ACTIVE" || booking.status === "RETURNED") && role !== "admin";
  if (canReport) return <ReportForm ctx={ctx} />;

  const id = booking.id;
  const back = (
    <ButtonLink href={`/sewaan/${id}`} size="lg" variant={booking.status === "ACCEPTED" && role === "penyewa" ? "secondary" : "primary"}>
      Ke detail sewaan
    </ButtonLink>
  );

  if (role === "admin")
    return (
      <div className="space-y-12">
        <StateHero icon={<ShieldCheck className="size-6" />} title="Tidak ada sengketa" actions={back}>
          Booking ini belum pernah dilaporkan bermasalah.
        </StateHero>
        {booking.checkout && <EvidenceBoard ctx={ctx} />}
      </div>
    );

  if (booking.status === "REQUESTED" || booking.status === "ACCEPTED")
    return (
      <StateHero
        icon={<Scale className="size-6" />}
        title="Belum ada yang bisa disengketakan"
        actions={
          <>
            {booking.status === "ACCEPTED" && role === "penyewa" && (
              <ButtonLink href={`/sewaan/${id}/serah-terima`} size="lg">
                Ke serah terima
              </ButtonLink>
            )}
            {back}
          </>
        }
      >
        Sengketa bisa dibuka saat barang sedang disewa (termasuk telat) atau setelah dikembalikan.
        {booking.status === "ACCEPTED" && role === "penyewa" && " Barang tidak sesuai deskripsi saat serah terima? Kamu bisa membatalkan tanpa penalti di halaman serah terima."}
      </StateHero>
    );

  if (booking.status === "COMPLETED")
    return (
      <StateHero
        icon={<ShieldCheck className="size-6" />}
        title="Sewa sudah selesai"
        actions={
          <>
            {back}
            <ButtonLink href="/bantuan#kontak" size="lg" variant="secondary">
              Hubungi Sewain
            </ButtonLink>
          </>
        }
      >
        Jaminan sudah dikembalikan dan dikonfirmasi. Kalau masih ada masalah, hubungi tim Sewain lewat Bantuan.
      </StateHero>
    );

  return (
    <StateHero icon={<Ban className="size-6" />} title={`Booking ${STATUS_LABEL[booking.status].toLowerCase()}`} actions={back}>
      Tidak ada sengketa untuk booking ini.
    </StateHero>
  );
}

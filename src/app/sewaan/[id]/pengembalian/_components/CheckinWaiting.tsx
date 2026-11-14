"use client";

import { Clock, Flag, Undo2 } from "lucide-react";
import { EvidenceGrid } from "@/components/photo/EvidencePhoto";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Layout";
import { formatDate, rupiah } from "@/lib/format";
import { describeCollateral } from "@/lib/pricing";
import { publicName } from "@/lib/selectors";
import type { BookingCtx } from "../../serah-terima/_shared/BookingFrame";
import { useBookingEvidence } from "../../serah-terima/_shared/evidence";
import { SectionTitle, StateHero, Steps } from "../../serah-terima/_shared/ui";

/** ACTIVE, nothing recorded yet, viewer is the renter (or admin): what happens at return. */
export function CheckinWaiting({ ctx }: { ctx: BookingCtx }) {
  const { booking, provider, role } = ctx;
  const ev = useBookingEvidence(booking);
  const name = publicName(provider);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <StateHero
        icon={<Undo2 className="size-6" />}
        title={role === "admin" ? "Barang belum dikembalikan" : `Kembalikan barang ke ${name}`}
        actions={
          role === "penyewa" && (
            <ButtonLink href={`/sewaan/${booking.id}/chat`} size="lg" variant="secondary">
              Atur waktu lewat chat
            </ButtonLink>
          )
        }
      >
        Batas kembali {formatDate(booking.endDate)}. Saat barang kembali, {name} memotret kondisinya dan memilih “Kondisi sesuai” atau “Ada masalah”. Hasilnya muncul di halaman ini.
      </StateHero>

      {booking.overdue && (
        <Notice icon={<Clock className="size-4" />} title="Sudah lewat tanggal kembali" tone="outline">
          Denda telat {rupiah(booking.agreement.lateFeePerDay)}/hari berlaku sesuai kesepakatan (maksimal {rupiah(booking.agreement.lateFeeCap)}). Kabari penyedia lewat chat, ya.
        </Notice>
      )}

      {role === "penyewa" && (
        <section>
          <h2 className="mb-4 text-body-lg font-semibold text-ink">Langkahnya</h2>
          <Steps
            items={[
              { title: "Bawa barang + kelengkapannya", detail: "Bersihkan bila perlu. Cocokkan dengan foto serah terima di bawah." },
              { title: `${name} memotret dan memeriksa`, detail: "Minimal 3 foto dari sudut yang sama dengan saat serah terima. Kamu boleh ikut melihat." },
              { title: `Jaminan dikembalikan: ${describeCollateral(booking.collateral, booking.agreement.itemValue)}`, detail: "Penyedia menandai jaminan dikembalikan, kamu konfirmasi sudah diterima. Lalu saling memberi rating." },
            ]}
          />
        </section>
      )}

      <section>
        <SectionTitle title="Kondisi saat serah terima" description="Ini pembandingnya saat barang kembali." />
        <EvidenceGrid ids={ev.checkout} bookingCode={booking.code} cols={3} />
      </section>

      {role === "penyewa" && (
        <Notice icon={<Flag className="size-4" />} title="Ada masalah selama sewa?">
          Misalnya barang rusak saat dipakai atau ada kendala lain. Laporkan sekarang supaya bisa dinegosiasikan dengan bukti.
          <div className="mt-3">
            <ButtonLink href={`/sewaan/${booking.id}/sengketa`} variant="secondary">
              Laporkan masalah
            </ButtonLink>
          </div>
        </Notice>
      )}
    </div>
  );
}

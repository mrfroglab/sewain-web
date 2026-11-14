"use client";

import { Camera, Wallet } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Layout";
import { HANDOVER_LABEL } from "@/lib/data/categories";
import { formatDate } from "@/lib/format";
import { describeCollateral } from "@/lib/pricing";
import { publicName } from "@/lib/selectors";
import type { BookingCtx } from "../_shared/BookingFrame";
import { collateralIsDocument, referencePhotos } from "../_shared/evidence";
import { ReferencePanel, StateHero, Steps } from "../_shared/ui";

/** ACCEPTED, no check-out photos yet, viewer is the renter (or admin): explain what will happen. */
export function CheckoutWaiting({ ctx }: { ctx: BookingCtx }) {
  const { booking, listing, provider, role } = ctx;
  const name = publicName(provider);
  const collateral = describeCollateral(booking.collateral, booking.agreement.itemValue);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
      <div className="min-w-0 space-y-8">
        <StateHero icon={<Camera className="size-6" />} title={role === "admin" ? "Belum ada foto serah terima" : `Menunggu ${name} memotret`}>
          {role === "admin"
            ? "Penyedia belum mengunggah foto kondisi barang dan jaminan."
            : `Saat bertemu, ${name} memotret minimal 3 foto kondisi barang dan foto jaminanmu. Setelah itu kamu memeriksa dan menekan “Setuju kondisi” di halaman ini.`}
        </StateHero>

        <section>
          <h2 className="mb-4 text-body-lg font-semibold text-ink">Saat serah terima</h2>
          <Steps
            items={[
              {
                title: `Bertemu · ${formatDate(booking.startDate)}`,
                detail: (
                  <>
                    {HANDOVER_LABEL[booking.handover]}. {booking.meetingPointDetail ?? "Atur titik temu lewat chat (disarankan tempat publik)."}{" "}
                    <Link href={`/sewaan/${booking.id}/chat`} className="font-medium text-ink underline underline-offset-4">
                      Buka chat
                    </Link>
                  </>
                ),
              },
              {
                title: `Serahkan jaminan: ${collateral}`,
                detail: collateralIsDocument(booking)
                  ? "Penyedia memotret jaminanmu. Boleh minta nomor penting (NIK/NIM) ditutup sebagian di foto. Selama dititipkan, kartu jadi tanggung jawab penyedia."
                  : "Penyedia memotret deposit atau bukti transfernya sebagai bukti.",
              },
              { title: "Cek barang bareng", detail: "Cocokkan dengan foto referensi dan catatan kondisi di samping. Lihat lecet yang belum terfoto? Tambahkan fotonya sebelum setuju." },
              { title: "Tekan “Setuju kondisi”", detail: "Sewa resmi dimulai. Kalau barang beda dari iklan, kamu bisa membatalkan tanpa penalti." },
            ]}
          />
        </section>

        {role === "penyewa" && booking.payment.status === "belum" && (
          <Notice icon={<Wallet className="size-4" />} title="Belum bayar?">
            Kamu bisa bayar sewa{booking.payment.deposit ? " + deposit" : ""} via Sewain (simulasi) di halaman sewaan, atau sesuai kesepakatan dengan penyedia.
            <div className="mt-3">
              <ButtonLink href={`/sewaan/${booking.id}`} variant="secondary">
                Ke halaman sewaan
              </ButtonLink>
            </div>
          </Notice>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <ReferencePanel
          photos={referencePhotos(booking, listing)}
          conditionNotes={booking.agreement.conditionNotes || listing.conditionNotes}
          description="Kondisi barang saat diiklankan. Ini yang nanti kamu cocokkan saat serah terima."
        />
      </aside>
    </div>
  );
}

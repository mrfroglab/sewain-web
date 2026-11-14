"use client";

import { Camera, IdCard, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PhotoCaptureField } from "@/components/photo/PhotoCaptureField";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Layout";
import { CATEGORY_BY_ID, RISK_NOTES } from "@/lib/data/categories";
import { describeCollateral } from "@/lib/pricing";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { ID } from "@/lib/types";
import type { BookingCtx } from "../_shared/BookingFrame";
import { CHECKOUT_ANGLES, collateralDemoSource, collateralIsDocument, demoSourcesFor, isVehicle, referencePhotos } from "../_shared/evidence";
import { MissingList, ReferencePanel, SectionTitle, VehicleFields } from "../_shared/ui";
import { FunctionChecklist } from "./FunctionChecklist";

const MIN_PHOTOS = 3;

/** Provider side, before anything was submitted: item photos + collateral photo (+ odometer/BBM) → submitCheckout. */
export function CheckoutForm({ ctx }: { ctx: BookingCtx }) {
  const { user, booking, listing } = ctx;
  const submitCheckout = useAppStore((s) => s.submitCheckout);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const [photoIds, setPhotoIds] = useState<ID[]>([]);
  const [collateralIds, setCollateralIds] = useState<ID[]>([]);
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState("");
  const [checked, setChecked] = useState<string[]>([]);

  const category = CATEGORY_BY_ID[listing.category];
  const vehicle = isVehicle(listing);
  const isDocument = collateralIsDocument(booking);
  const angles = vehicle ? [...CHECKOUT_ANGLES, "Odometer & indikator BBM"] : CHECKOUT_ANGLES;
  const collateralText = describeCollateral(booking.collateral, booking.agreement.itemValue);

  const missing = [
    photoIds.length < MIN_PHOTOS && `Foto kondisi barang kurang ${MIN_PHOTOS - photoIds.length} lagi`,
    collateralIds.length < 1 && "Foto jaminan belum ada",
    vehicle && !odometer && "Angka odometer belum diisi",
    vehicle && !fuel && "Indikator BBM belum dipilih",
  ].filter((m): m is string => !!m);

  const submit = () => {
    const res = submitCheckout(user.id, booking.id, {
      photoIds,
      collateralPhotoIds: collateralIds,
      odometer: vehicle ? odometer : undefined,
      fuel: vehicle ? fuel : undefined,
    });
    if (!toastResult(res, "Foto serah terima terkirim. Sekarang penyewa memeriksa dan menekan “Setuju kondisi”.")) return;
    // The function checklist is informative (P1); recording it in the booking chat keeps it as evidence (FR-C1).
    if (category?.checklist?.length && checked.length) {
      const ok = category.checklist.filter((c) => checked.includes(c));
      const notYet = category.checklist.filter((c) => !checked.includes(c));
      sendMessage(user.id, booking.id, {
        text: `Checklist fungsi saat serah terima: ${ok.map((c) => `✓ ${c}`).join(", ")}${notYet.length ? `. Belum dicek: ${notYet.join(", ")}` : ""}.`,
      });
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
      <div className="min-w-0 space-y-10">
        <Notice icon={<Camera className="size-4" />} title="Lakukan bareng penyewa saat bertemu">
          Foto diambil langsung dari kamera, diberi waktu server dan sidik digital (SHA-256), lalu tidak bisa dihapus atau diganti. Foto dari galeri tetap bisa, tapi diberi label “dari galeri”.
        </Notice>

        <section>
          <PhotoCaptureField
            label="Foto kondisi barang"
            help={`Minimal ${MIN_PHOTOS} sudut. Foto juga cacat yang sudah ada supaya tidak dikira kerusakan baru.`}
            stage="checkout"
            min={MIN_PHOTOS}
            max={10}
            angles={angles}
            uploaderId={user.id}
            bookingId={booking.id}
            bookingCode={booking.code}
            demoSources={demoSourcesFor(listing)}
            value={photoIds}
            onChange={setPhotoIds}
          />
        </section>

        <section className="space-y-3">
          <PhotoCaptureField
            label="Foto jaminan"
            help={`Jaminan yang disepakati: ${collateralText}.`}
            stage="jaminan"
            min={1}
            max={3}
            angles={["Jaminan"]}
            uploaderId={user.id}
            bookingId={booking.id}
            bookingCode={booking.code}
            demoSources={[collateralDemoSource(booking)]}
            value={collateralIds}
            onChange={setCollateralIds}
          />
          {isDocument ? (
            <Notice icon={<IdCard className="size-4" />} title="Tutup sebagian nomor penting">
              Sebelum memotret kartu atau dokumen, tutup sebagian NIK/NIM (pakai jari atau kertas). Dokumen asli jadi tanggung jawabmu selama dititipkan: simpan baik-baik dan kembalikan utuh.
            </Notice>
          ) : (
            <Notice icon={<ShieldCheck className="size-4" />}>Foto uang deposit atau bukti transfernya. Deposit kamu pegang sampai barang kembali.</Notice>
          )}
          <p className="text-caption text-smoke">Foto jaminan hanya terlihat oleh kamu, penyewa, dan mediator Sewain.</p>
        </section>

        {vehicle && (
          <section>
            <SectionTitle title="Odometer & BBM" description="Wajib untuk kendaraan. Jadi pembanding saat motor kembali." />
            <VehicleFields odometer={odometer} fuel={fuel} onOdometer={setOdometer} onFuel={setFuel} />
            <p className="mt-3 text-caption text-smoke">{RISK_NOTES.kendaraan}</p>
          </section>
        )}

        {!!category?.checklist?.length && (
          <section>
            <FunctionChecklist items={category.checklist} checked={checked} onChange={setChecked} />
          </section>
        )}

        <section className="border-t border-border-gray pt-6">
          <MissingList items={missing} />
          <Button size="lg" block className="sm:w-auto" disabled={missing.length > 0} onClick={submit}>
            Kirim foto serah terima
          </Button>
          <p className="mt-2 text-caption text-smoke">Dengan mengirim, kamu sekaligus menyetujui kondisi di foto. Sewa dimulai setelah penyewa juga setuju.</p>
        </section>
      </div>

      <aside className="order-first space-y-6 lg:sticky lg:top-24 lg:order-none lg:self-start">
        <ReferencePanel photos={referencePhotos(booking, listing)} conditionNotes={booking.agreement.conditionNotes || listing.conditionNotes} />
      </aside>
    </div>
  );
}

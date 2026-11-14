"use client";

import { Camera, CircleCheck, Clock, Scale, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { PhotoCaptureField } from "@/components/photo/PhotoCaptureField";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, Select, TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Layout";
import { diffDays, isoDate, rupiah } from "@/lib/format";
import { useAppStore, useNow } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { ID } from "@/lib/types";
import type { BookingCtx } from "../../serah-terima/_shared/BookingFrame";
import { ComparisonRows } from "../../serah-terima/_shared/Comparison";
import { demoSourcesFor, isVehicle, useBookingEvidence } from "../../serah-terima/_shared/evidence";
import { MissingList, SectionTitle, VehicleFields } from "../../serah-terima/_shared/ui";
import { PROBLEM_TYPES } from "./problems";

const MIN_PHOTOS = 3;

/** Provider records the return: ≥3 photos, side-by-side with check-out, result sesuai/masalah → submitCheckin. */
export function CheckinForm({ ctx }: { ctx: BookingCtx }) {
  const { user, booking, listing } = ctx;
  const submitCheckin = useAppStore((s) => s.submitCheckin);
  const now = useNow();
  const ev = useBookingEvidence(booking);
  const [photoIds, setPhotoIds] = useState<ID[]>([]);
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState("");
  const [result, setResult] = useState<"sesuai" | "masalah" | null>(null);
  const [problemType, setProblemType] = useState("");
  const [problemNote, setProblemNote] = useState("");
  const [problemIds, setProblemIds] = useState<ID[]>([]);

  const vehicle = isVehicle(listing);
  const baseAngles = ev.angles.length ? ev.angles : ["Depan", "Samping", "Close-up kondisi"];
  const angles = vehicle && !baseAngles.some((a) => /odometer/i.test(a)) ? [...baseAngles, "Odometer & indikator BBM"] : baseAngles;
  const hint = PROBLEM_TYPES.find((p) => p.label === problemType)?.hint;
  const lateDays = booking.overdue ? diffDays(booking.endDate, isoDate(now)) : 0;

  const missing = [
    photoIds.length < MIN_PHOTOS && `Foto kondisi saat kembali kurang ${MIN_PHOTOS - photoIds.length} lagi`,
    vehicle && !odometer && "Angka odometer belum diisi",
    vehicle && !fuel && "Indikator BBM belum dipilih",
    !result && "Pilih: kondisi sesuai atau ada masalah",
    result === "masalah" && !problemType && "Pilih jenis masalah",
    result === "masalah" && problemIds.length < 1 && "Lampirkan minimal 1 foto masalah",
  ].filter((m): m is string => !!m);

  const submit = () => {
    if (!result) return;
    const res = submitCheckin(user.id, booking.id, {
      photoIds,
      result,
      problemType: result === "masalah" ? problemType : undefined,
      problemNote: result === "masalah" ? problemNote.trim() || undefined : undefined,
      problemPhotoIds: result === "masalah" ? problemIds : undefined,
      odometer: vehicle ? odometer : undefined,
      fuel: vehicle ? fuel : undefined,
    });
    toastResult(res, result === "sesuai" ? "Pengembalian dicatat. Lanjut kembalikan jaminan penyewa." : "Pengembalian dicatat. Sengketa dibuka untuk negosiasi 48 jam.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      {booking.overdue && (
        <Notice icon={<Clock className="size-4" />} title={`Barang telat ${lateDays} hari`} tone="outline">
          Sesuai kesepakatan, denda telat {rupiah(booking.agreement.lateFeePerDay)}/hari, maksimal {rupiah(booking.agreement.lateFeeCap)}. Kalau kondisi barang sesuai tapi dendanya mau ditagih, catat pengembalian dulu, lalu laporkan “Telat kembali” di halaman sengketa (atau sepakati lewat chat).
        </Notice>
      )}
      <Notice icon={<Camera className="size-4" />} title="Periksa barang bareng penyewa">
        Ambil foto dari sudut yang sama dengan saat serah terima, supaya mudah dibandingkan. Foto dari kamera, diberi waktu server dan SHA-256.
      </Notice>

      <section>
        <PhotoCaptureField
          label="Foto kondisi saat kembali"
          help={`Minimal ${MIN_PHOTOS} foto. Urutan sudut mengikuti foto serah terima.`}
          stage="checkin"
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

      <section>
        <SectionTitle title="Bandingkan dengan serah terima" description="Kiri: saat barang diserahkan. Kanan: sekarang." />
        <ComparisonRows
          rowLabels={angles}
          minRows={Math.max(MIN_PHOTOS, photoIds.length)}
          bookingCode={booking.code}
          columns={[
            { label: "Check-out", cells: ev.checkout.map((id) => ({ kind: "photo" as const, id })) },
            { label: "Check-in", cells: photoIds.map((id) => ({ kind: "photo" as const, id })) },
          ]}
        />
      </section>

      {vehicle && (
        <section>
          <SectionTitle title="Odometer & BBM" description="Wajib untuk kendaraan." />
          <VehicleFields odometer={odometer} fuel={fuel} onOdometer={setOdometer} onFuel={setFuel} before={{ odometer: booking.checkout?.odometer, fuel: booking.checkout?.fuel }} />
        </section>
      )}

      <section>
        <SectionTitle title="Kondisi barang" description="Pilih setelah membandingkan foto." />
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Kondisi barang">
          <ChoiceCard
            selected={result === "sesuai"}
            onClick={() => setResult("sesuai")}
            icon={<CircleCheck className="size-5" />}
            title="Kondisi sesuai"
            description="Tidak ada kerusakan atau kekurangan baru. Lanjut kembalikan jaminan."
          />
          <ChoiceCard
            selected={result === "masalah"}
            onClick={() => setResult("masalah")}
            icon={<TriangleAlert className="size-5" />}
            title="Ada masalah"
            description="Lecet baru, rusak, kurang lengkap, atau kotor. Sengketa dibuka (negosiasi 48 jam)."
          />
        </div>

        {result === "masalah" && (
          <div className="mt-6 space-y-5 border-l-2 border-ink pl-4">
            <Select label="Jenis masalah" value={problemType} onChange={(e) => setProblemType(e.target.value)}>
              <option value="">Pilih jenis masalah</option>
              {PROBLEM_TYPES.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
            </Select>
            {hint && (
              <Notice icon={<Scale className="size-4" />} title="Panduan Sewain">
                {hint}
              </Notice>
            )}
            <TextArea
              label="Catatan"
              optional
              placeholder="mis. Goresan baru di elemen depan lensa, terlihat jelas saat disenter."
              value={problemNote}
              onChange={(e) => setProblemNote(e.target.value)}
              maxLength={500}
            />
            <PhotoCaptureField
              label="Foto masalah"
              help="Close-up bagian yang bermasalah. Wajib minimal 1."
              stage="masalah"
              min={1}
              max={6}
              angles={["Close-up masalah", "Close-up masalah 2", "Close-up masalah 3"]}
              uploaderId={user.id}
              bookingId={booking.id}
              bookingCode={booking.code}
              demoSources={demoSourcesFor(listing).slice(-1)}
              value={problemIds}
              onChange={setProblemIds}
            />
          </div>
        )}
      </section>

      <section className="border-t border-border-gray pt-6">
        <MissingList items={missing} />
        <Button size="lg" block className="sm:w-auto" disabled={missing.length > 0} onClick={submit}>
          Simpan pengembalian
        </Button>
        <p className="mt-2 text-caption text-smoke">
          {result === "masalah" ? "Penyewa diberi tahu dan kalian punya 48 jam untuk bernegosiasi sebelum naik ke admin." : "Setelah ini, kembalikan jaminan dan tandai di halaman sewaan."}
        </p>
      </section>
    </div>
  );
}

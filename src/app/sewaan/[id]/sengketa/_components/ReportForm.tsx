"use client";

import { Flag, Scale } from "lucide-react";
import { useState } from "react";
import { PhotoCaptureField } from "@/components/photo/PhotoCaptureField";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Layout";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { DisputeCase, ID } from "@/lib/types";
import type { BookingCtx } from "../../serah-terima/_shared/BookingFrame";
import { demoSourcesFor, isVehicle } from "../../serah-terima/_shared/evidence";
import { MissingList, SectionTitle } from "../../serah-terima/_shared/ui";
import { CASE_GROUPS, CASE_INFO } from "./cases";
import { EvidenceBoard } from "./EvidenceBoard";
import { Principles } from "./Principles";

const MIN_DESCRIPTION = 15;

/** "Laporkan masalah" → openDispute (L1 starts, 48h). */
export function ReportForm({ ctx }: { ctx: BookingCtx }) {
  const { user, booking, listing } = ctx;
  const openDispute = useAppStore((s) => s.openDispute);
  const [caseType, setCaseType] = useState<DisputeCase | null>(null);
  const [description, setDescription] = useState("");
  const [photoIds, setPhotoIds] = useState<ID[]>([]);
  const vehicle = isVehicle(listing);

  const missing = [
    !caseType && "Pilih jenis masalah",
    description.trim().length < MIN_DESCRIPTION && `Ceritakan masalahnya (minimal ${MIN_DESCRIPTION} karakter)`,
  ].filter((m): m is string => !!m);

  const submit = () => {
    if (!caseType) return;
    const res = openDispute(user.id, booking.id, { caseType, description: description.trim(), photoIds });
    toastResult(res, "Laporan terkirim. Negosiasi 48 jam dimulai.");
  };

  return (
    <div className="space-y-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <div className="min-w-0 space-y-10">
          <Notice icon={<Flag className="size-4" />} title="Laporkan masalah">
            Laporan membuka tahap negosiasi (L1): kalian punya 48 jam untuk sepakat dengan bukti yang tercatat. Kalau buntu, naik ke mediasi admin.
          </Notice>

          <section>
            <SectionTitle title="Jenis masalah" description="Di bawah tiap pilihan ada panduan default Sewain untuk kasus itu." />
            <div className="space-y-6">
              {CASE_GROUPS.map((g) => {
                const cases = g.cases.filter((c) => c !== "kendaraan" || vehicle);
                return (
                  <div key={g.title}>
                    <p className="mb-2 text-caption font-semibold uppercase tracking-[0.06em] text-smoke">{g.title}</p>
                    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={g.title}>
                      {cases.map((c) => (
                        <ChoiceCard key={c} selected={caseType === c} onClick={() => setCaseType(c)} title={CASE_INFO[c].label} description={CASE_INFO[c].hint} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {caseType && (
            <Notice icon={<Scale className="size-4" />} title="Bukti kunci untuk kasus ini">
              {CASE_INFO[caseType].evidence}. Pastikan bukti itu ada di foto atau chat Sewain.
            </Notice>
          )}

          <TextArea
            label="Ceritakan masalahnya"
            placeholder="Apa yang terjadi, kapan, dan apa yang kamu harapkan. Fakta dulu, ya."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={800}
            help={`${description.trim().length}/800 karakter`}
          />

          <PhotoCaptureField
            label="Foto bukti"
            help="Opsional, tapi sangat membantu. Foto dari kamera lebih kuat daripada dari galeri."
            stage="sengketa"
            max={8}
            angles={["Bukti 1", "Bukti 2", "Bukti 3", "Bukti 4"]}
            uploaderId={user.id}
            bookingId={booking.id}
            bookingCode={booking.code}
            demoSources={demoSourcesFor(listing).slice(-1)}
            value={photoIds}
            onChange={setPhotoIds}
          />

          <section className="border-t border-border-gray pt-6">
            <MissingList items={missing} />
            <Button size="lg" block className="sm:w-auto" disabled={missing.length > 0} onClick={submit}>
              <Flag className="size-4" /> Kirim laporan
            </Button>
            <p className="mt-2 text-caption text-smoke">Pihak lain langsung diberi tahu. Laporan tidak bisa dihapus, tapi bisa diselesaikan lewat kesepakatan.</p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Principles />
        </aside>
      </div>

      <EvidenceBoard ctx={ctx} />
    </div>
  );
}

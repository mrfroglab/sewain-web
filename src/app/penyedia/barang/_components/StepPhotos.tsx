"use client";

import { Lightbulb } from "lucide-react";
import { Notice } from "@/components/ui/Layout";
import { PhotoCaptureField } from "@/components/photo/PhotoCaptureField";
import type { ID } from "@/lib/types";
import { PHOTO_ANGLES, PHOTO_MIN } from "./draft";
import { Block, BigTextArea, FieldShell, QuickPicks } from "./fields";
import type { ListingForm } from "./useListingForm";

const CONDITION_PICKS = ["Mulus, tidak ada cacat", "Ada lecet halus, fungsi normal", "Bekas pakai wajar"];

/** Step 1 — reference photos (≥3, FR-L1) + existing condition (FR-L3). */
export function StepPhotos({ form, userId, demoSources }: { form: ListingForm; userId: ID; demoSources: string[] }) {
  const { draft, set, visibleErrors: e } = form;
  return (
    <div className="space-y-8">
      <Block>
        <FieldShell anchor="photos" error={e.photos}>
          <PhotoCaptureField
            label="Foto barang"
            help="Depan, samping, belakang. Kalau ada lecet atau cacat, foto juga dari dekat."
            stage="referensi"
            uploaderId={userId}
            bookingCode="Foto referensi"
            min={PHOTO_MIN}
            max={8}
            value={draft.photoIds}
            onChange={(ids) => set({ photoIds: ids })}
            angles={PHOTO_ANGLES}
            demoSources={demoSources}
            removable
            cols={3}
          />
        </FieldShell>
        <Notice icon={<Lightbulb className="size-4" />} title="Biar fotonya jelas">
          Foto di tempat terang, barang memenuhi layar, latar polos. Foto pertama jadi sampul listing. Belum punya kamera di laptop? Pilih <b>Foto contoh</b> di layar kamera.
        </Notice>
      </Block>

      <Block title="Kondisi barang sekarang" description="Wajib diisi. Catatan ini ikut masuk kesepakatan sewa, jadi lecet lama tidak bisa dituduhkan ke penyewa.">
        <div data-field="conditionNotes">
          <BigTextArea
            label="Tulis lecet/cacat yang sudah ada"
            value={draft.conditionNotes}
            onChange={(v) => set({ conditionNotes: v })}
            placeholder="Mis. penyok kecil di sisi kanan, tidak bocor. Tutup ada baret halus."
            maxLength={300}
            rows={3}
            error={e.conditionNotes}
          />
          <QuickPicks items={CONDITION_PICKS} active={draft.conditionNotes} onPick={(v) => set({ conditionNotes: v })} />
        </div>
      </Block>
    </div>
  );
}

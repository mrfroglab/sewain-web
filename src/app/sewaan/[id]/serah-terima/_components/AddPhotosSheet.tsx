"use client";

import { useState } from "react";
import { PhotoCaptureField } from "@/components/photo/PhotoCaptureField";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { ID } from "@/lib/types";
import type { BookingCtx } from "../_shared/BookingFrame";
import { demoSourcesFor } from "../_shared/evidence";

/** Either party may add check-out photos (append-only, FR-P4). Mounted only while open, so state resets. */
export function AddPhotosSheet({ ctx, onClose }: { ctx: BookingCtx; onClose: () => void }) {
  const { user, booking, listing, role } = ctx;
  const addCheckoutPhotos = useAppStore((s) => s.addCheckoutPhotos);
  const [ids, setIds] = useState<ID[]>([]);

  const save = () => {
    if (toastResult(addCheckoutPhotos(user.id, booking.id, ids), `${ids.length} foto ditambahkan ke bukti serah terima.`)) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Tambah foto kondisi"
      description={
        role === "penyewa"
          ? "Lihat lecet atau cacat yang belum terfoto? Foto sekarang supaya tidak dianggap kerusakan baru saat pengembalian."
          : "Foto tambahan ikut jadi bukti serah terima."
      }
      footer={
        <Button block size="lg" disabled={!ids.length} onClick={save}>
          Simpan {ids.length || ""} foto
        </Button>
      }
    >
      <PhotoCaptureField
        label="Foto tambahan"
        help="Foto tidak bisa dihapus setelah disimpan."
        stage="checkout"
        min={1}
        max={6}
        angles={["Close-up tambahan", "Close-up tambahan 2", "Close-up tambahan 3"]}
        uploaderId={user.id}
        bookingId={booking.id}
        bookingCode={booking.code}
        demoSources={demoSourcesFor(listing).slice(-1)}
        value={ids}
        onChange={setIds}
      />
    </Sheet>
  );
}

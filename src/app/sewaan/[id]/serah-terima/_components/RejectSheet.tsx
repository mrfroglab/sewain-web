"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Layout";
import { Sheet } from "@/components/ui/Sheet";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { BookingCtx } from "../_shared/BookingFrame";

/** PRD 11.3 "Barang tidak sesuai deskripsi": reported at check-out → renter cancels without penalty. */
export function RejectSheet({ ctx, onClose }: { ctx: BookingCtx; onClose: () => void }) {
  const { user, booking } = ctx;
  const rejectAtCheckout = useAppStore((s) => s.rejectAtCheckout);
  const [note, setNote] = useState("");
  const tooShort = note.trim().length < 10;

  const submit = () => {
    if (toastResult(rejectAtCheckout(user.id, booking.id, note.trim()), "Sewa dibatalkan tanpa penalti. Laporan diteruskan ke admin.")) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Barang tidak sesuai deskripsi?"
      description="Kalau barang yang diserahkan beda dari iklan, kamu boleh membatalkan sekarang tanpa penalti."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Kembali
          </Button>
          <Button disabled={tooShort} onClick={submit}>
            Batalkan sewa tanpa penalti
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextArea
          label="Apa yang tidak sesuai?"
          placeholder="mis. Di iklan lensanya 18–55mm, yang dibawa 50mm. Baterai juga tidak ikut."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          help="Minimal 10 karakter. Catatan ini dikirim ke admin bersama foto serah terima."
          maxLength={500}
        />
        <Notice icon={<Info className="size-4" />}>
          Pembatalan ini hanya bisa sebelum kamu menekan “Setuju kondisi”. Admin meninjau laporannya; penyedia bisa mendapat strike kalau terbukti menyesatkan. Jangan lupa ambil kembali jaminanmu.
        </Notice>
      </div>
    </Sheet>
  );
}

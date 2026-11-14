"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { Sheet } from "@/components/ui/Sheet";
import { publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Booking, User } from "@/lib/types";

const REASONS = ["Barang sedang dipakai", "Tanggalnya bentrok", "Barang lagi diservis", "Lokasi terlalu jauh"];

/** Decline a request with a reason the renter will see. Mounted only while open so it resets. */
export function DeclineSheet({ booking, renter, userId, onClose }: { booking: Booking | null; renter?: User; userId: string; onClose: () => void }) {
  if (!booking) return null;
  return <DeclineSheetInner booking={booking} renter={renter} userId={userId} onClose={onClose} />;
}

function DeclineSheetInner({ booking, renter, userId, onClose }: { booking: Booking; renter?: User; userId: string; onClose: () => void }) {
  const declineBooking = useAppStore((s) => s.declineBooking);
  const [text, setText] = useState("");
  const reason = text.trim();
  const submit = () => {
    if (toastResult(declineBooking(userId, booking.id, reason), "Request ditolak. Penyewa sudah diberi tahu.")) onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title="Tolak request"
      description={`${publicName(renter)} akan menerima alasanmu dan bisa mencari barang lain.`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button variant="danger" className="flex-1" disabled={!reason} onClick={submit}>
            Tolak request
          </Button>
        </div>
      }
    >
      <p className="mb-2 text-body-sm font-semibold text-ink">Pilih alasan</p>
      <div className="flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <Pill key={r} active={text === r} onClick={() => setText(r)} className="h-9">
            {r}
          </Pill>
        ))}
      </div>
      <TextArea className="mt-4" label="Atau tulis sendiri" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Mis. Maaf, panci sedang dipinjam tetangga sampai Minggu." />
    </Sheet>
  );
}

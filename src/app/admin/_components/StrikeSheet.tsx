"use client";

import { useState } from "react";
import { ChoiceCard } from "@/components/ui/Field";
import { publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { ID, User } from "@/lib/types";
import { ReasonSheet } from "./ReasonSheet";

export type Severity = "ringan" | "berat";

/** Strike weight in the store: ringan +1, berat +2. */
export const STRIKE_WEIGHT: Record<Severity, number> = { ringan: 1, berat: 2 };

/** From this many strikes on, the UI suggests suspending (PRD 11.2 L3: strike → suspend → blacklist). */
export const SUSPEND_HINT_AT = 3;

export const STRIKE_PRESETS = [
  "Tidak datang saat serah terima (no-show)",
  "Membatalkan sepihak setelah disetujui",
  "Listing menyesatkan / tidak sesuai deskripsi",
  "Menawarkan barang terlarang",
  "Jaminan tidak dikembalikan",
  "Menolak rekomendasi mediasi tanpa alasan",
  "Klaim palsu di sengketa",
];

export function SeverityPicker({ value, onChange }: { value: Severity; onChange: (v: Severity) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <ChoiceCard selected={value === "ringan"} onClick={() => onChange("ringan")} title="Strike ringan (+1)" description="No-show, batal sepihak, telat tanpa kabar." />
      <ChoiceCard selected={value === "berat"} onClick={() => onChange("berat")} title="Strike berat (+2)" description="Klaim palsu, jaminan ditahan, barang terlarang." />
    </div>
  );
}

/** Give a strike to a user (from a report or the user list). */
export function StrikeSheet({
  open,
  onClose,
  adminId,
  user,
  defaultSeverity = "ringan",
  defaultReason,
  bookingId,
}: {
  open: boolean;
  onClose: () => void;
  adminId: ID;
  user?: User;
  defaultSeverity?: Severity;
  defaultReason?: string;
  bookingId?: ID;
}) {
  const addStrike = useAppStore((s) => s.addStrike);
  const [severity, setSeverity] = useState<Severity>(defaultSeverity);
  // Reset the severity whenever the sheet is reopened (ReasonSheet resets the text itself).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSeverity(defaultSeverity);
  }
  if (!user) return null;
  const after = user.strikes + STRIKE_WEIGHT[severity];
  return (
    <ReasonSheet
      open={open}
      onClose={onClose}
      title={`Beri strike ke ${publicName(user)}`}
      description={`${user.name} · sekarang ${user.strikes} strike → jadi ${after} strike.`}
      presets={STRIKE_PRESETS}
      initial={defaultReason}
      confirmLabel="Beri strike"
      help="Pengguna menerima notifikasi berisi alasan ini."
      onConfirm={(reason) => toastResult(addStrike(adminId, user.id, { reason, severity, bookingId }), `Strike ${severity} diberikan ke ${publicName(user)}.`)}
    >
      <SeverityPicker value={severity} onChange={setSeverity} />
      {after >= SUSPEND_HINT_AT && user.status === "aktif" && (
        <p className="rounded-[12px] bg-soft-gray p-3 text-caption text-graphite">
          Setelah ini {publicName(user)} punya {after} strike. Pertimbangkan suspend lewat menu <span className="font-semibold text-ink">Pengguna</span>.
        </p>
      )}
    </ReasonSheet>
  );
}

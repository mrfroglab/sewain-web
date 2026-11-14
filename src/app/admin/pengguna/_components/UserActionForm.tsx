"use client";

import { Ban, PauseCircle, RotateCcw, ShieldAlert } from "lucide-react";
import { Notice } from "@/components/ui/Layout";
import type { User } from "@/lib/types";
import { ReasonFields } from "../../_components/ReasonSheet";
import { STRIKE_PRESETS, STRIKE_WEIGHT, SeverityPicker, type Severity } from "../../_components/StrikeSheet";

export type UserAction = "strike" | "suspend" | "blacklist" | "aktif";

export const ACTION_TITLE: Record<UserAction, string> = {
  strike: "Beri strike",
  suspend: "Tangguhkan akun",
  blacklist: "Blacklist NIK",
  aktif: "Pulihkan akun",
};

const PRESETS: Record<Exclude<UserAction, "strike">, string[]> = {
  suspend: ["Strike berulang (3 atau lebih)", "Menolak rekomendasi mediasi tanpa alasan", "Jaminan penyewa tidak dikembalikan", "Klaim palsu di sengketa"],
  blacklist: ["Barang sewaan tidak dikembalikan (kabur)", "Penipuan: minta transfer lalu menghilang", "Pelanggaran berat berulang setelah suspend"],
  aktif: ["Banding diterima setelah dicek ulang", "Masa penangguhan selesai", "Masalah sudah diselesaikan dengan pihak lain"],
};

/** The form shown inside the user sheet once an L3 action is picked (PRD 11.2). */
export function UserActionForm({
  user,
  action,
  reason,
  onReason,
  severity,
  onSeverity,
}: {
  user: User;
  action: UserAction;
  reason: string;
  onReason: (v: string) => void;
  severity: Severity;
  onSeverity: (v: Severity) => void;
}) {
  const nik = user.verification.nikMasked;
  return (
    <div className="space-y-4">
      {action === "strike" && (
        <>
          <SeverityPicker value={severity} onChange={onSeverity} />
          <Notice icon={<ShieldAlert className="size-4" />}>
            Strike {user.name}: {user.strikes} → <span className="font-semibold text-ink">{user.strikes + STRIKE_WEIGHT[severity]}</span>. Pengguna menerima notifikasi berisi alasan ini, dan strike memengaruhi skor kepercayaannya.
          </Notice>
        </>
      )}

      {action === "suspend" && (
        <Notice icon={<PauseCircle className="size-4" />} title="Akun ditangguhkan sementara">
          {user.name} tidak bisa menyewa atau menyewakan. Semua listing aktifnya dijeda dan hilang dari pencarian. Bisa dipulihkan kapan saja.
        </Notice>
      )}

      {action === "blacklist" && (
        <Notice tone="ink" icon={<Ban className="size-4" />} title="NIK ini tidak bisa daftar lagi">
          {nik && nik !== "-" ? (
            <>
              NIK <span className="font-mono">{nik}</span> diblokir permanen. Karena satu NIK hanya untuk satu akun, pemiliknya tidak bisa membuat akun baru dengan KTP yang sama. Semua listingnya disembunyikan.
            </>
          ) : (
            <>Akun ini belum punya NIK terverifikasi, jadi blokir hanya berlaku untuk akun ini. Semua listingnya disembunyikan.</>
          )}
        </Notice>
      )}

      {action === "aktif" && (
        <Notice icon={<RotateCcw className="size-4" />} title="Akun aktif lagi">
          {user.name} bisa menyewa dan menyewakan lagi. Listing yang dijeda saat sanksi tetap dijeda; pemiliknya bisa mengaktifkan sendiri.
        </Notice>
      )}

      <ReasonFields
        value={reason}
        onChange={onReason}
        presets={action === "strike" ? STRIKE_PRESETS : PRESETS[action]}
        label="Alasan"
        help="Dikirim ke pengguna dan dicatat di log audit."
      />
    </div>
  );
}

"use client";

// L3 shortcuts from the mediator workspace: strike (tied to this booking), suspend, blacklist NIK, restore.

import { publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Booking, ID, User } from "@/lib/types";
import { ReasonSheet } from "../../../_components/ReasonSheet";
import { StrikeSheet } from "../../../_components/StrikeSheet";
import type { SanctionKind } from "./ActionPanel";

type StatusKind = Exclude<SanctionKind, "strike">;

const COPY: Record<StatusKind, { title: string; confirm: string; done: string; presets: string[]; summary: string }> = {
  suspend: {
    title: "Suspend",
    confirm: "Suspend akun",
    done: "ditangguhkan",
    presets: ["Menolak rekomendasi mediasi tanpa alasan", "Mengabaikan panggilan admin", "Strike berulang", "Jaminan tidak dikembalikan setelah rekomendasi"],
    summary: "Akun tidak bisa menyewa atau menyewakan, dan listing aktifnya dijeda sampai dipulihkan.",
  },
  blacklist: {
    title: "Blacklist",
    confirm: "Blacklist NIK",
    done: "diblokir",
    presets: ["Barang tidak dikembalikan (penggelapan)", "Penipuan terbukti", "Klaim palsu berulang", "Dokumen jaminan berharga tidak dikembalikan"],
    summary: "Berbasis NIK: akun ini diblokir dan NIK yang sama tidak bisa membuat akun baru (FR-A3). Listing aktifnya disembunyikan.",
  },
  aktif: {
    title: "Pulihkan",
    confirm: "Pulihkan akun",
    done: "dipulihkan",
    presets: ["Banding diterima", "Masa suspend selesai", "Kewajiban sengketa sudah dijalankan"],
    summary: "Akun kembali aktif. Listing yang dijeda tidak otomatis tayang lagi.",
  },
};

export function SanctionSheets({ kind, user, booking, adminId, onClose }: { kind?: SanctionKind; user?: User; booking: Booking; adminId: ID; onClose: () => void }) {
  const setUserStatus = useAppStore((s) => s.setUserStatus);
  const statusKind = kind && kind !== "strike" ? kind : undefined;
  const copy = statusKind ? COPY[statusKind] : undefined;

  return (
    <>
      <StrikeSheet open={kind === "strike" && !!user} onClose={onClose} adminId={adminId} user={user} bookingId={booking.id} defaultSeverity="ringan" />
      {user && statusKind && copy && (
        <ReasonSheet
          open
          onClose={onClose}
          title={`${copy.title} ${publicName(user)}`}
          description={`${user.name} · ${copy.summary}`}
          presets={copy.presets}
          confirmLabel={copy.confirm}
          help="Pengguna menerima notifikasi berisi alasan ini. Kode booking ditambahkan otomatis ke log audit."
          onConfirm={(reason) => toastResult(setUserStatus(adminId, user.id, statusKind, `${reason} (sengketa ${booking.code})`), `Akun ${publicName(user)} ${copy.done}.`)}
        />
      )}
    </>
  );
}

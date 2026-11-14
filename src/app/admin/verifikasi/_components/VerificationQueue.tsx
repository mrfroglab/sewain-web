"use client";

import { IdCard, Lock } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { EmptyState, Notice } from "@/components/ui/Layout";
import { Tabs } from "@/components/ui/Tabs";
import { publicName } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { VerificationRequest } from "@/lib/types";
import { useAdmin } from "../../_components/AdminContext";
import { AdminTitle } from "../../_components/AdminUi";
import { ReasonSheet } from "../../_components/ReasonSheet";
import { VerificationCard } from "./VerificationCard";

type Tab = VerificationRequest["status"];

const REJECT_PRESETS = [
  "Foto KTP buram atau terpotong",
  "Nama di KTP tidak sama dengan nama profil",
  "Selfie tidak memegang KTP",
  "Wajah di selfie tidak cocok dengan foto KTP",
  "NIK sudah dipakai akun lain",
];

const EMPTY: Record<Tab, { title: string; description: string }> = {
  menunggu: { title: "Antrean kosong", description: "Semua pengajuan sudah ditinjau. Pengajuan yang gagal dicek otomatis akan muncul di sini." },
  disetujui: { title: "Belum ada yang disetujui", description: "Pengajuan yang lolos (otomatis atau manual) tampil di sini." },
  ditolak: { title: "Belum ada yang ditolak", description: "Pengajuan yang kamu tolak tampil di sini beserta alasannya." },
};

/** FR-A2..A4: manual fallback queue for identity verification (prototype: eKYC is simulated). */
export function VerificationQueue() {
  const admin = useAdmin();
  const now = useNow();
  const verifications = useAppStore((s) => s.verifications);
  const users = useAppStore((s) => s.users);
  const reviewVerification = useAppStore((s) => s.reviewVerification);
  const [tab, setTab] = useState<Tab>("menunggu");
  const [rejecting, setRejecting] = useState<VerificationRequest | null>(null);
  // Stable: the Sheet re-focuses itself whenever onClose changes (this page re-renders on the clock tick).
  const closeReject = useCallback(() => setRejecting(null), []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { menunggu: 0, disetujui: 0, ditolak: 0 };
    for (const v of verifications) c[v.status] += 1;
    return c;
  }, [verifications]);

  const list = useMemo(() => {
    const rows = verifications.filter((v) => v.status === tab);
    // Queue = oldest first (fair); history = most recent decision first.
    return tab === "menunggu" ? rows.sort((a, b) => a.submittedAt - b.submittedAt) : rows.sort((a, b) => (b.reviewedAt ?? b.submittedAt) - (a.reviewedAt ?? a.submittedAt));
  }, [verifications, tab]);

  const userOf = (id: string) => users.find((u) => u.id === id);

  const approve = (req: VerificationRequest) => {
    const u = userOf(req.userId);
    toastResult(reviewVerification(admin.id, req.id, true), `${u ? publicName(u) : "Pengguna"} sekarang terverifikasi.`);
  };

  const rejectingUser = rejecting ? userOf(rejecting.userId) : undefined;

  return (
    <>
      <AdminTitle
        title="Verifikasi identitas"
        subtitle="Antrean cadangan untuk KTP + selfie yang perlu dicek manual. Di prototipe, pengecekan otomatis (eKYC) disimulasikan dan langsung disetujui."
      />

      <Tabs
        value={tab}
        onChange={setTab}
        className="-mx-4 px-4 sm:mx-0 sm:px-0"
        items={[
          { value: "menunggu", label: "Menunggu", count: counts.menunggu },
          { value: "disetujui", label: "Disetujui", count: counts.disetujui },
          { value: "ditolak", label: "Ditolak", count: counts.ditolak },
        ]}
      />

      <div className="mt-5 space-y-3">
        {list.length === 0 ? (
          <EmptyState icon={<IdCard className="size-5" />} title={EMPTY[tab].title} description={EMPTY[tab].description} />
        ) : (
          list.map((req) => (
            <VerificationCard
              key={req.id}
              req={req}
              user={userOf(req.userId)}
              reviewer={req.reviewedBy ? userOf(req.reviewedBy) : undefined}
              now={now}
              onApprove={() => approve(req)}
              onReject={() => setRejecting(req)}
            />
          ))
        )}
      </div>

      <Notice icon={<Lock className="size-4" />} className="mt-6">
        Data KTP hanya terlihat oleh admin. Pengguna lain cuma melihat status &ldquo;Terverifikasi&rdquo; dan nama depan. Di produk asli, foto KTP dan selfie disimpan terenkripsi lalu dihapus otomatis setelah ditinjau.
      </Notice>

      <ReasonSheet
        open={!!rejecting}
        onClose={closeReject}
        title={rejecting?.status === "disetujui" ? "Cabut verifikasi" : "Tolak verifikasi"}
        description={
          rejectingUser
            ? `${rejectingUser.name} akan diminta mengulang verifikasi dan belum bisa menyewa atau menyewakan sampai disetujui.`
            : undefined
        }
        presets={REJECT_PRESETS}
        label="Alasan penolakan"
        help="Alasan ini dikirim ke pengguna supaya tahu apa yang harus diperbaiki."
        confirmLabel={rejecting?.status === "disetujui" ? "Cabut verifikasi" : "Tolak"}
        onConfirm={(reason) => (rejecting ? toastResult(reviewVerification(admin.id, rejecting.id, false, reason), "Verifikasi ditolak. Pengguna sudah diberi tahu.") : false)}
      />
    </>
  );
}

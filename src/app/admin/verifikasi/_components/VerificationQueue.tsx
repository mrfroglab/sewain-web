"use client";

import { IdCard, Lock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminKycDecide, adminKycQueue, type KycSubmission } from "@/lib/account";
import { useAppConfig } from "@/lib/config";
import { EmptyState, Notice } from "@/components/ui/Layout";
import { Tabs } from "@/components/ui/Tabs";
import { publicName } from "@/lib/selectors";
import { refreshSnapshot, useAppStore, useNow } from "@/lib/store";
import { toast, toastResult } from "@/lib/toast";
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

const KYC_STATUS: Record<KycSubmission["status"], Tab> = { pending: "menunggu", approved: "disetujui", rejected: "ditolak" };

/**
 * Pair the snapshot's verification requests with server KYC submissions (v2 mirrors every upload as a "manual"
 * request without photos). Submissions without a mirror (not in this snapshot yet) become their own rows.
 */
function withKyc(verifications: VerificationRequest[], subs: KycSubmission[]): { rows: VerificationRequest[]; kycOf: Map<string, KycSubmission> } {
  const kycOf = new Map<string, KycSubmission>();
  const used = new Set<string>();
  for (const v of verifications) {
    if (v.method !== "manual" || v.ktpPhotoId || v.selfiePhotoId) continue;
    let best: KycSubmission | undefined;
    for (const s of subs) {
      if (s.userId !== v.userId || used.has(s.id)) continue;
      if (!best || Math.abs(Date.parse(s.createdAt) - v.submittedAt) < Math.abs(Date.parse(best.createdAt) - v.submittedAt)) best = s;
    }
    if (best) {
      used.add(best.id);
      kycOf.set(v.id, best);
    }
  }
  const rows = verifications.map((v) => {
    const k = kycOf.get(v.id);
    // The server decision is the truth; the snapshot catches up on the next sync.
    return k ? { ...v, status: KYC_STATUS[k.status], reason: k.reason || v.reason } : v;
  });
  for (const s of subs) {
    if (used.has(s.id)) continue;
    const id = `kyc:${s.id}`;
    kycOf.set(id, s);
    rows.push({ id, userId: s.userId, submittedAt: Date.parse(s.createdAt), method: "manual", nameOnKtp: s.nameOnKtp ?? "", nikMasked: s.nikMasked, status: KYC_STATUS[s.status], reason: s.reason || undefined, reviewedAt: s.decidedAt ? Date.parse(s.decidedAt) : undefined, reviewedBy: s.decidedBy, auto: false });
  }
  return { rows, kycOf };
}

/** FR-A2..A4: manual fallback queue for identity verification (prototype: eKYC is simulated). */
export function VerificationQueue() {
  const admin = useAdmin();
  const now = useNow();
  const snapshotVerifications = useAppStore((s) => s.verifications);
  const fromServer = useAppConfig((s) => s.fromServer);
  // v2: KTP + selfie uploads (F6.2). null = endpoint unavailable (v1 server) → snapshot only.
  const [subs, setSubs] = useState<KycSubmission[] | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  const loadKyc = useCallback(
    () => (fromServer ? adminKycQueue("all").then((r) => setSubs(r.body.ok ? r.body.submissions ?? [] : null)) : Promise.resolve()),
    [fromServer],
  );
  // Reload when the snapshot's request count changes (a new upload or decision arrived over the change feed).
  const requestCount = snapshotVerifications.length;
  useEffect(() => {
    if (!fromServer) return;
    let live = true;
    adminKycQueue("all").then((r) => live && setSubs(r.body.ok ? r.body.submissions ?? [] : null));
    return () => {
      live = false;
    };
  }, [fromServer, requestCount]);
  const { rows: verifications, kycOf } = useMemo(() => withKyc(snapshotVerifications, subs ?? []), [snapshotVerifications, subs]);
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

  /** Server KYC: one decision path, audited on the server (POST /admin/kyc/{id}/decision). */
  const decideKyc = async (sub: KycSubmission, approveIt: boolean, reason: string, name: string) => {
    setDeciding(sub.id);
    const r = await adminKycDecide(sub.id, approveIt ? "approve" : "reject", reason);
    setDeciding(null);
    if (!r.body.ok) {
      toast(r.body.error ?? "Gagal menyimpan keputusan.", "error");
      return false;
    }
    toast(approveIt ? `${name} sekarang terverifikasi.` : "Verifikasi ditolak. Pengguna sudah diberi tahu.", "success");
    await Promise.all([loadKyc(), refreshSnapshot()]);
    return true;
  };

  const approve = (req: VerificationRequest) => {
    const u = userOf(req.userId);
    const sub = kycOf.get(req.id);
    if (sub) return void decideKyc(sub, true, "", u ? publicName(u) : "Pengguna");
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
              kyc={kycOf.get(req.id)}
              busy={!!kycOf.get(req.id) && deciding === kycOf.get(req.id)?.id}
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
        onConfirm={(reason) => {
          if (!rejecting) return false;
          const sub = kycOf.get(rejecting.id);
          if (sub) {
            void decideKyc(sub, false, reason, "");
            return true;
          }
          return toastResult(reviewVerification(admin.id, rejecting.id, false, reason), "Verifikasi ditolak. Pengguna sudah diberi tahu.");
        }}
      />
    </>
  );
}

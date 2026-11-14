"use client";

import { CircleCheck, Landmark } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Layout";
import { formatDateTime, rupiah } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import type { Dispute, ID, User } from "@/lib/types";
import { chipClass } from "../../../_components/AdminUi";
import type { MediatorLayer } from "../../_components/layers";
import { USER_STATUS_LABEL } from "./PartyCards";

export type SanctionKind = "strike" | "suspend" | "blacklist" | "aktif";

const D = 86_400_000;

/** Recommendation + outcome as recorded on the case (shown in the panel, and inline on smaller screens). */
export function DecisionCards({ dispute }: { dispute: Dispute }) {
  const r = dispute.recommendation;
  if (!r && !dispute.outcome) return null;
  return (
    <div className="space-y-3">
      {dispute.outcome && (
        <div className="rounded-[12px] border border-ink p-3.5">
          <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.06em] text-ink">
            <CircleCheck className="size-3.5" /> Hasil akhir
          </p>
          <p className="mt-1.5 text-body-sm text-graphite">{dispute.outcome}</p>
          {dispute.resolvedAt && <p className="mt-1.5 text-micro text-smoke">Ditutup {formatDateTime(dispute.resolvedAt)}</p>}
        </div>
      )}
      {r && (
        <div className="rounded-[12px] bg-ink p-3.5 text-white">
          <p className="text-caption font-semibold uppercase tracking-[0.06em] text-white/70">Rekomendasi tertulis</p>
          <p className="mt-1.5 text-body-sm">{r.text}</p>
          {r.amount != null && r.amount > 0 && <p className="mt-1.5 text-body-lg font-semibold">{rupiah(r.amount)}</p>}
          <p className="mt-1.5 text-micro text-white/70">Dikirim {formatDateTime(r.at)} · tercatat di profil kedua pihak</p>
        </div>
      )}
    </div>
  );
}

export function ActionPanel({
  dispute,
  renter,
  provider,
  layer,
  now,
  onRecommend,
  onResolve,
  onSanction,
}: {
  dispute: Dispute;
  renter?: User;
  provider?: User;
  layer: MediatorLayer;
  now: number;
  onRecommend: () => void;
  onResolve: () => void;
  onSanction: (kind: SanctionKind, userId: ID) => void;
}) {
  const closed = dispute.status === "selesai";
  const rec = dispute.recommendation;
  const day = Math.max(1, Math.ceil((now - dispute.createdAt) / D));
  const status = closed
    ? `Selesai di ${layer}.`
    : dispute.status === "negosiasi"
      ? "Masih negosiasi L1. Rekomendasi admin langsung menaikkan kasus ke L2."
      : rec
        ? "Rekomendasi terkirim. Tutup sengketa setelah kedua pihak menjalankannya."
        : `Menunggu rekomendasi · hari ke-${day} (target ≤ 5 hari kerja).`;

  return (
    <div className="space-y-4">
      <section className="rounded-card border border-border-gray p-4">
        <p className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">Mediasi admin · L2</p>
        <p className="mt-1 text-body-sm font-semibold text-ink">{status}</p>
        <div className="mt-3">
          <DecisionCards dispute={dispute} />
        </div>
        {!closed && (
          <div className="mt-4 grid grid-cols-1 gap-2">
            <Button block variant={rec ? "secondary" : "primary"} onClick={onRecommend}>
              {rec ? "Ubah rekomendasi" : "Tulis rekomendasi"}
            </Button>
            <Button block variant={rec ? "primary" : "secondary"} onClick={onResolve}>
              Tutup sengketa
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-card border border-border-gray p-4">
        <p className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">Konsekuensi platform · L3</p>
        <p className="mt-1 text-caption text-smoke">Untuk yang menolak rekomendasi tanpa alasan, mengabaikan panggilan admin, atau terbukti curang. Strike → suspend → blacklist NIK.</p>
        <div className="mt-2 divide-y divide-border-gray">
          {renter && <PartyRow user={renter} side="Penyewa" onSanction={onSanction} />}
          {provider && <PartyRow user={provider} side="Penyedia" onSanction={onSanction} />}
        </div>
      </section>

      <Notice icon={<Landmark className="size-4" />} title="L4 · Jalur eksternal">
        Gugatan perdata atau laporan pidana (mis. penggelapan) berjalan di luar platform. Sewain menyerahkan data bukti (foto + hash, chat, kesepakatan, identitas terverifikasi) hanya atas permintaan resmi aparat dan sesuai hukum yang berlaku.
      </Notice>
    </div>
  );
}

function PartyRow({ user, side, onSanction }: { user: User; side: string; onSanction: (kind: SanctionKind, userId: ID) => void }) {
  return (
    <div className="py-3">
      <div className="flex items-center gap-2.5">
        <Avatar name={publicName(user)} size={30} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-semibold text-ink">
            {publicName(user)} <span className="font-normal text-smoke">· {side.toLowerCase()}</span>
          </p>
          <p className="text-caption text-smoke">
            {USER_STATUS_LABEL[user.status]} · {user.strikes} strike
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" className={chipClass()} onClick={() => onSanction("strike", user.id)}>
          Strike
        </button>
        {user.status === "aktif" && (
          <button type="button" className={chipClass()} onClick={() => onSanction("suspend", user.id)}>
            Suspend
          </button>
        )}
        {user.status !== "blacklist" && (
          <button type="button" className={chipClass()} onClick={() => onSanction("blacklist", user.id)}>
            Blacklist
          </button>
        )}
        {user.status !== "aktif" && (
          <button type="button" className={chipClass()} onClick={() => onSanction("aktif", user.id)}>
            Pulihkan
          </button>
        )}
      </div>
    </div>
  );
}

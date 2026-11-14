"use client";

import { Handshake, Scale, Timer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useAppStore, useNow } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Dispute } from "@/lib/types";
import type { BookingCtx } from "../../serah-terima/_shared/BookingFrame";
import { ProposalList } from "./ProposalList";
import { ProposalSheet } from "./ProposalSheet";

/** L1: 48h countdown, proposals, "Ajukan solusi", "Naikkan ke admin". */
export function Negotiation({ ctx, dispute }: { ctx: BookingCtx; dispute: Dispute }) {
  const { user, readOnly } = ctx;
  const now = useNow(15_000);
  const escalateDispute = useAppStore((s) => s.escalateDispute);
  const [sheet, setSheet] = useState<"propose" | "escalate" | null>(null);
  const left = dispute.l1Deadline - now;
  const total = dispute.l1Deadline - dispute.createdAt;
  const pct = Math.max(0, Math.min(100, (left / total) * 100));

  const escalate = () => {
    if (toastResult(escalateDispute(user.id, dispute.id), "Sengketa dinaikkan ke mediasi admin.")) setSheet(null);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-border-gray p-4 sm:p-5">
        <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.06em] text-smoke">
          <Timer className="size-3.5" /> Sisa waktu negosiasi
        </p>
        <p className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink" aria-live="polite">
          {left > 0 ? formatDuration(left) : "Waktu habis"}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-soft-gray" aria-hidden>
          <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-caption text-smoke">
          {left > 0
            ? `Batas ${formatDateTime(dispute.l1Deadline)}. Lewat dari itu tanpa kesepakatan, sengketa otomatis naik ke mediasi admin.`
            : "Sebentar lagi sistem menaikkan sengketa ini ke mediasi admin."}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-body-lg font-semibold text-ink">Usulan solusi</h2>
        <ProposalList ctx={ctx} dispute={dispute} />
      </div>

      {!readOnly && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" onClick={() => setSheet("propose")}>
            <Handshake className="size-4" /> Ajukan solusi
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setSheet("escalate")}>
            <Scale className="size-4" /> Naikkan ke admin
          </Button>
        </div>
      )}

      {sheet === "propose" && <ProposalSheet ctx={ctx} dispute={dispute} onClose={() => setSheet(null)} />}
      {sheet === "escalate" && (
        <Sheet
          open
          onClose={() => setSheet(null)}
          title="Naikkan ke mediasi admin?"
          description="Negosiasi ditutup. Admin menilai foto, chat, jaminan, dan kesepakatan, lalu memberi rekomendasi tertulis (target ≤ 5 hari kerja)."
          size="sm"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setSheet(null)}>
                Lanjut negosiasi
              </Button>
              <Button onClick={escalate}>Naikkan ke admin</Button>
            </div>
          }
        >
          <p className="text-body-sm text-graphite">
            Sebelum naik, pastikan semua bukti sudah ada di Sewain: foto, nota atau estimasi perbaikan, dan penjelasanmu di chat. Bukti di luar Sewain tidak bisa dipakai mediator.
          </p>
        </Sheet>
      )}
    </section>
  );
}

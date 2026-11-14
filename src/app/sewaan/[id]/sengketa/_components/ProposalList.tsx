"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { relativeTime, rupiah } from "@/lib/format";
import { useAppStore, useNow } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Dispute, DisputeProposal } from "@/lib/types";
import { partyName, type BookingCtx } from "../../serah-terima/_shared/BookingFrame";
import { PROPOSAL_INFO } from "./cases";

const STATUS: Record<DisputeProposal["status"], { label: string; tone: "outline" | "ink" | "soft" }> = {
  diajukan: { label: "Menunggu respons", tone: "outline" },
  diterima: { label: "Diterima", tone: "ink" },
  ditolak: { label: "Ditolak", tone: "soft" },
};

/** L1 proposals. The other party can accept (→ RESOLVED) or reject. */
export function ProposalList({ ctx, dispute, interactive = true }: { ctx: BookingCtx; dispute: Dispute; interactive?: boolean }) {
  const { user, booking, readOnly } = ctx;
  const now = useNow();
  const respondProposal = useAppStore((s) => s.respondProposal);
  const [confirm, setConfirm] = useState<DisputeProposal | null>(null);
  const items = [...dispute.proposals].sort((a, b) => b.at - a.at);
  const roleOf = (id: string) => (id === booking.providerId ? "penyedia" : id === booking.renterId ? "penyewa" : "");

  const reject = (p: DisputeProposal) => toastResult(respondProposal(user.id, dispute.id, p.id, false), "Usulan ditolak. Ajukan usulan lain atau naikkan ke admin.");
  const accept = (p: DisputeProposal) => {
    if (toastResult(respondProposal(user.id, dispute.id, p.id, true), "Usulan diterima. Sengketa selesai.")) setConfirm(null);
  };

  if (!items.length) return <p className="rounded-[12px] border border-dashed border-border-gray p-4 text-body-sm text-smoke">Belum ada usulan solusi. Mulai dengan usulan yang masuk akal sesuai panduan.</p>;

  return (
    <>
      <ul className="space-y-3">
        {items.map((p) => {
          const info = PROPOSAL_INFO[p.type];
          const mine = p.byId === user.id;
          const canRespond = interactive && !readOnly && !mine && p.status === "diajukan" && dispute.status === "negosiasi";
          const by = partyName(ctx, p.byId);
          return (
            <li key={p.id} className="rounded-card border border-border-gray p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-ink">{info.label}</p>
                  {p.amount != null && p.amount > 0 && <p className="mt-0.5 text-body-lg font-semibold text-ink">{rupiah(p.amount)}</p>}
                  <p className="mt-0.5 text-caption text-smoke">
                    {mine ? "Usulanmu" : `Dari ${by}${roleOf(p.byId) ? ` (${roleOf(p.byId)})` : ""}`} · {relativeTime(p.at, now)}
                  </p>
                </div>
                <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
              </div>
              {p.note && <p className="mt-3 border-l-2 border-border-gray pl-3 text-body-sm text-graphite">{p.note}</p>}
              {canRespond && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
                  <Button size="md" onClick={() => setConfirm(p)}>
                    Terima
                  </Button>
                  <Button size="md" variant="secondary" onClick={() => reject(p)}>
                    Tolak
                  </Button>
                </div>
              )}
              {interactive && mine && p.status === "diajukan" && <p className="mt-3 text-caption text-smoke">Menunggu respons pihak lain.</p>}
            </li>
          );
        })}
      </ul>

      {confirm && (
        <Sheet
          open
          onClose={() => setConfirm(null)}
          title="Terima usulan ini?"
          description="Sengketa langsung selesai dengan hasil ini, dan tercatat sebagai kesepakatan kedua pihak."
          size="sm"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Batal
              </Button>
              <Button onClick={() => accept(confirm)}>Ya, terima</Button>
            </div>
          }
        >
          <div className="rounded-[12px] bg-soft-gray p-4">
            <p className="text-body-sm font-semibold text-ink">{PROPOSAL_INFO[confirm.type].label}</p>
            {!!confirm.amount && <p className="mt-1 text-body-lg font-semibold text-ink">{rupiah(confirm.amount)}</p>}
            {confirm.note && <p className="mt-1 text-body-sm text-graphite">{confirm.note}</p>}
          </div>
        </Sheet>
      )}
    </>
  );
}

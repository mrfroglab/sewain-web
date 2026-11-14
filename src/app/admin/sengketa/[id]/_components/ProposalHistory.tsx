"use client";

import { Badge } from "@/components/ui/Badge";
import { formatDateTime, rupiah } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import type { Booking, Dispute, User } from "@/lib/types";
import { AdminSection } from "../../../_components/AdminUi";
import { PROPOSAL_LABEL, PROPOSAL_STATUS } from "../../_components/cases";
import { EmptyNote } from "./EvidenceTile";

/** L1 negotiation history, oldest first (read-only for the mediator). */
export function ProposalHistory({ dispute, booking, renter, provider }: { dispute: Dispute; booking: Booking; renter?: User; provider?: User }) {
  const items = [...dispute.proposals].sort((a, b) => a.at - b.at);
  const who = (id: string) => (id === booking.providerId ? `${publicName(provider)} (penyedia)` : id === booking.renterId ? `${publicName(renter)} (penyewa)` : "Pengguna");

  return (
    <AdminSection title="Riwayat negosiasi (L1)" description="Usulan solusi antar pengguna sebelum sampai ke admin.">
      {items.length === 0 ? (
        <EmptyNote>Belum ada usulan solusi di L1.</EmptyNote>
      ) : (
        <ol className="space-y-3">
          {items.map((p) => (
            <li key={p.id} className="rounded-card border border-border-gray p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-ink">
                    {PROPOSAL_LABEL[p.type]}
                    {p.amount ? <span className="ml-1.5">{rupiah(p.amount)}</span> : null}
                  </p>
                  <p className="mt-0.5 text-caption text-smoke">
                    {who(p.byId)} · {formatDateTime(p.at)}
                  </p>
                </div>
                <Badge tone={PROPOSAL_STATUS[p.status].tone}>{PROPOSAL_STATUS[p.status].label}</Badge>
              </div>
              {p.note && <p className="mt-2.5 border-l-2 border-border-gray pl-3 text-body-sm text-graphite">{p.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </AdminSection>
  );
}

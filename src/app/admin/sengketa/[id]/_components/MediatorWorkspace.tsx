"use client";

// Mediator workspace (PRD 9.8, 11): everything the admin needs to judge a case on one page —
// case summary + guidance, the side-by-side evidence board, the agreement snapshot, chat, L1 history,
// both parties' reputation — and the L2/L3 actions.

import { ArrowLeft, Scale } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/Layout";
import { endOfDay, rupiah } from "@/lib/format";
import { collateralValue, depositCash } from "@/lib/pricing";
import { publicName } from "@/lib/selectors";
import { useCurrentUser } from "@/lib/session";
import { useAppStore, useNow } from "@/lib/store";
import type { Booking, CollateralOption, Dispute, ID, User } from "@/lib/types";
import { AdminTitle } from "../../../_components/AdminUi";
import { CASE_GUIDE, type TemplateFacts } from "../../_components/cases";
import { disputeLayer, hasSanction } from "../../_components/layers";
import { ActionPanel, DecisionCards, type SanctionKind } from "./ActionPanel";
import { AgreementSnapshot } from "./AgreementSnapshot";
import { CaseSummary } from "./CaseSummary";
import { ChatHistory } from "./ChatHistory";
import { EvidenceBoard } from "./EvidenceBoard";
import { RecommendSheet, ResolveSheet } from "./MediationSheets";
import { PartyCards } from "./PartyCards";
import { ProposalHistory } from "./ProposalHistory";
import { SanctionSheets } from "./SanctionSheets";

const D = 86_400_000;

/** Short collateral phrase for template sentences, e.g. "titipan KTM/SIM + deposit Rp1.000.000". */
function collateralPhrase(opt: CollateralOption, itemValue: number): string {
  const cards = `titipan ${opt.cards?.length ? opt.cards.join("/") : "kartu identitas"}`;
  switch (opt.kind) {
    case "identitas":
      return cards;
    case "deposit":
      return `${opt.withIdentity ? `${cards} + ` : ""}deposit ${rupiah(collateralValue(opt, itemValue))}`;
    case "barang":
      return `titipan ${opt.description ?? "barang lain"}`;
    case "custom":
      return opt.description ?? "jaminan khusus";
  }
}

function templateFacts(booking: Booking, dispute: Dispute, renter: User | undefined, provider: User | undefined, now: number): TemplateFacts {
  const a = booking.agreement;
  const due = endOfDay(booking.endDate);
  const back = booking.returnedAt ?? now;
  const proposed = [...dispute.proposals].reverse().find((p) => p.amount)?.amount;
  return {
    renter: publicName(renter),
    provider: publicName(provider),
    deposit: depositCash(a.collateral, a.itemValue),
    collateral: collateralPhrase(a.collateral, a.itemValue),
    itemValue: a.itemValue,
    lateFeePerDay: a.lateFeePerDay,
    lateFeeCap: a.lateFeeCap,
    daysLate: back > due ? Math.ceil((back - due) / D) : 0,
    proposedAmount: proposed,
  };
}

export function MediatorWorkspace({ id }: { id: string }) {
  const admin = useCurrentUser();
  const adminId = admin?.id ?? "";
  const now = useNow();
  const dispute = useAppStore((s) => s.disputes.find((d) => d.id === id));
  const booking = useAppStore((s) => (dispute ? s.bookings.find((b) => b.id === dispute.bookingId) : undefined));
  const listing = useAppStore((s) => (booking ? s.listings.find((l) => l.id === booking.listingId) : undefined));
  const renter = useAppStore((s) => (booking ? s.users.find((u) => u.id === booking.renterId) : undefined));
  const provider = useAppStore((s) => (booking ? s.users.find((u) => u.id === booking.providerId) : undefined));
  const strikes = useAppStore((s) => s.strikes);
  const [sheet, setSheet] = useState<"recommend" | "resolve" | null>(null);
  const [sanction, setSanction] = useState<{ kind: SanctionKind; userId: ID } | null>(null);

  if (!dispute || !booking)
    return (
      <EmptyState
        icon={<Scale className="size-5" />}
        title="Sengketa tidak ditemukan"
        description="Mungkin data demo sudah direset. Kembali ke antrean untuk memilih kasus lain."
        action={<ButtonLink href="/admin/sengketa">Ke antrean sengketa</ButtonLink>}
      />
    );

  const layer = disputeLayer(dispute, hasSanction(dispute, strikes));
  const open = dispute.status !== "selesai";
  const rec = !!dispute.recommendation;
  const sanctionUser = sanction ? [renter, provider].find((u) => u?.id === sanction.userId) : undefined;
  const closeSheet = () => setSheet(null);

  return (
    <div>
      <Link href="/admin/sengketa" className="-ml-1 mb-2 inline-flex h-9 items-center gap-1.5 rounded-control px-1 text-nav font-medium text-graphite hover:text-ink">
        <ArrowLeft className="size-4" /> Antrean sengketa
      </Link>
      <AdminTitle
        title={CASE_GUIDE[dispute.caseType].label}
        subtitle={`${booking.code} · ${booking.agreement.listingTitle}`}
        actions={
          <ButtonLink href={`/sewaan/${booking.id}/sengketa`} variant="secondary">
            Lihat sisi pengguna
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-10">
        <div className="min-w-0 space-y-12">
          <CaseSummary dispute={dispute} booking={booking} renter={renter} provider={provider} layer={layer} />
          <div className="xl:hidden">
            <DecisionCards dispute={dispute} />
          </div>
          <EvidenceBoard booking={booking} dispute={dispute} listing={listing} />
          <ProposalHistory dispute={dispute} booking={booking} renter={renter} provider={provider} />
          <AgreementSnapshot booking={booking} />
          <ChatHistory booking={booking} renter={renter} provider={provider} />
          <PartyCards renter={renter} provider={provider} />
        </div>

        <aside id="tindakan" aria-label="Tindakan mediator" className="xl:sticky xl:top-[132px] xl:max-h-[calc(100dvh-148px)] xl:self-start xl:overflow-y-auto">
          <ActionPanel
            dispute={dispute}
            renter={renter}
            provider={provider}
            layer={layer}
            now={now}
            onRecommend={() => setSheet("recommend")}
            onResolve={() => setSheet("resolve")}
            onSanction={(kind, userId) => setSanction({ kind, userId })}
          />
        </aside>
      </div>

      {open && <MobileActionBar recommended={rec} onRecommend={() => setSheet("recommend")} onResolve={() => setSheet("resolve")} />}

      {sheet === "recommend" && <RecommendSheet dispute={dispute} adminId={adminId} facts={templateFacts(booking, dispute, renter, provider, now)} onClose={closeSheet} />}
      {sheet === "resolve" && <ResolveSheet dispute={dispute} adminId={adminId} onClose={closeSheet} />}
      <SanctionSheets kind={sanction?.kind} user={sanctionUser} booking={booking} adminId={adminId} onClose={() => setSanction(null)} />
    </div>
  );
}

/** Phones/tablets: the two L2 actions stay within thumb reach above the tab bar (the panel itself is at the end). */
function MobileActionBar({ recommended, onRecommend, onResolve }: { recommended: boolean; onRecommend: () => void; onResolve: () => void }) {
  const btn = (primary: boolean) =>
    cn(
      "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-control px-3.5 text-[13px] font-semibold transition-colors",
      primary ? "bg-ink text-white hover:bg-graphite" : "border border-border-gray bg-white text-ink hover:border-ink",
    );
  return (
    <>
      <div className="h-16 xl:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-[540] border-t border-border-gray bg-white/95 backdrop-blur lg:bottom-0 xl:hidden">
        <div className="flex h-16 items-center justify-end gap-2 pl-[116px] pr-4 sm:pr-6">
          <button type="button" className={btn(!recommended)} onClick={onRecommend}>
            Rekomendasi
          </button>
          <button type="button" className={btn(recommended)} onClick={onResolve}>
            Tutup kasus
          </button>
        </div>
      </div>
    </>
  );
}

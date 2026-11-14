"use client";

import { BookOpenCheck, Check, Hourglass } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { categoryName } from "@/lib/data/categories";
import { formatDateRange, formatDateTime, formatDuration, relativeTime } from "@/lib/format";
import { STATUS_LABEL, publicName } from "@/lib/selectors";
import { useNow } from "@/lib/store";
import type { Booking, Dispute, User } from "@/lib/types";
import { CASE_GUIDE, DISPUTE_STATUS_LABEL } from "../../_components/cases";
import { MEDIATOR_LAYERS, type MediatorLayer } from "../../_components/layers";

export function CaseSummary({ dispute, booking, renter, provider, layer }: { dispute: Dispute; booking: Booking; renter?: User; provider?: User; layer: MediatorLayer }) {
  const now = useNow();
  const guide = CASE_GUIDE[dispute.caseType];
  const openerRole = dispute.openedBy === booking.providerId ? "penyedia" : "penyewa";
  const opener = dispute.openedBy === booking.providerId ? provider : renter;
  const left = dispute.l1Deadline - now;
  const a = booking.agreement;

  return (
    <section className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={dispute.status === "mediasi" ? "ink" : dispute.status === "negosiasi" ? "outline" : "soft"}>{DISPUTE_STATUS_LABEL[dispute.status]}</Badge>
          <Badge tone="outline">{dispute.status === "selesai" ? `Selesai di ${layer}` : `Lapis ${layer}`}</Badge>
          <span className="text-caption text-smoke">
            Dibuka {publicName(opener)} ({openerRole}) · {relativeTime(dispute.createdAt, now)}
          </span>
        </div>
        <blockquote className="mt-3 border-l-2 border-ink pl-3 text-body text-graphite">{dispute.description}</blockquote>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-sm sm:grid-cols-3">
        <Fact k="Barang" v={a.listingTitle} sub={categoryName(a.category)} />
        <Fact k="Pihak" v={`${publicName(renter)} vs ${publicName(provider)}`} sub="penyewa vs penyedia" />
        <Fact k="Periode sewa" v={formatDateRange(a.startDate, a.endDate)} sub={`${a.quote.days} hari`} />
        <Fact k="Status booking" v={STATUS_LABEL[booking.status]} sub={booking.overdue ? "Ditandai telat" : booking.code} />
        <Fact
          k="Batas negosiasi L1"
          v={
            dispute.status === "negosiasi" && left > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Hourglass className="size-3.5" /> sisa {formatDuration(left)}
              </span>
            ) : (
              formatDateTime(dispute.l1Deadline)
            )
          }
          sub={dispute.status === "negosiasi" ? "Lewat batas → otomatis naik ke L2" : left > 0 ? "Dinaikkan sebelum batas" : "Sudah lewat"}
        />
        <Fact k="Usulan L1" v={`${dispute.proposals.length} usulan`} sub={dispute.proposals.some((p) => p.status === "diterima") ? "Ada yang diterima" : "Belum ada kesepakatan"} />
      </dl>

      <LayerSteps current={layer} done={dispute.status === "selesai"} />

      <div className="rounded-card bg-soft-gray p-4 sm:p-5">
        <p className="flex items-center gap-2 text-body-sm font-semibold text-ink">
          <BookOpenCheck className="size-4" /> Panduan putusan: {guide.label}
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div>
            <dt className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">Bukti kunci</dt>
            <dd className="mt-0.5 text-body-sm text-graphite">{guide.evidence}</dd>
          </div>
          <div>
            <dt className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">Rekomendasi default</dt>
            <dd className="mt-0.5 text-body-sm text-graphite">{guide.hint}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function Fact({ k, v, sub }: { k: string; v: ReactNode; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-smoke">{k}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
      {sub && <dd className="truncate text-caption text-smoke">{sub}</dd>}
    </div>
  );
}

/** L1 → L2 → L3 (PRD 11.2). The current layer is black; past layers get a check. */
function LayerSteps({ current, done }: { current: MediatorLayer; done: boolean }) {
  const idx = MEDIATOR_LAYERS.findIndex((l) => l.id === current);
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Lapisan penyelesaian sengketa">
      {MEDIATOR_LAYERS.map((l, i) => {
        const state = i === idx ? "current" : i < idx ? "past" : "future";
        return (
          <li
            key={l.id}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "min-w-0 rounded-[12px] p-2.5 sm:p-3",
              state === "current" && "bg-ink text-white",
              state === "past" && "border border-border-gray bg-white",
              state === "future" && "bg-soft-gray",
            )}
          >
            <span className="flex items-center justify-between gap-1">
              <span className={cn("text-micro font-semibold uppercase tracking-[0.08em]", state === "current" ? "text-white/70" : "text-smoke")}>{l.id}</span>
              {(state === "past" || (state === "current" && done)) && <Check className={cn("size-3.5", state === "current" ? "text-white" : "text-ink")} strokeWidth={3} />}
            </span>
            <span className={cn("mt-1 block text-body-sm font-semibold leading-tight", state === "future" ? "text-graphite" : state === "current" ? "text-white" : "text-ink")}>{l.title}</span>
            <span className={cn("mt-0.5 block text-caption leading-snug", state === "current" ? "text-white/75" : "text-smoke")}>{l.detail}</span>
          </li>
        );
      })}
    </ol>
  );
}

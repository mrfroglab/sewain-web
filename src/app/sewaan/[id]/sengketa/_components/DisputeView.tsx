"use client";

import { ArrowRight, CircleCheck, Hourglass, Scale } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { formatDateTime, relativeTime, rupiah } from "@/lib/format";
import { useNow } from "@/lib/store";
import type { Dispute } from "@/lib/types";
import { partyName, type BookingCtx } from "../../serah-terima/_shared/BookingFrame";
import { CASE_INFO, DISPUTE_STATUS_LABEL } from "./cases";
import { EvidenceBoard } from "./EvidenceBoard";
import { LayerStepper } from "./LayerStepper";
import { Negotiation } from "./Negotiation";
import { Principles } from "./Principles";
import { ProposalList } from "./ProposalList";

export function DisputeView({ ctx, dispute }: { ctx: BookingCtx; dispute: Dispute }) {
  const now = useNow();
  const info = CASE_INFO[dispute.caseType];

  return (
    <div className="space-y-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <div className="min-w-0 space-y-10">
          <section>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={dispute.status === "selesai" ? "soft" : "ink"}>{DISPUTE_STATUS_LABEL[dispute.status]}</Badge>
              <span className="text-caption text-smoke">
                {dispute.openedBy === ctx.user.id
                  ? "Kamu melaporkan"
                  : `Dilaporkan ${partyName(ctx, dispute.openedBy)} (${dispute.openedBy === ctx.booking.providerId ? "penyedia" : "penyewa"})`}{" "}
                · {relativeTime(dispute.createdAt, now)}
              </span>
            </div>
            <h2 className="mt-2 text-[20px] font-semibold leading-tight tracking-[-0.4px] text-ink">{info.label}</h2>
            <p className="mt-2 text-body text-graphite">{dispute.description}</p>
            <dl className="mt-4 grid gap-3 rounded-card bg-soft-gray p-4 sm:grid-cols-2">
              <div>
                <dt className="text-caption font-semibold text-ink">Bukti kunci</dt>
                <dd className="mt-0.5 text-caption text-graphite">{info.evidence}</dd>
              </div>
              <div>
                <dt className="text-caption font-semibold text-ink">Panduan default Sewain</dt>
                <dd className="mt-0.5 text-caption text-graphite">{info.hint}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="mb-3 text-body-lg font-semibold text-ink">Lima lapis penyelesaian</h2>
            <LayerStepper dispute={dispute} />
          </section>

          {dispute.status === "negosiasi" && <Negotiation ctx={ctx} dispute={dispute} />}
          {dispute.status === "mediasi" && <Mediation ctx={ctx} dispute={dispute} />}
          {dispute.status === "selesai" && <Outcome ctx={ctx} dispute={dispute} />}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {ctx.role === "admin" && (
            <ButtonLink href={`/admin/sengketa/${dispute.id}`} block>
              Buka di panel admin <ArrowRight className="size-4" />
            </ButtonLink>
          )}
          <Principles />
        </aside>
      </div>

      <EvidenceBoard ctx={ctx} dispute={dispute} />
    </div>
  );
}

function Recommendation({ dispute }: { dispute: Dispute }) {
  const r = dispute.recommendation;
  if (!r) return null;
  return (
    <div className="rounded-card bg-ink p-4 text-white sm:p-5">
      <p className="text-caption font-semibold uppercase tracking-[0.06em] text-white/70">Rekomendasi tertulis admin</p>
      <p className="mt-2 text-body text-white">{r.text}</p>
      {r.amount != null && <p className="mt-2 text-body-lg font-semibold">{rupiah(r.amount)}</p>}
      <p className="mt-3 text-caption text-white/70">Dikeluarkan {formatDateTime(r.at)} · tercatat di profil kedua pihak.</p>
    </div>
  );
}

function Mediation({ ctx, dispute }: { ctx: BookingCtx; dispute: Dispute }) {
  return (
    <section className="space-y-6">
      {dispute.recommendation ? (
        <>
          <Recommendation dispute={dispute} />
          <p className="text-body-sm text-graphite">
            Jalankan rekomendasi ini (mis. potong atau kembalikan deposit), lalu admin menutup sengketa. Menolak tanpa alasan, mengabaikan admin, atau terbukti curang bisa berujung strike, suspend, sampai blacklist NIK (L3).
          </p>
        </>
      ) : (
        <div className="flex gap-4 rounded-card border border-border-gray p-4 sm:p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white">
            <Hourglass className="size-5" />
          </span>
          <div>
            <h2 className="text-body-lg font-semibold text-ink">Admin sedang meninjau bukti</h2>
            <p className="mt-1 text-body-sm text-graphite">
              Admin membandingkan foto referensi, check-out, dan check-in, membaca chat, lalu memberi rekomendasi tertulis (target ≤ 5 hari kerja). Tambahkan penjelasan atau nota perbaikan lewat chat sewa.
            </p>
          </div>
        </div>
      )}
      {dispute.proposals.length > 0 && (
        <div>
          <h3 className="mb-3 text-body-sm font-semibold text-ink">Riwayat negosiasi (L1)</h3>
          <ProposalList ctx={ctx} dispute={dispute} interactive={false} />
        </div>
      )}
    </section>
  );
}

function Outcome({ ctx, dispute }: { ctx: BookingCtx; dispute: Dispute }) {
  const { booking } = ctx;
  return (
    <section className="space-y-6">
      <div className="rounded-card border border-ink p-4 sm:p-5">
        <p className="flex items-center gap-2 text-body-lg font-semibold text-ink">
          <CircleCheck className="size-5" /> Sengketa selesai
        </p>
        <p className="mt-2 text-body text-graphite">{dispute.outcome ?? "Sengketa ditutup."}</p>
        {dispute.resolvedAt && <p className="mt-2 text-caption text-smoke">Ditutup {formatDateTime(dispute.resolvedAt)}</p>}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <ButtonLink href={`/sewaan/${booking.id}`}>
            Ke detail sewaan <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
        <p className="mt-3 flex items-start gap-2 text-caption text-smoke">
          <Scale className="mt-0.5 size-3.5 shrink-0" />
          Langkah berikutnya: kembalikan jaminan atau sisa deposit sesuai hasil ini, lalu saling memberi rating.
        </p>
      </div>
      <Recommendation dispute={dispute} />
      {dispute.proposals.length > 0 && (
        <div>
          <h3 className="mb-3 text-body-sm font-semibold text-ink">Riwayat negosiasi</h3>
          <ProposalList ctx={ctx} dispute={dispute} interactive={false} />
        </div>
      )}
    </section>
  );
}

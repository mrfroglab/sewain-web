"use client";

import { Scale } from "lucide-react";
import { KV, Notice } from "@/components/ui/Layout";
import { formatDateTime, rupiah } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import { ActionButtons, ActionHead, Countdown, CtaLink } from "./ActionBits";
import { DISPUTE_CASE_LABEL, LAYER_LABEL, type BookingView } from "./shared";

/** Dispute layer + status block (DISPUTED), or the outcome (RESOLVED, `compact`). */
export function DisputeSummary({ view, compact }: { view: BookingView; compact?: boolean }) {
  const { b, dispute: d, role, user, now, renter, provider } = view;
  if (!d)
    return compact ? null : (
      <ActionHead title="Sedang dalam sengketa" description="Detail sengketa tidak ditemukan di perangkat ini." />
    );

  const opener = d.openedBy === b.renterId ? `${publicName(renter)} (penyewa)` : `${publicName(provider)} (penyedia)`;
  const waitingForMe = d.proposals.filter((p) => p.status === "diajukan" && p.byId !== user.id).length;

  if (compact)
    return (
      <Notice tone="outline" className="mt-4" icon={<Scale className="size-4" />} title="Hasil sengketa">
        {d.outcome ?? "Sengketa sudah ditutup."}
        {d.resolvedAt && <span className="mt-1 block text-caption text-smoke">Ditutup {formatDateTime(d.resolvedAt)}</span>}
      </Notice>
    );

  return (
    <>
      <ActionHead
        title={d.status === "mediasi" ? "Sengketa sedang dimediasi admin" : "Selesaikan masalah lewat negosiasi"}
        description="Sewain jadi mediator, bukan hakim. Keputusan berdasarkan bukti: foto, chat, jaminan, dan kesepakatan sewa."
      />
      <div className="mt-4 rounded-[12px] border border-border-gray px-3.5 py-2">
        <KV k="Tahap" v={LAYER_LABEL[d.layer]} strong />
        <KV k="Jenis masalah" v={DISPUTE_CASE_LABEL[d.caseType]} />
        <KV k="Dilaporkan oleh" v={opener} />
        <KV k="Dibuka" v={formatDateTime(d.createdAt)} />
      </div>
      {d.description && <blockquote className="mt-3 rounded-[12px] bg-soft-gray p-3 text-body-sm italic text-graphite">“{d.description}”</blockquote>}

      {d.status === "negosiasi" && <Countdown className="mt-3" label="Naik ke mediasi admin otomatis dalam" until={d.l1Deadline} now={now} />}
      {d.status === "negosiasi" && waitingForMe > 0 && role !== "admin" && (
        <p className="mt-3 inline-flex rounded-control bg-ink px-3 py-1 text-caption font-semibold text-white">{waitingForMe} usulan solusi menunggu jawabanmu</p>
      )}
      {d.status === "mediasi" &&
        (d.recommendation ? (
          <Notice tone="ink" className="mt-3" icon={<Scale className="size-4" />} title="Rekomendasi admin">
            {d.recommendation.text}
            {d.recommendation.amount ? ` (${rupiah(d.recommendation.amount)})` : ""}
          </Notice>
        ) : (
          <Notice className="mt-3" icon={<Scale className="size-4" />}>
            Admin sedang meninjau foto, chat, jaminan, dan kesepakatan. Target rekomendasi maksimal 5 hari kerja.
          </Notice>
        ))}

      <ActionButtons>
        {role === "admin" ? (
          <CtaLink href={`/admin/sengketa/${d.id}`}>
            <Scale /> Buka di panel admin
          </CtaLink>
        ) : (
          <CtaLink href={`/sewaan/${b.id}/sengketa`}>
            <Scale /> Buka halaman sengketa
          </CtaLink>
        )}
      </ActionButtons>
    </>
  );
}

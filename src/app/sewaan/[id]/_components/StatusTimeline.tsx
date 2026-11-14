"use client";

import { Check, Flag, Timer, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { endOfDay, formatDate, formatDateTime, rupiah } from "@/lib/format";
import { STATUS_FLOW } from "@/lib/selectors";
import type { Booking } from "@/lib/types";
import { LAYER_LABEL, lateInfo, type BookingView } from "./shared";

type StepState = "done" | "current" | "todo" | "stop" | "flag";

interface Step {
  key: string;
  label: string;
  at?: number;
  state: StepState;
  note?: ReactNode;
}

type FlowStatus = "REQUESTED" | "ACCEPTED" | "ACTIVE" | "RETURNED" | "COMPLETED";
const FLOW = STATUS_FLOW as FlowStatus[];

const MAIN_LABEL: Record<FlowStatus, string> = {
  REQUESTED: "Request dikirim",
  ACCEPTED: "Disetujui penyedia",
  ACTIVE: "Serah terima · sewa berjalan",
  RETURNED: "Barang dikembalikan",
  COMPLETED: "Selesai",
};

const mainAt = (b: Booking, s: FlowStatus) => ({ REQUESTED: b.createdAt, ACCEPTED: b.acceptedAt, ACTIVE: b.activeAt, RETURNED: b.returnedAt, COMPLETED: b.completedAt })[s];

/** Hint under a step that has not happened yet. */
function todoNote(b: Booking, s: FlowStatus): string | undefined {
  switch (s) {
    case "ACCEPTED":
      return `Batas respons ${formatDateTime(b.expiresAt)}`;
    case "ACTIVE":
      return b.checkout ? "Foto check-out sudah diunggah, menunggu kedua pihak setuju kondisi" : `Ambil ${formatDate(b.startDate)} · mulai setelah kedua pihak setuju kondisi`;
    case "RETURNED":
      return `Jadwal kembali ${formatDate(b.endDate)}`;
    case "COMPLETED":
      return b.collateralReturn?.providerReturnedAt ? "Menunggu penyewa konfirmasi jaminan (otomatis 48 jam)" : "Setelah jaminan dikembalikan & dikonfirmasi";
    default:
      return undefined;
  }
}

function buildSteps(v: BookingView): Step[] {
  const { b, dispute, now } = v;
  const steps: Step[] = [];
  const late = lateInfo(b, now);
  const lateStep = (): Step | null =>
    late
      ? {
          key: "OVERDUE",
          label: `Telat ${late.days} hari`,
          at: endOfDay(b.endDate),
          state: "flag",
          note: `Denda berjalan ${rupiah(late.fee)} (${rupiah(b.agreement.lateFeePerDay)}/hari, maks ${rupiah(b.agreement.lateFeeCap)})`,
        }
      : null;
  const pushMain = (s: FlowStatus, state: StepState, note?: ReactNode) => {
    steps.push({ key: s, label: MAIN_LABEL[s], at: state === "todo" ? undefined : mainAt(b, s), state, note: state === "todo" ? todoNote(b, s) : note });
    if (s === "ACTIVE" && state !== "todo") {
      const l = lateStep();
      if (l) steps.push(l);
    }
  };

  const flowIndex = FLOW.indexOf(b.status as FlowStatus);
  if (flowIndex >= 0) {
    FLOW.forEach((s, i) => {
      const state: StepState = i < flowIndex || b.status === "COMPLETED" ? "done" : i === flowIndex ? "current" : "todo";
      let note: ReactNode;
      if (s === "COMPLETED" && b.completedAuto) note = "Otomatis setelah 48 jam tanpa konfirmasi jaminan";
      if (s === "RETURNED" && state !== "todo" && b.collateralReturn?.providerReturnedAt) note = `Jaminan ditandai dikembalikan ${formatDateTime(b.collateralReturn.providerReturnedAt)}`;
      if (s === "RETURNED" && b.checkin?.result === "masalah") note = `Ada masalah: ${b.checkin.problemType}`;
      pushMain(s, state, note);
    });
    return steps;
  }

  // Side branches (PRD 8.3).
  pushMain("REQUESTED", "done");
  if (b.status === "DECLINED") {
    steps.push({ key: "DECLINED", label: "Ditolak penyedia", at: b.declinedAt, state: "stop", note: b.declineReason });
  } else if (b.status === "EXPIRED") {
    steps.push({ key: "EXPIRED", label: "Kadaluarsa", at: b.expiresAt, state: "stop", note: "Tidak direspons dalam 24 jam" });
  } else if (b.status === "CANCELLED") {
    if (b.acceptedAt) pushMain("ACCEPTED", "done");
    steps.push({ key: "CANCELLED", label: `Dibatalkan ${b.cancelledBy === b.renterId ? "penyewa" : "penyedia"}`, at: b.cancelledAt, state: "stop", note: b.cancelReason });
  } else {
    // DISPUTED / RESOLVED: dispute opened from ACTIVE (incl. overdue) or RETURNED.
    pushMain("ACCEPTED", "done");
    pushMain("ACTIVE", "done");
    if (b.returnedAt) pushMain("RETURNED", "done", b.checkin?.result === "masalah" ? `Ada masalah: ${b.checkin.problemType}` : undefined);
    const resolved = b.status === "RESOLVED";
    steps.push({ key: "DISPUTED", label: "Sengketa dibuka", at: dispute?.createdAt, state: resolved ? "done" : "current", note: dispute && !resolved ? LAYER_LABEL[dispute.layer] : undefined });
    steps.push({ key: "RESOLVED", label: "Sengketa selesai", at: resolved ? b.resolvedAt : undefined, state: resolved ? "done" : "todo", note: resolved ? dispute?.outcome : "Lewat negosiasi (L1) atau rekomendasi admin (L2)" });
    if (resolved && b.collateralReturn?.renterConfirmedAt) steps.push({ key: "JAMINAN", label: "Jaminan dikonfirmasi diterima", at: b.collateralReturn.renterConfirmedAt, state: "done" });
  }
  return steps;
}

function Dot({ state }: { state: StepState }) {
  const base = "relative z-10 grid size-6 place-items-center rounded-full";
  if (state === "done")
    return (
      <span className={cn(base, "bg-ink text-white")}>
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  if (state === "current")
    return (
      <span className={cn(base, "border-2 border-ink bg-white")}>
        <span className="size-2 rounded-full bg-ink" />
      </span>
    );
  if (state === "stop")
    return (
      <span className={cn(base, "bg-ink text-white")}>
        <X className="size-3.5" strokeWidth={3} />
      </span>
    );
  if (state === "flag")
    return (
      <span className={cn(base, "border-2 border-ink bg-white text-ink")}>
        <Timer className="size-3" strokeWidth={2.5} />
      </span>
    );
  return <span className={cn(base, "border-2 border-border-gray bg-white")} />;
}

/** Status timeline: happy path REQUESTED → … → COMPLETED with timestamps, side branches and the OVERDUE flag. */
export function StatusTimeline({ view, className }: { view: BookingView; className?: string }) {
  const steps = buildSteps(view);
  return (
    <section className={className} aria-labelledby="judul-status">
      <h2 id="judul-status" className="text-[17px] font-semibold tracking-[-0.2px] text-ink">
        Status sewa
      </h2>
      <ol className="mt-4">
        {steps.map((s, i) => (
          <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span aria-hidden className={cn("absolute left-[11px] top-6 h-[calc(100%-24px)] w-0.5", s.state === "todo" || steps[i + 1].state === "todo" ? "bg-border-gray" : "bg-ink")} />
            )}
            <Dot state={s.state} />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={cn("text-body-sm font-semibold", s.state === "todo" ? "text-ash" : "text-ink")}>
                  {s.key === "DISPUTED" && <Flag className="mr-1 inline size-3.5 align-[-2px]" />}
                  {s.label}
                  {s.state === "current" && <span className="ml-2 rounded-control bg-soft-gray px-2 py-0.5 text-micro font-medium text-graphite">sekarang</span>}
                </p>
                {s.at != null && <p className="text-caption text-smoke">{formatDateTime(s.at)}</p>}
              </div>
              {s.note && <p className={cn("mt-0.5 text-caption", s.state === "todo" ? "text-ash" : "text-smoke")}>{s.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

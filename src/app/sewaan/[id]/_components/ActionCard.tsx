"use client";

import { Eye } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { nextAction } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { AcceptedActions } from "./AcceptedActions";
import { ActiveActions } from "./ActiveActions";
import { ClosedActions } from "./ClosedActions";
import { DisputeSummary } from "./DisputeSummary";
import { FinishedActions } from "./FinishedActions";
import { RequestedActions } from "./RequestedActions";
import { ReturnedActions } from "./ReturnedActions";
import type { BookingView } from "./shared";

/** "Langkah berikutnya" — the status × role driven card where the whole demo happens. */
export function ActionCard({ view, className }: { view: BookingView; className?: string }) {
  const { b, role, user } = view;
  const needsMe = useAppStore((s) => (role === "admin" ? null : nextAction(b, user.id, s.reviews)));

  let body;
  switch (b.status) {
    case "REQUESTED":
      body = <RequestedActions view={view} />;
      break;
    case "ACCEPTED":
      body = <AcceptedActions view={view} />;
      break;
    case "ACTIVE":
      body = <ActiveActions view={view} />;
      break;
    case "RETURNED":
      body = <ReturnedActions view={view} />;
      break;
    case "DISPUTED":
      body = <DisputeSummary view={view} />;
      break;
    case "COMPLETED":
    case "RESOLVED":
      body = <FinishedActions view={view} />;
      break;
    default:
      body = <ClosedActions view={view} />;
  }

  return (
    <section aria-label="Langkah berikutnya" className={cn("rounded-card border bg-white p-4 sm:p-5", needsMe ? "border-ink shadow-floating" : "border-border-gray", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">Langkah berikutnya</p>
        {needsMe && <span className="rounded-control bg-ink px-2.5 py-0.5 text-micro font-semibold text-white">Giliranmu</span>}
      </div>
      {role === "admin" && (
        <p className="mt-2 flex items-center gap-1.5 text-caption text-smoke">
          <Eye className="size-3.5" /> Kamu melihat sebagai admin (mediator). Aksi sewa hanya untuk penyewa dan penyedia.
        </p>
      )}
      {body}
    </section>
  );
}

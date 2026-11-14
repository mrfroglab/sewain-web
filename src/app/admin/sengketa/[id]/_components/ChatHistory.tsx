"use client";

import { Lock } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/components/ui/cn";
import { formatDateTime } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import type { Booking, User } from "@/lib/types";
import { AdminSection } from "../../../_components/AdminUi";
import { EmptyNote, EvidenceTile } from "./EvidenceTile";

/** Full chat of the booking, read-only and compact (FR-C1: chat is evidence; FR-C3: cannot be deleted). */
export function ChatHistory({ booking, renter, provider }: { booking: Booking; renter?: User; provider?: User }) {
  const all = useAppStore((s) => s.messages);
  const messages = useMemo(() => all.filter((m) => m.bookingId === booking.id).sort((a, b) => a.at - b.at), [all, booking.id]);
  const sender = (id: string) =>
    id === booking.renterId ? { name: publicName(renter), role: "penyewa" } : id === booking.providerId ? { name: publicName(provider), role: "penyedia" } : { name: "Admin", role: "" };

  return (
    <AdminSection title={`Riwayat chat${messages.length ? ` (${messages.length})` : ""}`} description="Hanya chat di Sewain yang bisa dipakai mediator. Pesan tidak bisa dihapus selama sengketa.">
      {messages.length === 0 ? (
        <EmptyNote>Belum ada pesan di booking ini.</EmptyNote>
      ) : (
        <ol className="max-h-[480px] space-y-3 overflow-y-auto rounded-card border border-border-gray p-3 sm:p-4" aria-label="Riwayat chat">
          {messages.map((m) => {
            if (m.senderId === "system")
              return (
                <li key={m.id} className="rounded-[10px] bg-soft-gray px-3 py-2 text-caption text-graphite">
                  <span className="font-semibold text-ink">Sistem · </span>
                  {m.text}
                  <span className="mt-0.5 block text-micro text-smoke">{formatDateTime(m.at)}</span>
                </li>
              );
            const s = sender(m.senderId);
            const isProvider = m.senderId === booking.providerId;
            return (
              <li key={m.id} className={cn("max-w-[88%]", isProvider ? "ml-auto text-right" : "")}>
                <p className="text-micro text-smoke">
                  <span className="font-semibold text-ink">{s.name}</span>
                  {s.role && ` (${s.role})`} · {formatDateTime(m.at)}
                </p>
                {m.text && (
                  <p className={cn("mt-1 inline-block rounded-[12px] px-3 py-2 text-left text-body-sm", isProvider ? "bg-ink text-white" : "border border-border-gray bg-white text-ink")}>{m.text}</p>
                )}
                {m.photoId && (
                  <div className={cn("mt-1.5 w-28", isProvider && "ml-auto")}>
                    <EvidenceTile id={m.photoId} bookingCode={booking.code} className="text-left" />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-2 flex items-center gap-1.5 text-caption text-smoke">
        <Lock className="size-3.5 shrink-0" /> Bukti di luar Sewain (mis. WhatsApp) tidak bisa dipakai mediator.
      </p>
    </AdminSection>
  );
}

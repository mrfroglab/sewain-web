import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { Dispute } from "@/lib/types";

type LayerId = "L0" | "L1" | "L2" | "L3" | "L4";

export const LAYERS: { id: LayerId; title: string; detail: string; long: string }[] = [
  {
    id: "L0",
    title: "Pencegahan",
    detail: "Verifikasi, kesepakatan, jaminan, foto",
    long: "KTP + selfie, kesepakatan sewa digital, saran jaminan, dan foto referensi/check-out/check-in sudah berjalan sejak awal.",
  },
  { id: "L1", title: "Negosiasi", detail: "48 jam antar pengguna", long: "Kedua pihak saling mengajukan solusi. Kalau satu usulan diterima, sengketa selesai." },
  { id: "L2", title: "Mediasi admin", detail: "Rekomendasi ≤ 5 hari kerja", long: "Admin menilai foto, chat, jaminan, dan kesepakatan, lalu memberi rekomendasi tertulis beserta alasannya." },
  { id: "L3", title: "Konsekuensi", detail: "Strike → suspend → blacklist", long: "Menolak rekomendasi tanpa alasan, mengabaikan admin, atau terbukti curang bisa berujung strike, suspend, sampai blacklist NIK." },
  { id: "L4", title: "Jalur eksternal", detail: "Perdata / pidana", long: "Gugatan perdata atau laporan pidana di luar platform. Sewain menyerahkan data bukti hanya atas permintaan resmi aparat." },
];

/** Which layer the dispute is in (or ended in). */
export function currentLayer(d: Dispute): LayerId {
  if (d.layer === "L3") return "L3";
  if (d.status === "negosiasi") return "L1";
  if (d.status === "mediasi") return "L2";
  // selesai: at L1 when a proposal was accepted without admin involvement
  return d.recommendation || d.layer === "L2" ? "L2" : "L1";
}

/** PRD 11.2 five layers; the current one is black. Scrolls horizontally on phones. */
export function LayerStepper({ dispute }: { dispute: Dispute }) {
  const cur = currentLayer(dispute);
  const curIndex = LAYERS.findIndex((l) => l.id === cur);
  const done = dispute.status === "selesai";
  return (
    <div>
      <ol className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0" aria-label="Lapisan penyelesaian sengketa">
        {LAYERS.map((l, i) => {
          const state = i === curIndex ? "current" : i < curIndex ? "past" : "future";
          return (
            <li
              key={l.id}
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "flex w-[150px] shrink-0 snap-start flex-col rounded-[12px] p-3 sm:w-auto",
                state === "current" && "bg-ink text-white",
                state === "past" && "border border-border-gray bg-white",
                state === "future" && "bg-soft-gray",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={cn("text-micro font-semibold uppercase tracking-[0.08em]", state === "current" ? "text-white/70" : "text-smoke")}>{l.id}</span>
                {(state === "past" || (state === "current" && done)) && <Check className={cn("size-3.5", state === "current" ? "text-white" : "text-ink")} strokeWidth={3} />}
              </span>
              <span className={cn("mt-1 text-body-sm font-semibold", state === "current" ? "text-white" : state === "future" ? "text-graphite" : "text-ink")}>{l.title}</span>
              <span className={cn("mt-0.5 text-caption", state === "current" ? "text-white/75" : "text-smoke")}>{l.detail}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-body-sm text-graphite">
        <span className="font-semibold text-ink">{done ? `Selesai di ${cur}` : `Sekarang di ${cur}`}:</span> {LAYERS[curIndex].long}
      </p>
    </div>
  );
}

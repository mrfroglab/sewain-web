"use client";

import { Flag, LogIn } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChoiceCard, TextArea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useCurrentUser } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Report } from "@/lib/types";

const REASONS: Record<Report["targetType"], string[]> = {
  listing: [
    "Barang terlarang atau berbahaya",
    "Minta transfer / DP di luar Sewain",
    "Foto atau deskripsi tidak sesuai",
    "Harga atau jaminan tidak wajar",
    "Listing ganda atau spam",
    "Lainnya",
  ],
  user: [
    "Dugaan penipuan",
    "Minta transfer / DP di luar Sewain",
    "Tidak mengembalikan barang atau jaminan",
    "Perilaku kasar atau tidak sopan",
    "Akun palsu atau identitas meragukan",
    "Lainnya",
  ],
};

/** "Laporkan" bottom sheet (PRD 12.1: tombol lapor di setiap halaman). Sends a report to the admin queue. */
export function ReportSheet({
  open,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: {
  open: boolean;
  onClose: () => void;
  targetType: Report["targetType"];
  targetId: string;
  targetLabel: string;
}) {
  const user = useCurrentUser();
  const path = usePathname();
  const createReport = useAppStore((s) => s.createReport);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");

  const close = () => {
    setReason(null);
    setDetail("");
    onClose();
  };

  const submit = () => {
    if (!user || !reason) return;
    const res = createReport(user.id, { targetType, targetId, reason, detail: detail.trim() || undefined });
    if (toastResult(res, "Laporan terkirim. Tim Sewain akan meninjau maksimal 1×24 jam.")) close();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={targetType === "listing" ? "Laporkan listing" : "Laporkan pengguna"}
      description={`${targetLabel}. Identitasmu tidak ditampilkan ke pihak yang dilaporkan.`}
      footer={
        user ? (
          <Button block onClick={submit} disabled={!reason || (reason === "Lainnya" && !detail.trim())}>
            <Flag className="size-4" /> Kirim laporan
          </Button>
        ) : null
      }
    >
      {user ? (
        <div className="space-y-4">
          <div className="grid gap-2" role="radiogroup" aria-label="Alasan laporan">
            {REASONS[targetType].map((r) => (
              <ChoiceCard key={r} selected={reason === r} onClick={() => setReason(r)} title={r} />
            ))}
          </div>
          <TextArea
            label="Ceritakan singkat"
            optional={reason !== "Lainnya"}
            placeholder="Mis. penyedia minta transfer DP lewat WhatsApp sebelum ketemu."
            value={detail}
            maxLength={500}
            onChange={(e) => setDetail(e.target.value)}
          />
        </div>
      ) : (
        <div className="rounded-[12px] bg-soft-gray p-4">
          <p className="text-body-sm text-graphite">Masuk dulu supaya laporanmu bisa ditindaklanjuti admin.</p>
          <ButtonLink href={`/masuk?next=${encodeURIComponent(path)}`} size="sm" className="mt-3">
            <LogIn className="size-4" /> Masuk
          </ButtonLink>
        </div>
      )}
    </Sheet>
  );
}

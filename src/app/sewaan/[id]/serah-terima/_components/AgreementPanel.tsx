"use client";

import { CircleCheck, CircleDashed, ImagePlus, PackageX } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { formatDateTime } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { BookingCtx } from "../_shared/BookingFrame";
import { AddPhotosSheet } from "./AddPhotosSheet";
import { RejectSheet } from "./RejectSheet";

/** Two-party "Setuju kondisi" (PRD 10.1): ACTIVE only after both agreed. */
export function AgreementPanel({ ctx }: { ctx: BookingCtx }) {
  const { user, booking, renter, provider, role, readOnly } = ctx;
  const agreeCheckout = useAppStore((s) => s.agreeCheckout);
  const [sheet, setSheet] = useState<"add" | "reject" | null>(null);
  const checkout = booking.checkout!;
  const mine = role === "penyewa" ? checkout.renterAgreedAt : role === "penyedia" ? checkout.providerAgreedAt : undefined;
  const otherName = role === "penyewa" ? publicName(provider) : publicName(renter);

  const parties = [
    { label: "Penyedia", name: publicName(provider), me: role === "penyedia", at: checkout.providerAgreedAt },
    { label: "Penyewa", name: publicName(renter), me: role === "penyewa", at: checkout.renterAgreedAt },
  ];

  const agree = () => {
    const willStart = role === "penyewa" ? !!checkout.providerAgreedAt : !!checkout.renterAgreedAt;
    toastResult(agreeCheckout(user.id, booking.id), willStart ? "Kondisi disetujui kedua pihak. Sewa dimulai!" : "Kamu menyetujui kondisi. Menunggu pihak lain.");
  };

  return (
    <section className="rounded-card border border-border-gray p-4 sm:p-5">
      <h2 className="text-body-lg font-semibold text-ink">Setuju kondisi</h2>
      <p className="mt-1 text-body-sm text-smoke">Status jadi “Sedang disewa” hanya setelah kedua pihak setuju dengan kondisi barang dan jaminan di foto.</p>

      <ul className="mt-4 space-y-2">
        {parties.map((p) => (
          <li key={p.label} className={cn("flex items-center gap-3 rounded-[12px] px-3.5 py-3", p.at ? "bg-ink text-white" : "bg-soft-gray text-graphite")}>
            {p.at ? <CircleCheck className="size-5 shrink-0" /> : <CircleDashed className="size-5 shrink-0 text-ash" />}
            <span className="min-w-0 flex-1">
              <span className={cn("block text-body-sm font-semibold", p.at ? "text-white" : "text-ink")}>
                {p.label} · {p.name}
                {p.me && " (kamu)"}
              </span>
              <span className={cn("block text-caption", p.at ? "text-white/75" : "text-smoke")}>{p.at ? `Setuju · ${formatDateTime(p.at)}` : "Belum menyetujui"}</span>
            </span>
          </li>
        ))}
      </ul>

      {!readOnly && (
        <div className="mt-5 space-y-2">
          {!mine ? (
            <>
              {role === "penyewa" && <p className="text-caption text-smoke">Cek barang dan jaminan di depanmu. Dengan menekan tombol ini, kamu setuju foto di atas sesuai kondisi saat diterima.</p>}
              <Button size="lg" block onClick={agree}>
                <CircleCheck className="size-4" /> Setuju kondisi
              </Button>
            </>
          ) : (
            <p className="rounded-[12px] bg-soft-gray px-3.5 py-3 text-body-sm text-graphite">Kamu sudah setuju. Menunggu {otherName} memeriksa dan menekan “Setuju kondisi”.</p>
          )}
          <Button variant="secondary" block onClick={() => setSheet("add")}>
            <ImagePlus className="size-4" /> Tambah foto
          </Button>
          {role === "penyewa" && (
            <Button variant="ghost" block onClick={() => setSheet("reject")}>
              <PackageX className="size-4" /> Barang tidak sesuai deskripsi
            </Button>
          )}
          <p className="pt-1 text-caption text-smoke">Foto bisa ditambah, tapi tidak bisa dihapus atau diganti.</p>
        </div>
      )}

      {sheet === "add" && <AddPhotosSheet ctx={ctx} onClose={() => setSheet(null)} />}
      {sheet === "reject" && <RejectSheet ctx={ctx} onClose={() => setSheet(null)} />}
    </section>
  );
}

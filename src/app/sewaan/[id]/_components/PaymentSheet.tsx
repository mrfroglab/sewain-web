"use client";

import { Banknote, Landmark, QrCode, Smartphone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChoiceCard } from "@/components/ui/Field";
import { KV, Notice } from "@/components/ui/Layout";
import { Sheet } from "@/components/ui/Sheet";
import { rupiah } from "@/lib/format";
import { describeCollateral } from "@/lib/pricing";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { PaymentMethod } from "@/lib/types";
import { PAYMENT_METHOD_LABEL, type BookingView } from "./shared";

const METHODS: { value: PaymentMethod; description: string; Icon: typeof QrCode }[] = [
  { value: "qris", description: "Metode utama. Scan dari aplikasi bank atau dompet digital apa pun.", Icon: QrCode },
  { value: "va", description: "Transfer ke nomor virtual account bank.", Icon: Landmark },
  { value: "ewallet", description: "Bayar langsung dari dompet digital.", Icon: Smartphone },
  { value: "tunai", description: "Bayar ke penyedia saat ketemu, lalu ditandai lunas.", Icon: Banknote },
];

/** "Bayar via Sewain (simulasi)" — PRD 7.2: rincian sewa + jaminan uang + komisi, lalu ditandai lunas. */
export function PaymentSheet({ open, onClose, view }: { open: boolean; onClose: () => void; view: BookingView }) {
  if (!open) return null;
  return <PaymentSheetInner onClose={onClose} view={view} />;
}

function PaymentSheetInner({ onClose, view }: { onClose: () => void; view: BookingView }) {
  const { b, user } = view;
  const payBooking = useAppStore((s) => s.payBooking);
  const [method, setMethod] = useState<PaymentMethod>("qris");
  const [loading, setLoading] = useState(false);
  const p = b.payment;
  const c = b.agreement.commission;

  const pay = () => {
    setLoading(true);
    // Short pause so the simulated payment feels like a real confirmation step.
    window.setTimeout(() => {
      const res = payBooking(user.id, b.id, method);
      setLoading(false);
      if (toastResult(res, `Pembayaran ${rupiah(p.total)} lunas (simulasi ${PAYMENT_METHOD_LABEL[method]}).`)) onClose();
    }, 900);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!loading}
      title="Bayar via Sewain"
      description="Simulasi pembayaran Fase 2. Tidak ada uang yang benar-benar berpindah."
      footer={
        <Button block size="lg" loading={loading} onClick={pay}>
          Bayar {rupiah(p.total)}
        </Button>
      }
    >
      <div className="rounded-[12px] border border-border-gray px-3.5 py-2">
        <KV k={`Sewa (${b.agreement.quote.breakdown})`} v={rupiah(p.rent)} />
        <KV k="Deposit uang" v={p.deposit ? rupiah(p.deposit) : "Rp0"} />
        {!p.deposit && <p className="-mt-1 pb-1 text-caption text-ash">Jaminanmu: {describeCollateral(b.collateral, b.agreement.itemValue)} (bukan uang)</p>}
        <KV k="Komisi Sewain (penyewa)" v={rupiah(p.commission)} />
        {!c.active && <p className="-mt-1 pb-1 text-caption text-ash">Komisi nonaktif selama pilot (seandainya aktif: {rupiah(c.amount)}).</p>}
        <div className="mt-1 border-t border-border-gray pt-1">
          <KV k="Total" v={rupiah(p.total)} strong />
        </div>
      </div>
      {p.deposit > 0 && <p className="mt-2 text-caption text-smoke">Deposit dikembalikan setelah barang kembali sesuai kondisi. Di Fase 2, deposit ditahan payment gateway, bukan rekening Sewain.</p>}

      <p className="mb-2 mt-5 text-body-sm font-semibold text-ink">Metode pembayaran</p>
      <div className="grid gap-2" role="radiogroup" aria-label="Metode pembayaran">
        {METHODS.map(({ value, description, Icon }) => (
          <ChoiceCard
            key={value}
            selected={method === value}
            onClick={() => setMethod(value)}
            icon={<Icon className="size-5" />}
            title={value === "qris" ? "QRIS (utama)" : PAYMENT_METHOD_LABEL[value]}
            description={description}
          />
        ))}
      </div>

      {method === "qris" && (
        <div className="mt-4 flex items-center gap-4 rounded-[12px] bg-soft-gray p-3.5">
          <div className="grid size-20 shrink-0 place-items-center rounded-[10px] bg-white shadow-hairline">
            <QrCode className="size-14 text-ink" strokeWidth={1.25} />
          </div>
          <p className="text-caption text-smoke">QR simulasi. Di aplikasi asli, kode QRIS muncul di sini dan status lunas diperbarui otomatis.</p>
        </div>
      )}

      <Notice className="mt-4" title="Selama pilot, pembayaran di luar platform">
        Penyewa membayar langsung ke penyedia (tunai, transfer, atau QRIS pribadi) setelah request disetujui. Jangan transfer sebelum bertemu dan melihat barangnya.
      </Notice>
    </Sheet>
  );
}

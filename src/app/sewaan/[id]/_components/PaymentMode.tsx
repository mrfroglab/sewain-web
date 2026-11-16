"use client";

import { Clock, HandCoins, ShieldAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Layout";
import { usePaymentMode, type PaymentMode } from "@/lib/config";
import { formatDateTime, rupiah } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { PaymentInfo } from "@/lib/types";
import { PAYMENT_METHOD_LABEL, type BookingView } from "./shared";

// Payment step per environment (F6.7, ROADMAP D12):
//   simulated → "Bayar via Sewain (simulasi)" (demo, unchanged)
//   offline   → pilot: pay the provider directly once the item is in hand; never blocks check-out
//   gateway   → Fase 8, "segera hadir"

/** One line describing a finished payment. */
export function paidLine(p: PaymentInfo, mode: PaymentMode): string {
  const when = p.paidAt ? ` · ${formatDateTime(p.paidAt)}` : "";
  if (p.method === "langsung") return `Ditandai sudah bayar langsung ke penyedia${when}`;
  return `Via ${p.method ? PAYMENT_METHOD_LABEL[p.method] : "Sewain"}${when}${mode === "simulated" ? " · simulasi" : ""}`;
}

/** Explanation under the payment card while still unpaid. */
export function unpaidNote(mode: PaymentMode): string {
  if (mode === "offline") return "Selama pilot, bayar langsung ke penyedia setelah barang di tangan dan sudah kamu cek. Sewain tidak memegang uangmu.";
  if (mode === "gateway") return "Pembayaran lewat Sewain segera hadir. Untuk sekarang, bayar langsung ke penyedia setelah barang di tangan.";
  return "Selama pilot, pembayaran terjadi di luar platform (tunai/transfer langsung). Bayar via Sewain tersedia sebagai simulasi setelah request disetujui.";
}

/** PRD §12.1 warning, phrased for paying a person directly. */
export function DirectPaymentWarning({ className }: { className?: string }) {
  return (
    <Notice tone="ink" icon={<ShieldAlert className="size-4" />} title="Jangan transfer sebelum ketemu" className={className}>
      Bayar hanya setelah barang di tangan dan sudah kamu cek. Diminta DP atau transfer duluan? Itu tanda bahaya, jangan dibayar dan laporkan.{" "}
      <Link href="/bantuan#aman" className="font-medium text-white underline underline-offset-2">
        Tips aman
      </Link>
    </Notice>
  );
}

function MarkPaidDirectly({ view, compact }: { view: BookingView; compact?: boolean }) {
  const payBooking = useAppStore((s) => s.payBooking);
  const mark = () => toastResult(payBooking(view.user.id, view.b.id, "langsung"), "Ditandai sudah bayar langsung ke penyedia.");
  if (compact)
    return (
      <button type="button" onClick={mark} className="mt-3 min-h-9 text-body-sm font-medium text-ink underline underline-offset-4">
        Tandai sudah bayar langsung
      </button>
    );
  return (
    <Button variant="secondary" block className="mt-3" onClick={mark}>
      <HandCoins className="size-4" /> Saya sudah bayar langsung
    </Button>
  );
}

/** Renter's payment block on an ACCEPTED booking. `onPay` opens the simulated payment sheet. */
export function RenterPaymentBlock({ view, onPay }: { view: BookingView; onPay: () => void }) {
  const mode = usePaymentMode();
  const p = view.b.payment;
  if (p.status === "lunas")
    return (
      <div className="mt-4 flex items-center gap-3 rounded-[12px] bg-soft-gray p-3.5 text-body-sm">
        <Wallet className="size-4 shrink-0 text-ink" />
        <p className="text-graphite">
          <span className="font-semibold text-ink">{p.method === "langsung" ? "Sudah bayar" : `Lunas ${rupiah(p.total)}`}</span> · {paidLine(p, mode)}
        </p>
      </div>
    );

  if (mode === "simulated")
    return (
      <div className="mt-4 rounded-[12px] bg-soft-gray p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-ink">Pembayaran</p>
            <p className="mt-0.5 text-caption text-smoke">Sewa + deposit uang + komisi. Selama pilot, pembayaran terjadi di luar platform; tombol ini mensimulasikan Fase 2.</p>
          </div>
          <p className="shrink-0 text-body font-semibold text-ink">{rupiah(p.total)}</p>
        </div>
        <Button block className="mt-3" onClick={onPay}>
          <Wallet className="size-4" /> Bayar via Sewain (simulasi)
        </Button>
      </div>
    );

  return (
    <div className="mt-4 rounded-[12px] bg-soft-gray p-3.5" data-testid="payment-direct">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-ink">{mode === "gateway" ? "Bayar via Sewain segera hadir" : "Bayar langsung ke penyedia setelah barang di tangan"}</p>
          <p className="mt-0.5 text-caption text-smoke">
            Sewa{p.deposit > 0 ? " + deposit uang" : ""}, dibayar tunai atau transfer saat serah terima. Serah terima tetap bisa jalan; langkah ini tidak menahan check-out.
          </p>
        </div>
        <p className="shrink-0 text-body font-semibold text-ink">{rupiah(p.total)}</p>
      </div>
      {mode === "gateway" && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-caption text-smoke">
          <Clock className="size-3.5" /> Pembayaran lewat Sewain sedang disiapkan.
        </p>
      )}
      <DirectPaymentWarning className="mt-3" />
      <MarkPaidDirectly view={view} />
    </div>
  );
}

/** Secondary payment link on an ACTIVE booking (paid late). */
export function RenterPaymentLink({ view, onPay }: { view: BookingView; onPay: () => void }) {
  const mode = usePaymentMode();
  const p = view.b.payment;
  if (p.status !== "belum") return null;
  if (mode === "simulated")
    return (
      <button type="button" onClick={onPay} className="mt-3 min-h-9 text-body-sm font-medium text-ink underline underline-offset-4">
        Bayar via Sewain (simulasi) · {rupiah(p.total)}
      </button>
    );
  return <MarkPaidDirectly view={view} compact />;
}

/** Provider's note while the renter has not paid. */
export function ProviderPaymentNote({ view }: { view: BookingView }) {
  const mode = usePaymentMode();
  if (view.b.payment.status !== "belum") return null;
  return (
    <p className="mt-4 text-caption text-smoke">
      {mode === "simulated"
        ? "Penyewa belum membayar lewat Sewain. Selama pilot, pembayaran boleh tunai/transfer langsung saat ketemu. Serahkan barang setelah pembayaran beres."
        : `Penyewa membayar ${rupiah(view.b.payment.total)} langsung ke kamu saat serah terima. Jangan minta transfer duluan; cukup terima saat ketemu.`}
    </p>
  );
}

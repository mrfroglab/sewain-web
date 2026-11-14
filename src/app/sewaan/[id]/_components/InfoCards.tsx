"use client";

import { ShieldCheck, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { KV } from "@/components/ui/Layout";
import { formatDateTime, rupiah } from "@/lib/format";
import { describeCollateral } from "@/lib/pricing";
import { PAYMENT_METHOD_LABEL, type BookingView } from "./shared";

function InfoCard({ icon, title, badge, className, children }: { icon: ReactNode; title: string; badge?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-card border border-border-gray bg-white p-4", className)}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-ink">{icon}</span>
        <h2 className="flex-1 text-body font-semibold text-ink">{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

const chip = (dark: boolean) => cn("inline-flex h-6 items-center rounded-control px-2.5 text-caption font-semibold", dark ? "bg-ink text-white" : "border border-ink bg-white text-ink");

/** Payment status (simulated in-app payment, PRD 7.2). */
export function PaymentCard({ view, className }: { view: BookingView; className?: string }) {
  const { b } = view;
  const p = b.payment;
  const c = b.agreement.commission;
  const paid = p.status === "lunas";
  return (
    <InfoCard icon={<Wallet className="size-4" />} title="Pembayaran" badge={<span className={chip(paid)}>{paid ? "Lunas" : "Belum dibayar"}</span>} className={className}>
      <KV k="Sewa" v={rupiah(p.rent)} />
      <KV k="Deposit uang" v={rupiah(p.deposit)} />
      <KV k="Komisi (penyewa)" v={rupiah(p.commission)} />
      {c.providerPays > 0 && <KV k="Komisi (penyedia)" v={rupiah(c.providerPays)} />}
      <div className="mt-1 border-t border-border-gray pt-1">
        <KV k="Total penyewa" v={rupiah(p.total)} strong />
      </div>
      {paid ? (
        <p className="mt-2 text-caption text-smoke">
          Via {p.method ? PAYMENT_METHOD_LABEL[p.method] : "Sewain"}
          {p.paidAt ? ` · ${formatDateTime(p.paidAt)}` : ""} · simulasi
        </p>
      ) : (
        <p className="mt-2 text-caption text-smoke">Selama pilot, pembayaran terjadi di luar platform (tunai/transfer langsung). Bayar via Sewain tersedia sebagai simulasi setelah request disetujui.</p>
      )}
    </InfoCard>
  );
}

/** Collateral: kind, value, handed over / returned / confirmed timestamps (FR-J5, FR-J6). */
export function CollateralCard({ view, className }: { view: BookingView; className?: string }) {
  const { b } = view;
  const cr = b.collateralReturn;
  const co = b.checkout;
  const handedOver = co?.renterAgreedAt && co.providerAgreedAt ? Math.max(co.renterAgreedAt, co.providerAgreedAt) : undefined;
  const isDocument = b.collateral.kind === "identitas" || b.collateral.withIdentity || b.collateral.kind === "custom";
  const done = !!cr?.renterConfirmedAt || (!!b.completedAuto && !!cr?.providerReturnedAt);
  const ts = (t?: number, empty = "Belum") => (t ? formatDateTime(t) : empty);
  return (
    <InfoCard
      icon={<ShieldCheck className="size-4" />}
      title="Jaminan"
      badge={<span className={chip(done)}>{done ? "Sudah kembali" : handedOver ? "Dipegang penyedia" : "Belum diserahkan"}</span>}
      className={className}
    >
      <KV k="Jenis" v={describeCollateral(b.collateral, b.agreement.itemValue)} />
      <KV k="Nilai" v={b.agreement.collateralValue > 0 ? rupiah(b.agreement.collateralValue) : "Tanpa nilai uang"} />
      <KV k="Diserahkan" v={ts(handedOver)} />
      <KV k="Dikembalikan penyedia" v={ts(cr?.providerReturnedAt)} />
      <KV k="Dikonfirmasi penyewa" v={cr?.renterConfirmedAt ? formatDateTime(cr.renterConfirmedAt) : b.completedAuto ? "Otomatis (48 jam)" : "Belum"} />
      {isDocument && <p className="mt-2 text-caption text-smoke">Saat difoto, tutup sebagian nomor penting (mis. NIK). Dokumen asli jadi tanggung jawab penyedia selama dititipkan.</p>}
    </InfoCard>
  );
}

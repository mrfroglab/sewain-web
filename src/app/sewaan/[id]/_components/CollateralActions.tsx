"use client";

import { CircleCheck, ShieldCheck, Undo2 } from "lucide-react";
import { useState } from "react";
import { KV, Notice } from "@/components/ui/Layout";
import { EvidencePhoto } from "@/components/photo/EvidencePhoto";
import { formatDateTime, rupiah } from "@/lib/format";
import { describeCollateral } from "@/lib/pricing";
import { publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { ActionButtons, ActionHead, Countdown, CtaButton } from "./ActionBits";
import { ConfirmSheet } from "./Sheets";
import type { BookingView } from "./shared";

/**
 * Collateral return (PRD 8.1 step 9 / 8.3): provider marks "jaminan dikembalikan", renter confirms "jaminan diterima".
 * No renter response within 48h → auto COMPLETED (store tick). Used for RETURNED and RESOLVED.
 */
export function CollateralActions({ view, withHead = true }: { view: BookingView; withHead?: boolean }) {
  const { b, role, user, now, renter, provider } = view;
  const [open, setOpen] = useState(false);
  const returnCollateral = useAppStore((s) => s.returnCollateral);
  const confirmCollateral = useAppStore((s) => s.confirmCollateral);
  const cr = b.collateralReturn;
  const desc = describeCollateral(b.collateral, b.agreement.itemValue);
  const value = b.agreement.collateralValue;
  const autoComplete =
    cr?.autoCompleteAt != null && !cr.renterConfirmedAt && b.status === "RETURNED" ? (
      <Countdown className="mt-4" label="Selesai otomatis kalau tidak dikonfirmasi dalam" until={cr.autoCompleteAt} now={now} />
    ) : null;

  const summary = (
    <div className="mt-4 rounded-[12px] border border-border-gray px-3.5 py-2">
      <KV k="Jaminan" v={desc} />
      {value > 0 && <KV k="Nilai" v={rupiah(value)} />}
      {cr?.providerReturnedAt && <KV k="Ditandai dikembalikan" v={formatDateTime(cr.providerReturnedAt)} />}
      {cr?.renterConfirmedAt && <KV k="Dikonfirmasi diterima" v={formatDateTime(cr.renterConfirmedAt)} />}
    </div>
  );

  const photos = b.checkout?.collateralPhotoIds ?? [];
  const sheetBody = (
    <>
      <div className="rounded-[12px] bg-soft-gray p-3.5">
        <p className="text-caption text-smoke">Jaminan yang dititipkan</p>
        <p className="mt-0.5 text-body font-semibold text-ink">{desc}</p>
        {value > 0 && <p className="text-body-sm text-graphite">Nilai {rupiah(value)}</p>}
      </div>
      {photos.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-body-sm font-semibold text-ink">Foto jaminan saat serah terima</p>
          <div className="grid grid-cols-2 gap-2">
            {photos.slice(0, 2).map((id) => (
              <EvidencePhoto key={id} id={id} bookingCode={b.code} />
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (role === "penyedia") {
    if (!cr?.providerReturnedAt)
      return (
        <>
          {withHead && <ActionHead title={`Kembalikan jaminan ${publicName(renter)}`} description="Serahkan jaminan ke penyewa, lalu tandai di sini. Penyewa akan diminta mengonfirmasi." />}
          {summary}
          <ActionButtons>
            <CtaButton onClick={() => setOpen(true)}>
              <Undo2 /> Jaminan sudah saya kembalikan
            </CtaButton>
          </ActionButtons>
          <ConfirmSheet
            open={open}
            onClose={() => setOpen(false)}
            title="Jaminan sudah dikembalikan?"
            description={`Pastikan jaminan sudah di tangan ${publicName(renter)}. Penyewa punya 48 jam untuk konfirmasi, setelah itu sewa selesai otomatis.`}
            confirmLabel="Ya, sudah"
            successMessage="Jaminan ditandai dikembalikan. Menunggu konfirmasi penyewa."
            onConfirm={() => returnCollateral(user.id, b.id)}
          >
            {sheetBody}
          </ConfirmSheet>
        </>
      );
    if (!cr.renterConfirmedAt)
      return (
        <>
          {withHead && <ActionHead title={`Menunggu ${publicName(renter)} konfirmasi jaminan`} description="Kamu sudah menandai jaminan dikembalikan. Tinggal penyewa mengonfirmasi." />}
          {summary}
          {autoComplete}
        </>
      );
  }

  if (role === "penyewa") {
    if (!cr?.providerReturnedAt)
      return (
        <>
          {withHead && (
            <ActionHead
              title={`Menunggu ${publicName(provider)} mengembalikan jaminan`}
              description="Kalau jaminan sudah kamu terima tapi belum ditandai, ingatkan lewat chat. Jaminan tidak dikembalikan? Laporkan masalah."
            />
          )}
          {summary}
        </>
      );
    if (!cr.renterConfirmedAt)
      return (
        <>
          {withHead && <ActionHead title="Jaminanmu sudah kembali?" description={`${publicName(provider)} menandai jaminan sudah dikembalikan. Konfirmasi kalau sudah kamu terima.`} />}
          {summary}
          <ActionButtons>
            <CtaButton onClick={() => setOpen(true)}>
              <ShieldCheck /> Jaminan sudah saya terima
            </CtaButton>
          </ActionButtons>
          {autoComplete}
          <ConfirmSheet
            open={open}
            onClose={() => setOpen(false)}
            title="Jaminan sudah kamu terima?"
            description={b.status === "RETURNED" ? "Setelah konfirmasi, sewa dinyatakan selesai dan kalian bisa saling memberi rating." : "Konfirmasi bahwa sisa jaminan sudah kamu terima."}
            confirmLabel="Ya, sudah terima"
            successMessage={b.status === "RETURNED" ? "Jaminan diterima. Sewa selesai!" : "Jaminan dikonfirmasi diterima."}
            onConfirm={() => confirmCollateral(user.id, b.id)}
          >
            {sheetBody}
          </ConfirmSheet>
        </>
      );
  }

  if (cr?.renterConfirmedAt || role === "admin")
    return (
      <>
        {withHead && <ActionHead title={cr?.renterConfirmedAt ? "Jaminan sudah kembali" : "Pengembalian jaminan"} />}
        {summary}
        {cr?.renterConfirmedAt && (
          <Notice className="mt-3" icon={<CircleCheck className="size-4" />}>
            Jaminan dikembalikan dan sudah dikonfirmasi penyewa.
          </Notice>
        )}
        {autoComplete}
      </>
    );
  return summary;
}

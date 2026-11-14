"use client";

import { CalendarDays, Flag, MessageCircle, PackageCheck, Timer } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Layout";
import { formatDate, rupiah } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import { ActionButtons, ActionHead, CtaLink, InfoLine } from "./ActionBits";
import { PaymentSheet } from "./PaymentSheet";
import { daysUntilReturn, lateInfo, otherParty, returnLabel, type BookingView } from "./shared";

/** ACTIVE (+ OVERDUE flag): days remaining / late banner; provider receives the item back (check-in photos). */
export function ActiveActions({ view }: { view: BookingView }) {
  const { b, role, now } = view;
  const [paying, setPaying] = useState(false);
  const late = lateInfo(b, now);
  const left = daysUntilReturn(b, now);
  const other = otherParty(view);
  const a = b.agreement;

  const title = late
    ? role === "penyewa"
      ? "Kamu telat mengembalikan barang"
      : role === "penyedia"
        ? "Barang telat dikembalikan"
        : "Booking telat dikembalikan"
    : `Sedang disewa · ${returnLabel(left)}`;
  const description =
    role === "penyedia"
      ? "Saat barang kembali, foto minimal 3 sudut (check-in) dan pilih kondisinya. Setelah itu kembalikan jaminan penyewa."
      : role === "penyewa"
        ? "Saat mengembalikan, penyedia memotret kondisi barang (check-in). Kamu boleh ikut menambah foto."
        : "Barang sedang dipakai penyewa.";

  return (
    <>
      <ActionHead title={title} description={description} />

      {late ? (
        <Notice tone="ink" className="mt-4" icon={<Timer className="size-4" />} title={`Telat ${late.days} hari · denda berjalan ${rupiah(late.fee)}`}>
          Denda {rupiah(a.lateFeePerDay)}/hari, maksimal {rupiah(a.lateFeeCap)} sesuai kesepakatan{late.capped ? " (sudah mencapai batas)" : ""}.{" "}
          {role === "penyewa"
            ? `Segera kembalikan dan kabari ${publicName(other)} lewat chat.`
            : role === "penyedia"
              ? "Hubungi penyewa lewat chat. Kalau tidak ada kabar, laporkan masalah."
              : ""}
        </Notice>
      ) : (
        <div className="mt-4 rounded-[12px] border border-border-gray p-3.5">
          <InfoLine icon={<CalendarDays className="size-4" />} label="Tanggal kembali">
            <span className="font-medium text-ink">{formatDate(b.endDate, true)}</span>
            <span className="block text-caption text-smoke">
              Lewat dari tanggal ini, denda {rupiah(a.lateFeePerDay)}/hari (maks {rupiah(a.lateFeeCap)}).
            </span>
          </InfoLine>
        </div>
      )}

      {role !== "admin" && (
        <ActionButtons>
          {role === "penyedia" && (
            <CtaLink href={`/sewaan/${b.id}/pengembalian`}>
              <PackageCheck /> Terima barang kembali (foto check-in)
            </CtaLink>
          )}
          <ButtonLink href={`/sewaan/${b.id}/chat`} variant="secondary">
            <MessageCircle className="size-4" /> Chat {publicName(other)}
          </ButtonLink>
          <ButtonLink href={`/sewaan/${b.id}/sengketa`} variant="secondary">
            <Flag className="size-4" /> Laporkan masalah
          </ButtonLink>
        </ActionButtons>
      )}

      {role === "penyewa" && b.payment.status === "belum" && (
        <button type="button" onClick={() => setPaying(true)} className="mt-3 min-h-9 text-body-sm font-medium text-ink underline underline-offset-4">
          Bayar via Sewain (simulasi) · {rupiah(b.payment.total)}
        </button>
      )}
      <PaymentSheet open={paying} onClose={() => setPaying(false)} view={view} />
    </>
  );
}

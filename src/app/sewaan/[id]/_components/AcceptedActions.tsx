"use client";

import { CalendarDays, Camera, CircleCheck, Handshake, MapPin, MessageCircle, Wallet } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Layout";
import { HANDOVER_LABEL } from "@/lib/data/categories";
import { formatDate, formatDateTime, rupiah } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { ActionButtons, ActionHead, CtaLink, InfoLine } from "./ActionBits";
import { PaymentSheet } from "./PaymentSheet";
import { ReasonSheet } from "./Sheets";
import { PAYMENT_METHOD_LABEL, otherParty, type BookingView } from "./shared";

const CANCEL_REASONS = ["Rencana berubah", "Tidak bisa ketemu di jadwal itu", "Barang ternyata dipakai", "Penyewa/penyedia tidak bisa dihubungi"];

/** ACCEPTED: meeting point revealed, payment simulation (renter), check-out photos (provider), both agree on condition. */
export function AcceptedActions({ view }: { view: BookingView }) {
  const { b, role, user, listing } = view;
  const [sheet, setSheet] = useState<"pay" | "cancel" | null>(null);
  const cancelBooking = useAppStore((s) => s.cancelBooking);
  const close = () => setSheet(null);
  const co = b.checkout;
  const isRenter = role === "penyewa";
  const other = otherParty(view);
  const myAgreed = co ? (isRenter ? co.renterAgreedAt : co.providerAgreedAt) : undefined;
  const handoverHref = `/sewaan/${b.id}/serah-terima`;

  let title: string;
  let description: string;
  if (!co) {
    title = isRenter ? "Disetujui! Atur serah terima" : role === "penyedia" ? "Serah terima: foto barang + jaminan" : "Menunggu serah terima";
    description = isRenter
      ? `Ketemu ${publicName(other)} sesuai jadwal. Saat serah terima, penyedia memotret kondisi barang dan jaminanmu, lalu kamu cek di aplikasi.`
      : role === "penyedia"
        ? "Saat ketemu, foto minimal 3 sudut barang dan jaminan penyewa. Sewa baru dimulai setelah kalian berdua setuju kondisinya."
        : "Penyedia belum mengunggah foto check-out.";
  } else if (!myAgreed && role !== "admin") {
    title = "Cek & setujui kondisi barang";
    description = isRenter
      ? "Foto check-out sudah diunggah. Cocokkan dengan barang di tanganmu. Kalau tidak sesuai deskripsi, kamu boleh membatalkan tanpa penalti."
      : "Setujui kondisi barang dan jaminan supaya sewa bisa dimulai.";
  } else {
    title = role === "admin" ? "Menunggu persetujuan kondisi" : `Menunggu ${publicName(other)} menyetujui kondisi`;
    description = "Status berubah jadi Sedang disewa begitu kedua pihak menekan Setuju kondisi.";
  }

  return (
    <>
      <ActionHead title={title} description={description} />

      <div className="mt-4 space-y-3 rounded-[12px] border border-border-gray p-3.5">
        <InfoLine icon={<MapPin className="size-4" />} label="Titik temu (hanya terlihat oleh kalian berdua)">
          <span className="font-medium text-ink">{b.meetingPointDetail ?? "Atur lewat chat"}</span>
        </InfoLine>
        <InfoLine icon={<Handshake className="size-4" />} label="Cara serah terima">
          {HANDOVER_LABEL[b.handover]}
          {listing?.handoverHours ? ` · jam ${listing.handoverHours}` : ""}
        </InfoLine>
        <InfoLine icon={<CalendarDays className="size-4" />} label="Tanggal ambil">
          {formatDate(b.startDate, true)}
        </InfoLine>
      </div>

      {role !== "admin" && (
        <ActionButtons>
          {!co && role === "penyedia" && (
            <CtaLink href={handoverHref}>
              <Camera /> Mulai serah terima (foto check-out)
            </CtaLink>
          )}
          {co && (
            <CtaLink href={handoverHref} variant={myAgreed ? "secondary" : "primary"}>
              <CircleCheck /> {myAgreed ? "Lihat foto serah terima" : "Cek & setujui kondisi"}
            </CtaLink>
          )}
          <ButtonLink href={`/sewaan/${b.id}/chat`} variant="secondary">
            <MessageCircle className="size-4" /> Atur jam ketemu lewat chat
          </ButtonLink>
        </ActionButtons>
      )}

      {isRenter && <RenterPayment view={view} onPay={() => setSheet("pay")} />}
      {role === "penyedia" && b.payment.status === "belum" && (
        <p className="mt-4 text-caption text-smoke">
          Penyewa belum membayar lewat Sewain. Selama pilot, pembayaran boleh tunai/transfer langsung saat ketemu. Serahkan barang setelah pembayaran beres.
        </p>
      )}

      {!co && role !== "admin" && (
        <div className="mt-4 border-t border-border-gray pt-3">
          <button type="button" className="min-h-9 text-body-sm font-medium text-smoke underline-offset-4 hover:text-ink hover:underline" onClick={() => setSheet("cancel")}>
            Batalkan sewa (sebelum serah terima)
          </button>
        </div>
      )}

      <PaymentSheet open={sheet === "pay"} onClose={close} view={view} />
      <ReasonSheet
        open={sheet === "cancel"}
        onClose={close}
        title="Batalkan sewa"
        description={`${publicName(other)} akan diberi tahu beserta alasanmu.`}
        reasons={CANCEL_REASONS}
        confirmLabel="Batalkan sewa"
        successMessage="Sewa dibatalkan."
        note={
          <Notice title="Kebijakan pembatalan">
            {b.agreement.cancellation}.{role === "penyedia" ? " Penyedia yang batal sepihak berulang kali bisa mendapat strike." : ""}
          </Notice>
        }
        onConfirm={(reason) => cancelBooking(user.id, b.id, reason)}
      />
    </>
  );
}

function RenterPayment({ view, onPay }: { view: BookingView; onPay: () => void }) {
  const p = view.b.payment;
  if (p.status === "lunas")
    return (
      <div className="mt-4 flex items-center gap-3 rounded-[12px] bg-soft-gray p-3.5 text-body-sm">
        <Wallet className="size-4 shrink-0 text-ink" />
        <p className="text-graphite">
          <span className="font-semibold text-ink">Lunas {rupiah(p.total)}</span> via {p.method ? PAYMENT_METHOD_LABEL[p.method] : "Sewain"}
          {p.paidAt ? ` · ${formatDateTime(p.paidAt)}` : ""} (simulasi)
        </p>
      </div>
    );
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
}

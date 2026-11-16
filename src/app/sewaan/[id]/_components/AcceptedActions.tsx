"use client";

import { CalendarDays, Camera, CircleCheck, Handshake, MapPin, MessageCircle } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Layout";
import { HANDOVER_LABEL } from "@/lib/data/categories";
import { formatDate } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { ActionButtons, ActionHead, CtaLink, InfoLine } from "./ActionBits";
import { ProviderPaymentNote, RenterPaymentBlock } from "./PaymentMode";
import { PaymentSheet } from "./PaymentSheet";
import { ReasonSheet } from "./Sheets";
import { otherParty, type BookingView } from "./shared";

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

      {isRenter && <RenterPaymentBlock view={view} onPay={() => setSheet("pay")} />}
      {role === "penyedia" && <ProviderPaymentNote view={view} />}

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

"use client";

import { Check, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { KV } from "@/components/ui/Layout";
import { Stars } from "@/components/ui/Stars";
import { HANDOVER_LABEL } from "@/lib/data/categories";
import { formatDateRange, rupiah } from "@/lib/format";
import { describeCollateral } from "@/lib/pricing";
import { isVerified, publicName, userRating } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { AcceptSheet } from "./AcceptSheet";
import { ActionButtons, ActionHead, Countdown } from "./ActionBits";
import { ReasonSheet } from "./Sheets";
import type { BookingView } from "./shared";

const DECLINE_REASONS = ["Barang sedang dipakai", "Barang lagi diservis", "Tanggalnya bentrok", "Lokasi terlalu jauh"];
const CANCEL_REASONS = ["Rencana berubah", "Sudah dapat barang lain", "Salah pilih tanggal"];

/** REQUESTED: provider approves/declines; renter waits (24h expiry) or cancels. */
export function RequestedActions({ view }: { view: BookingView }) {
  const { b, role, now, renter, provider, user } = view;
  const [sheet, setSheet] = useState<"accept" | "decline" | "cancel" | null>(null);
  const declineBooking = useAppStore((s) => s.declineBooking);
  const cancelBooking = useAppStore((s) => s.cancelBooking);
  const users = useAppStore((s) => s.users);
  const reviews = useAppStore((s) => s.reviews);
  const close = () => setSheet(null);
  const a = b.agreement;
  const countdown = <Countdown className="mt-4" label="Kadaluarsa otomatis dalam" until={b.expiresAt} now={now} />;

  if (role === "penyedia") {
    const rating = renter ? userRating({ users, reviews }, renter.id, now) : { rating: 0, count: 0 };
    return (
      <>
        <ActionHead title={`${publicName(renter)} ingin menyewa barangmu`} description="Cek profil dan rating penyewa, lalu setujui atau tolak sebelum batas waktu." />
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-smoke">
          <span className="font-medium text-graphite">{isVerified(renter) ? "Identitas terverifikasi" : "Belum terverifikasi"}</span>
          <Stars rating={rating.rating} count={rating.count} />
        </div>
        {b.note && <blockquote className="mt-3 rounded-[12px] bg-soft-gray p-3 text-body-sm italic text-graphite">“{b.note}”</blockquote>}
        <div className="mt-3">
          <KV k="Tanggal" v={`${formatDateRange(b.startDate, b.endDate)} (${a.quote.days} hari)`} />
          <KV k="Serah terima" v={HANDOVER_LABEL[b.handover]} />
          <KV k="Jaminan dipilih" v={describeCollateral(b.collateral, a.itemValue)} />
          <KV k="Nilai sewa" v={rupiah(a.quote.total)} strong />
        </div>
        {countdown}
        <ActionButtons split>
          <Button variant="secondary" onClick={() => setSheet("decline")}>
            <X className="size-4" /> Tolak
          </Button>
          <Button onClick={() => setSheet("accept")}>
            <Check className="size-4" /> Setujui
          </Button>
        </ActionButtons>
        <AcceptSheet open={sheet === "accept"} onClose={close} view={view} />
        <ReasonSheet
          open={sheet === "decline"}
          onClose={close}
          title="Tolak request"
          description={`${publicName(renter)} akan menerima alasanmu dan bisa mencari barang lain.`}
          reasons={DECLINE_REASONS}
          confirmLabel="Tolak request"
          successMessage="Request ditolak."
          onConfirm={(reason) => declineBooking(user.id, b.id, reason)}
        />
      </>
    );
  }

  if (role === "penyewa") {
    return (
      <>
        <ActionHead title={`Menunggu persetujuan ${publicName(provider)}`} description="Penyedia punya 24 jam untuk merespons. Kamu dapat notifikasi begitu ada jawaban." />
        {countdown}
        <ActionButtons>
          <ButtonLink href={`/sewaan/${b.id}/chat`} variant="secondary">
            <MessageCircle className="size-4" /> Chat penyedia
          </ButtonLink>
          <Button variant="secondary" onClick={() => setSheet("cancel")}>
            Batalkan request
          </Button>
        </ActionButtons>
        <ReasonSheet
          open={sheet === "cancel"}
          onClose={close}
          title="Batalkan request"
          description="Request yang belum disetujui bisa dibatalkan tanpa penalti."
          reasons={CANCEL_REASONS}
          confirmLabel="Batalkan request"
          successMessage="Request dibatalkan."
          onConfirm={(reason) => cancelBooking(user.id, b.id, reason)}
        />
      </>
    );
  }

  return (
    <>
      <ActionHead title="Menunggu respons penyedia" description="Request kadaluarsa otomatis kalau tidak direspons dalam 24 jam." />
      {countdown}
    </>
  );
}

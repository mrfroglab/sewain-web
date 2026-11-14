"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { KV, Notice } from "@/components/ui/Layout";
import { Sheet } from "@/components/ui/Sheet";
import { HANDOVER_LABEL } from "@/lib/data/categories";
import { PUBLIC_MEETING_POINTS } from "@/lib/data/areas";
import { formatDateRange, rupiah } from "@/lib/format";
import { describeCollateral } from "@/lib/pricing";
import { publicName } from "@/lib/selectors";
import { shortHash } from "@/lib/sha256";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import { Chip } from "./ActionBits";
import type { BookingView } from "./shared";

/** Provider approves a request: optional meeting-point detail (revealed to the renter only after ACCEPTED, FR-S6). */
export function AcceptSheet({ open, onClose, view }: { open: boolean; onClose: () => void; view: BookingView }) {
  if (!open) return null;
  return <AcceptSheetInner onClose={onClose} view={view} />;
}

function AcceptSheetInner({ onClose, view }: { onClose: () => void; view: BookingView }) {
  const { b, listing, renter, user } = view;
  const acceptBooking = useAppStore((s) => s.acceptBooking);
  const [detail, setDetail] = useState(listing?.meetingPoint ?? "");
  const a = b.agreement;

  const submit = () => {
    const res = acceptBooking(user.id, b.id, detail);
    if (toastResult(res, `Request disetujui. ${publicName(renter)} sekarang bisa melihat titik temu.`)) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Setujui request"
      description={`Kamu ikut menyetujui kesepakatan sewa dengan ${publicName(renter)}. Detail titik temu baru terlihat oleh penyewa setelah disetujui.`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button className="flex-1" onClick={submit}>
            Setujui request
          </Button>
        </div>
      }
    >
      <div className="rounded-[12px] border border-border-gray px-3.5 py-2">
        <KV k="Tanggal" v={`${formatDateRange(b.startDate, b.endDate)} (${a.quote.days} hari)`} />
        <KV k="Serah terima" v={HANDOVER_LABEL[b.handover]} />
        <KV k="Jaminan" v={describeCollateral(b.collateral, a.itemValue)} />
        <KV k="Denda telat" v={`${rupiah(a.lateFeePerDay)}/hari, maks ${rupiah(a.lateFeeCap)}`} />
        <KV k="Nilai sewa" v={rupiah(a.quote.total)} strong />
        <KV k="Kode kesepakatan" v={<span className="font-mono">{shortHash(a.hash)}</span>} />
      </div>

      <TextArea
        className="mt-4"
        label="Detail titik temu"
        optional
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="Mis. Lobi Perpustakaan Pusat UGM, dekat loker. Aku pakai jaket krem."
        maxLength={200}
        help="Kosongkan kalau mau diatur lewat chat. Jangan tulis alamat rumah lengkap kalau tidak perlu."
      />
      <p className="mb-2 mt-4 flex items-center gap-1.5 text-body-sm font-semibold text-ink">
        <MapPin className="size-4" /> Saran titik temu publik
      </p>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {PUBLIC_MEETING_POINTS.map((p) => (
          <Chip key={p} active={detail === p} onClick={() => setDetail(p)}>
            {p}
          </Chip>
        ))}
      </div>
      <Notice className="mt-4" title="Tips aman">
        Ketemu di tempat ramai, foto kondisi barang + jaminan bareng saat serah terima, dan jangan minta transfer sebelum ketemu.
      </Notice>
    </Sheet>
  );
}

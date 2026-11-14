"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, TextArea, TextField } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { number, rupiah } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Dispute, ProposalType } from "@/lib/types";
import type { BookingCtx } from "../../serah-terima/_shared/BookingFrame";
import { CASE_INFO, PROPOSAL_INFO } from "./cases";

const TYPES = Object.keys(PROPOSAL_INFO) as ProposalType[];

/** "Ajukan solusi" (PRD 11.2 L1 templates). Amounts are capped by what the agreement allows. */
export function ProposalSheet({ ctx, dispute, onClose }: { ctx: BookingCtx; dispute: Dispute; onClose: () => void }) {
  const { user, booking } = ctx;
  const proposeSolution = useAppStore((s) => s.proposeSolution);
  const deposit = booking.payment.deposit;
  const itemValue = booking.agreement.itemValue;
  const suggested = CASE_INFO[dispute.caseType].suggested;
  const [type, setType] = useState<ProposalType | null>(suggested === "potong-deposit" && !deposit ? null : suggested ?? null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");

  const cap = (t: ProposalType | null): { max: number; why: string } | null => {
    if (t === "potong-deposit") return { max: deposit, why: "deposit yang dititipkan" };
    if (t === "ganti-perbaikan") return { max: itemValue, why: "nilai barang di kesepakatan" };
    if (t === "ganti-nilai") return { max: itemValue, why: "nilai barang di kesepakatan; pakai nilai pasar bekas" };
    return null;
  };
  const limit = cap(type);
  const needsAmount = !!type && PROPOSAL_INFO[type].needsAmount;
  const amountError = needsAmount && limit && amount > limit.max ? `Maksimal ${rupiah(limit.max)} (${limit.why}).` : null;
  const valid = !!type && (!needsAmount || (amount > 0 && !amountError));

  const submit = () => {
    if (!type) return;
    const res = proposeSolution(user.id, dispute.id, { type, amount: needsAmount ? amount : undefined, note: note.trim() || undefined });
    if (toastResult(res, "Usulan terkirim. Pihak lain diminta merespons.")) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Ajukan solusi"
      description="Usulan yang masuk akal dan sesuai panduan lebih cepat diterima."
      size="lg"
      footer={
        <Button block size="lg" disabled={!valid} onClick={submit}>
          Kirim usulan
        </Button>
      }
    >
      <div className="space-y-5">
        <p className="rounded-[12px] bg-soft-gray p-3.5 text-caption text-graphite">
          <span className="font-semibold text-ink">Panduan untuk “{CASE_INFO[dispute.caseType].label}”:</span> {CASE_INFO[dispute.caseType].hint}
          {dispute.caseType === "telat" && ` Denda di kesepakatan: ${rupiah(booking.agreement.lateFeePerDay)}/hari, maks ${rupiah(booking.agreement.lateFeeCap)}.`}
        </p>

        <div className="grid gap-2" role="radiogroup" aria-label="Jenis solusi">
          {TYPES.map((t) => {
            const disabled = t === "potong-deposit" && !deposit;
            return (
              <ChoiceCard
                key={t}
                selected={type === t}
                disabled={disabled}
                onClick={() => {
                  setType(t);
                  setAmount(0);
                }}
                title={
                  <>
                    {PROPOSAL_INFO[t].label}
                    {t === suggested && !disabled && <span className="ml-2 text-micro font-medium text-smoke">· sesuai panduan</span>}
                  </>
                }
                description={disabled ? "Tidak ada deposit uang di sewa ini." : PROPOSAL_INFO[t].description}
              />
            );
          })}
        </div>

        {needsAmount && limit && (
          <TextField
            label="Jumlah"
            prefix="Rp"
            inputMode="numeric"
            placeholder="0"
            value={amount ? number(amount) : ""}
            onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "").slice(0, 10)) || 0)}
            error={amountError}
            help={`Maksimal ${rupiah(limit.max)} (${limit.why}).`}
          />
        )}

        <TextArea
          label="Catatan"
          optional
          placeholder={type === "perpanjang" ? "mis. Tambah 1 hari untuk servis, biaya sewa harian ditanggung penyewa." : "Alasan dan dasar hitungannya, mis. estimasi servis dari toko kamera."}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={400}
        />
      </div>
    </Sheet>
  );
}

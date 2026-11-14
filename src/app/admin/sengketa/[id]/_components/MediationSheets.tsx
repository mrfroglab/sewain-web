"use client";

// L2 actions: a written recommendation (adminRecommend) and closing the case (resolveDispute).
// Both sheets mount only while open, so their form state starts fresh each time.

import { Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Layout";
import { Sheet } from "@/components/ui/Sheet";
import { rupiah } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Dispute, ID } from "@/lib/types";
import { chipClass } from "../../../_components/AdminUi";
import { MoneyField, fromNumber, toNumber } from "../../../komisi/_components/NumberField";
import { CASE_GUIDE, RECOMMENDATION_TEMPLATES, outcomeTemplates, type TemplateFacts } from "../../_components/cases";

const MIN_TEXT = 15;

export function RecommendSheet({ dispute, facts, adminId, onClose }: { dispute: Dispute; facts: TemplateFacts; adminId: ID; onClose: () => void }) {
  const adminRecommend = useAppStore((s) => s.adminRecommend);
  const templates = RECOMMENDATION_TEMPLATES[dispute.caseType];
  const prev = dispute.recommendation;
  const [text, setText] = useState(prev?.text ?? "");
  const [amount, setAmount] = useState(fromNumber(prev?.amount));
  // A template keeps rewriting the text (e.g. when the amount changes) until the admin edits it by hand.
  const [tplId, setTplId] = useState<string | null>(null);
  const [textEdited, setTextEdited] = useState(false);
  const [amountTyped, setAmountTyped] = useState(prev?.amount != null);

  const tpl = templates.find((t) => t.id === tplId);
  const amountNum = toNumber(amount);
  const valid = text.trim().length >= MIN_TEXT;

  const pick = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const a = amountTyped ? amountNum : t.amount?.(facts);
    if (!amountTyped) setAmount(fromNumber(a));
    setTplId(id);
    setTextEdited(false);
    setText(t.text(facts, a));
  };
  const changeAmount = (v: string) => {
    setAmount(v);
    setAmountTyped(v !== "");
    if (tpl && !textEdited) setText(tpl.text(facts, toNumber(v)));
  };
  const submit = () => {
    if (!valid) return;
    const ok = toastResult(adminRecommend(adminId, dispute.id, { text: text.trim(), amount: amountNum || undefined }), "Rekomendasi terkirim ke kedua pihak.");
    if (ok) onClose();
  };

  const overDeposit = amountNum != null && facts.deposit > 0 && amountNum > facts.deposit;

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={prev ? "Ubah rekomendasi" : "Tulis rekomendasi"}
      description={`Mediasi L2 · ${CASE_GUIDE[dispute.caseType].label}. Sertakan alasan: bukti mana yang dipakai.`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button className="flex-1" disabled={!valid} onClick={submit}>
            Kirim rekomendasi
          </Button>
        </div>
      }
    >
      <div className="space-y-5 pt-1">
        <div>
          <p className="mb-2 text-caption font-medium text-smoke">Template dari panduan putusan</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button key={t.id} type="button" aria-pressed={tplId === t.id} onClick={() => pick(t.id)} className={chipClass(tplId === t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <TextArea
          label="Rekomendasi tertulis"
          rows={6}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setTextEdited(true);
          }}
          placeholder="Mis. Penyewa mengganti biaya perbaikan wajar Rp…, dipotong dari deposit; sisa deposit dikembalikan."
          help={valid ? "Dikirim ke kedua pihak, muncul di chat sewa, dan tercatat di profil + log audit." : `Minimal ${MIN_TEXT} karakter.`}
        />
        <MoneyField
          label="Nominal"
          optional
          value={amount}
          onChange={changeAmount}
          help={
            overDeposit
              ? `Melebihi deposit ${rupiah(facts.deposit)}: kekurangannya dibayar langsung oleh penyewa.`
              : facts.deposit > 0
                ? `Mis. biaya perbaikan atau potongan deposit. Deposit yang dipegang penyedia: ${rupiah(facts.deposit)}.`
                : "Mis. biaya perbaikan atau ganti rugi. Jaminan booking ini bukan uang deposit."
          }
        />
        <Notice icon={<Info className="size-4" />}>
          Saat pilot, uang tidak lewat Sewain: rekomendasi dijalankan kedua pihak (mis. penyedia memotong deposit). Menolak tanpa alasan atau mengabaikan admin bisa berujung strike → suspend → blacklist (L3).
        </Notice>
      </div>
    </Sheet>
  );
}

export function ResolveSheet({ dispute, adminId, onClose }: { dispute: Dispute; adminId: ID; onClose: () => void }) {
  const resolveDispute = useAppStore((s) => s.resolveDispute);
  const options = outcomeTemplates(dispute);
  const [text, setText] = useState(dispute.recommendation ? options[0].text : "");
  const valid = text.trim().length >= MIN_TEXT;
  const submit = () => {
    if (!valid) return;
    if (toastResult(resolveDispute(adminId, dispute.id, text.trim()), "Sengketa ditutup. Kedua pihak sudah diberi tahu.")) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Tutup sengketa"
      description="Hasil akhir dikirim ke kedua pihak dan booking berubah jadi “Sengketa selesai”."
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button className="flex-1" disabled={!valid} onClick={submit}>
            Tutup sengketa
          </Button>
        </div>
      }
    >
      <div className="space-y-5 pt-1">
        {!dispute.recommendation && (
          <Notice title="Belum ada rekomendasi tertulis">Biasanya admin mengirim rekomendasi dulu (L2) sebelum menutup, supaya alasannya tercatat di profil kedua pihak.</Notice>
        )}
        <div>
          <p className="mb-2 text-caption font-medium text-smoke">Pilih cepat</p>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <button key={o.label} type="button" aria-pressed={text === o.text} onClick={() => setText(o.text)} className={chipClass(text === o.text)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <TextArea label="Hasil akhir" rows={5} value={text} onChange={(e) => setText(e.target.value)} help={valid ? "Tercatat di log audit." : `Minimal ${MIN_TEXT} karakter.`} />
        <p className="text-caption text-smoke">Setelah ditutup: penyedia mengembalikan jaminan atau sisa deposit sesuai hasil ini, penyewa mengonfirmasi, lalu keduanya bisa saling memberi rating.</p>
      </div>
    </Sheet>
  );
}

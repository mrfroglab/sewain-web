// Mediator knowledge base: PRD 11.3 "Panduan putusan per jenis kasus" plus ready-made recommendation
// templates the admin can drop into "Tulis rekomendasi" (L2) and edit before sending.

import { rupiah } from "@/lib/format";
import type { Dispute, DisputeCase, DisputeProposal, ProposalType } from "@/lib/types";

export interface CaseGuide {
  label: string;
  /** Bukti kunci */
  evidence: string;
  /** Rekomendasi default */
  hint: string;
}

export const CASE_GUIDE: Record<DisputeCase, CaseGuide> = {
  "lecet-ringan": {
    label: "Lecet / aus ringan",
    evidence: "Foto check-out vs check-in",
    hint: "Dianggap wajar pakai, tanpa kompensasi. Pembedanya: apakah cacatnya baru dan mengurangi fungsi atau nilai barang.",
  },
  "rusak-ringan": {
    label: "Rusak (bisa diperbaiki)",
    evidence: "Foto + nota/estimasi perbaikan",
    hint: "Penyewa mengganti biaya perbaikan yang wajar, dipotong dari deposit, sisanya dikembalikan.",
  },
  "rusak-berat": {
    label: "Rusak berat",
    evidence: "Foto referensi, nilai barang di listing",
    hint: "Penyewa mengganti nilai pasar barang bekas saat ini (bukan harga baru).",
  },
  hilang: {
    label: "Hilang / kelengkapan kurang",
    evidence: "Foto referensi, nilai barang di listing",
    hint: "Penyewa mengganti nilai pasar bekas barang atau bagian yang hilang. Jaminan yang dipegang penyedia jadi kompensasi awal.",
  },
  telat: {
    label: "Telat kembali",
    evidence: "Kesepakatan sewa + chat",
    hint: "Denda per hari sesuai aturan penyedia, maksimal batas di kesepakatan. Telat lama tanpa kabar dianggap tidak dikembalikan.",
  },
  "tidak-kembali": {
    label: "Tidak dikembalikan / kabur",
    evidence: "KTP terverifikasi, chat, kesepakatan, foto jaminan",
    hint: "Sengketa prioritas → blacklist NIK → penyedia dibantu data untuk jalur L4. Jaminan yang dipegang penyedia jadi kompensasi awal.",
  },
  "jaminan-tidak-kembali": {
    label: "Jaminan tidak dikembalikan",
    evidence: "Foto jaminan check-out, check-in “sesuai”, chat",
    hint: "Penyedia wajib mengembalikan jaminan. Menolak → strike berat → suspend. Dokumen berharga diprioritaskan + bantuan jalur L4.",
  },
  "tidak-sesuai": {
    label: "Tidak sesuai deskripsi",
    evidence: "Foto check-out saat serah terima",
    hint: "Penyewa boleh batal tanpa penalti kalau dilaporkan saat check-out. Penyedia dapat strike kalau terbukti menyesatkan.",
  },
  "batal-sepihak": {
    label: "Penyedia batal sepihak",
    evidence: "Chat, status booking",
    hint: "Strike untuk penyedia. Ada ambang strike untuk penurunan peringkat atau suspend.",
  },
  "no-show": {
    label: "Penyewa tidak datang",
    evidence: "Chat, status booking",
    hint: "Penyedia bebas membatalkan. Strike untuk penyewa.",
  },
  "deposit-ditahan": {
    label: "Deposit ditahan semena-mena",
    evidence: "Foto check-in “sesuai”, chat",
    hint: "Kalau penyedia tidak bisa menunjukkan kerusakan, deposit wajib dikembalikan. Pelanggaran berulang → strike.",
  },
  kendaraan: {
    label: "Kendaraan: tilang / kecelakaan",
    evidence: "Kesepakatan, foto check-out/check-in, waktu kejadian",
    hint: "Tilang dan kerusakan selama masa sewa tanggung jawab penyewa sesuai kesepakatan. Kecelakaan dengan korban di luar kewenangan platform (L4).",
  },
  lainnya: {
    label: "Masalah lain",
    evidence: "Foto, chat, kesepakatan",
    hint: "Putuskan dari bukti yang tercatat. Klaim palsu dari pihak mana pun → strike berat atau suspend.",
  },
};

export const DISPUTE_STATUS_LABEL: Record<Dispute["status"], string> = {
  negosiasi: "Negosiasi",
  mediasi: "Mediasi admin",
  selesai: "Selesai",
};

export const PROPOSAL_LABEL: Record<ProposalType, string> = {
  "potong-deposit": "Potong deposit sebagian",
  "ganti-perbaikan": "Ganti biaya perbaikan",
  "ganti-nilai": "Ganti rugi nilai barang",
  perpanjang: "Perpanjang waktu",
  "tanpa-kompensasi": "Tanpa kompensasi (wajar pakai)",
};

export const PROPOSAL_STATUS: Record<DisputeProposal["status"], { label: string; tone: "outline" | "ink" | "soft" }> = {
  diajukan: { label: "Menunggu respons", tone: "outline" },
  diterima: { label: "Diterima", tone: "ink" },
  ditolak: { label: "Ditolak", tone: "soft" },
};

/* ------------------------------------------------------- templates (L2) */

/** Facts about the booking the templates can quote. */
export interface TemplateFacts {
  renter: string;
  provider: string;
  /** cash deposit held by the provider (0 when the collateral is not a deposit) */
  deposit: number;
  collateral: string; // "titipan KTM/SIM + deposit Rp…"
  itemValue: number;
  lateFeePerDay: number;
  lateFeeCap: number;
  daysLate: number;
  /** last amount proposed in L1 (if any) */
  proposedAmount?: number;
}

export interface RecommendationTemplate {
  id: string;
  label: string;
  /** Default amount for the optional "nominal" field. */
  amount?: (f: TemplateFacts) => number | undefined;
  text: (f: TemplateFacts, amount?: number) => string;
}

const amt = (n?: number) => (n ? rupiah(n) : "Rp…");
const fromDeposit = (f: TemplateFacts) => (f.deposit > 0 ? `dipotong dari deposit ${rupiah(f.deposit)}` : "dibayar langsung ke penyedia");
const rest = (f: TemplateFacts) => (f.deposit > 0 ? " Sisa deposit dikembalikan ke penyewa." : "");

const NO_COMP: RecommendationTemplate = {
  id: "wajar",
  label: "Tanpa kompensasi",
  text: (f) =>
    `Dari perbandingan foto check-out dan check-in, tidak ada cacat baru yang mengurangi fungsi atau nilai barang. Dianggap wajar pakai, tanpa kompensasi. ${f.provider} mengembalikan jaminan (${f.collateral}) utuh ke ${f.renter}.`,
};

const REPAIR: RecommendationTemplate = {
  id: "perbaikan",
  label: "Ganti biaya perbaikan",
  amount: (f) => f.proposedAmount,
  text: (f, a) =>
    `Penyewa mengganti biaya perbaikan wajar ${amt(a)}, ${fromDeposit(f)}.${rest(f)} ${f.provider} melampirkan nota/estimasi servis di chat sewa.`,
};

const SPLIT: RecommendationTemplate = {
  id: "bagi-dua",
  label: "Bagi dua biaya",
  amount: (f) => (f.proposedAmount ? Math.round(f.proposedAmount / 2 / 1000) * 1000 : undefined),
  text: (f, a) =>
    `Bukti belum sepenuhnya jelas (cacat tidak terlihat di foto check-out, tapi juga tidak ada close-up di foto referensi). Biaya perbaikan ditanggung bersama: ${f.renter} membayar ${amt(a)}, ${fromDeposit(f)}.${rest(f)}`,
};

const MARKET_VALUE: RecommendationTemplate = {
  id: "nilai-bekas",
  label: "Ganti nilai bekas",
  amount: (f) => f.proposedAmount,
  text: (f, a) =>
    `Penyewa mengganti nilai pasar barang bekas saat ini ${amt(a)} (bukan harga baru; nilai di kesepakatan ${rupiah(f.itemValue)}). Jaminan yang dipegang ${f.provider} dipakai sebagai kompensasi awal, kekurangannya dilunasi paling lambat 7 hari.`,
};

const NOT_PROVEN: RecommendationTemplate = {
  id: "tidak-terbukti",
  label: "Klaim tidak terbukti",
  text: (f) =>
    `Kerusakan tidak terbukti baru: kondisinya sudah terlihat di foto referensi atau check-out. Tanpa kompensasi, jaminan (${f.collateral}) dikembalikan utuh ke ${f.renter}.`,
};

export const RECOMMENDATION_TEMPLATES: Record<DisputeCase, RecommendationTemplate[]> = {
  "lecet-ringan": [
    NO_COMP,
    {
      id: "cacat-baru",
      label: "Cacat baru mengurangi nilai",
      amount: (f) => f.proposedAmount,
      text: (f, a) => `Foto check-out vs check-in menunjukkan cacat baru yang mengurangi nilai barang. ${f.renter} mengganti ${amt(a)}, ${fromDeposit(f)}.${rest(f)}`,
    },
  ],
  "rusak-ringan": [REPAIR, SPLIT, NOT_PROVEN],
  "rusak-berat": [MARKET_VALUE, REPAIR, NOT_PROVEN],
  hilang: [
    {
      id: "ganti-bagian",
      label: "Ganti bagian yang hilang",
      amount: (f) => f.proposedAmount,
      text: (f, a) => `Kelengkapan yang hilang diganti senilai ${amt(a)} (harga bekas wajar), ${fromDeposit(f)}.${rest(f)}`,
    },
    MARKET_VALUE,
  ],
  telat: [
    {
      id: "denda",
      label: "Denda telat",
      amount: (f) => (f.daysLate > 0 ? Math.min(f.daysLate * f.lateFeePerDay, f.lateFeeCap) : undefined),
      text: (f, a) =>
        `Telat ${f.daysLate || "…"} hari × ${rupiah(f.lateFeePerDay)} = ${amt(a)} (batas denda di kesepakatan ${rupiah(f.lateFeeCap)}), ${fromDeposit(f)}.${rest(f)}`,
    },
    {
      id: "dianggap-hilang",
      label: "Dianggap tidak kembali",
      text: (f) => `Telat lama tanpa kabar: barang dianggap tidak dikembalikan. Jaminan (${f.collateral}) jadi kompensasi awal untuk ${f.provider}; kasus naik ke L3 dan ${f.provider} dibantu data untuk jalur L4.`,
    },
  ],
  "tidak-kembali": [
    {
      id: "prioritas",
      label: "Prioritas + blacklist",
      text: (f) =>
        `Sengketa prioritas. Jaminan yang dipegang ${f.provider} (${f.collateral}) jadi kompensasi awal sesuai kesepakatan. Akun ${f.renter} diblokir (blacklist NIK) dan ${f.provider} dibantu data bukti untuk jalur hukum (L4).`,
    },
  ],
  "jaminan-tidak-kembali": [
    {
      id: "kembalikan",
      label: "Wajib kembalikan jaminan",
      text: (f) => `Check-in tercatat “sesuai”. ${f.provider} wajib mengembalikan jaminan (${f.collateral}) ke ${f.renter} paling lambat 1×24 jam. Menolak → strike berat lalu suspend.`,
    },
  ],
  "tidak-sesuai": [
    {
      id: "batal",
      label: "Batal tanpa penalti",
      text: (f) => `Barang terbukti tidak sesuai deskripsi saat serah terima. ${f.renter} batal tanpa penalti, uang sewa dan jaminan dikembalikan penuh. ${f.provider} mendapat strike karena deskripsi menyesatkan.`,
    },
  ],
  "batal-sepihak": [
    {
      id: "strike-penyedia",
      label: "Strike penyedia",
      text: (f) => `${f.provider} membatalkan sepihak setelah request disetujui. Uang sewa dikembalikan penuh ke ${f.renter}; strike ringan untuk ${f.provider}.`,
    },
  ],
  "no-show": [
    {
      id: "strike-penyewa",
      label: "Strike penyewa",
      text: (f) => `${f.renter} tidak datang tanpa kabar. ${f.provider} bebas membatalkan tanpa kewajiban apa pun; strike ringan untuk ${f.renter}.`,
    },
  ],
  "deposit-ditahan": [
    {
      id: "kembalikan-deposit",
      label: "Kembalikan deposit",
      amount: (f) => f.deposit || undefined,
      text: (f, a) => `${f.provider} tidak bisa menunjukkan kerusakan (check-in “sesuai”). Deposit ${amt(a)} wajib dikembalikan utuh ke ${f.renter} paling lambat 1×24 jam.`,
    },
  ],
  kendaraan: [
    {
      id: "tanggung-penyewa",
      label: "Tanggungan penyewa",
      amount: (f) => f.proposedAmount,
      text: (f, a) => `Tilang/kerusakan terjadi selama masa sewa, jadi tanggung jawab ${f.renter} sesuai kesepakatan: mengganti ${amt(a)}, ${fromDeposit(f)}.${rest(f)}`,
    },
  ],
  lainnya: [
    {
      id: "umum",
      label: "Kerangka umum",
      amount: (f) => f.proposedAmount,
      text: (f, a) => `Berdasarkan foto, chat, dan kesepakatan sewa: … ${a ? `${f.renter} membayar ${rupiah(a)}, ${fromDeposit(f)}.` : ""}`.trim(),
    },
    NO_COMP,
  ],
};

/** Quick outcomes for "Tutup sengketa". */
export function outcomeTemplates(d: Dispute): { label: string; text: string }[] {
  return [
    ...(d.recommendation ? [{ label: "Sesuai rekomendasi", text: `Selesai sesuai rekomendasi admin: ${d.recommendation.text}` }] : []),
    { label: "Damai setelah mediasi", text: "Kedua pihak sepakat damai setelah mediasi. Jaminan dikembalikan sesuai kesepakatan." },
    { label: "Klaim tidak terbukti", text: "Klaim tidak terbukti dari foto dan chat. Jaminan dikembalikan utuh ke penyewa." },
    { label: "Lanjut jalur L4", text: "Kasus dilanjutkan ke jalur eksternal (L4) atas permintaan pihak yang dirugikan. Sengketa di platform ditutup." },
  ];
}

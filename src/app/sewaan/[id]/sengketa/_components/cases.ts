// Dispute case catalog (PRD 11.3 "Panduan putusan per jenis kasus") and solution templates (PRD 11.2 L1).

import type { Dispute, DisputeCase, ProposalType } from "@/lib/types";

export interface CaseInfo {
  label: string;
  /** Bukti kunci */
  evidence: string;
  /** Rekomendasi default */
  hint: string;
  /** Pre-selected template in "Ajukan solusi" */
  suggested?: ProposalType;
}

export const CASE_INFO: Record<DisputeCase, CaseInfo> = {
  "lecet-ringan": {
    label: "Lecet / aus ringan",
    evidence: "Foto check-out vs check-in",
    hint: "Biasanya dianggap wajar pakai, tanpa kompensasi. Pembedanya: apakah cacatnya baru dan mengurangi fungsi atau nilai.",
    suggested: "tanpa-kompensasi",
  },
  "rusak-ringan": {
    label: "Rusak (bisa diperbaiki)",
    evidence: "Foto + nota/estimasi perbaikan",
    hint: "Penyewa mengganti biaya perbaikan yang wajar, dipotong dari deposit, sisanya dikembalikan.",
    suggested: "ganti-perbaikan",
  },
  "rusak-berat": {
    label: "Rusak berat",
    evidence: "Foto referensi, nilai barang di kesepakatan",
    hint: "Penyewa mengganti nilai pasar barang bekas saat ini, bukan harga baru.",
    suggested: "ganti-nilai",
  },
  hilang: {
    label: "Hilang / kelengkapan kurang",
    evidence: "Foto referensi & check-out, nilai barang di kesepakatan",
    hint: "Penyewa mengganti nilai pasar bekas barang atau bagian yang hilang. Jaminan yang dipegang penyedia jadi kompensasi awal.",
    suggested: "ganti-nilai",
  },
  telat: {
    label: "Telat kembali",
    evidence: "Kesepakatan sewa + chat",
    hint: "Denda per hari sesuai aturan penyedia, maksimal batas di kesepakatan. Telat lama tanpa kabar dianggap tidak dikembalikan.",
    suggested: "potong-deposit",
  },
  "tidak-kembali": {
    label: "Barang tidak dikembalikan / kabur",
    evidence: "KTP terverifikasi, chat, kesepakatan, foto jaminan",
    hint: "Sengketa prioritas: blacklist NIK, dan penyedia dibantu data untuk jalur hukum (L4). Jaminan yang dipegang jadi kompensasi awal.",
  },
  "jaminan-tidak-kembali": {
    label: "Jaminan tidak dikembalikan penyedia",
    evidence: "Foto jaminan check-out, check-in “sesuai”, chat",
    hint: "Penyedia wajib mengembalikan jaminan. Menolak → strike berat → suspend. Dokumen berharga diprioritaskan.",
  },
  "deposit-ditahan": {
    label: "Deposit ditahan semena-mena",
    evidence: "Foto check-in “sesuai”, chat",
    hint: "Kalau penyedia tidak bisa menunjukkan kerusakan, deposit wajib dikembalikan. Pelanggaran berulang → strike.",
  },
  "tidak-sesuai": {
    label: "Barang tidak sesuai deskripsi",
    evidence: "Foto check-out saat serah terima",
    hint: "Kalau dilaporkan saat serah terima, penyewa boleh batal tanpa penalti. Penyedia mendapat strike kalau terbukti menyesatkan.",
  },
  "batal-sepihak": {
    label: "Penyedia batal sepihak",
    evidence: "Chat, status booking",
    hint: "Strike untuk penyedia. Strike berulang bisa menurunkan peringkat atau suspend.",
  },
  "no-show": {
    label: "Penyewa tidak datang",
    evidence: "Chat, status booking",
    hint: "Penyedia bebas membatalkan. Strike untuk penyewa.",
  },
  kendaraan: {
    label: "Kendaraan: tilang / kecelakaan",
    evidence: "Kesepakatan, foto check-out/check-in, waktu kejadian",
    hint: "Tilang dan kerusakan selama masa sewa jadi tanggung jawab penyewa sesuai kesepakatan. Kecelakaan dengan korban di luar kewenangan platform (L4).",
    suggested: "ganti-perbaikan",
  },
  lainnya: {
    label: "Masalah lain",
    evidence: "Foto, chat, kesepakatan",
    hint: "Jelaskan sejelas mungkin dengan bukti. Klaim palsu (dari pihak mana pun) bisa berujung strike berat atau suspend.",
  },
};

/** Groups for the "Laporkan masalah" picker. */
export const CASE_GROUPS: { title: string; cases: DisputeCase[] }[] = [
  { title: "Kondisi barang", cases: ["lecet-ringan", "rusak-ringan", "rusak-berat", "hilang"] },
  { title: "Waktu & pengembalian", cases: ["telat", "tidak-kembali"] },
  { title: "Jaminan & deposit", cases: ["jaminan-tidak-kembali", "deposit-ditahan"] },
  { title: "Kesepakatan & perilaku", cases: ["tidak-sesuai", "batal-sepihak", "no-show", "kendaraan", "lainnya"] },
];

export const PROPOSAL_INFO: Record<ProposalType, { label: string; description: string; needsAmount: boolean }> = {
  "potong-deposit": { label: "Potong deposit sebagian", description: "Sebagian deposit ditahan penyedia, sisanya dikembalikan.", needsAmount: true },
  "ganti-perbaikan": { label: "Ganti biaya perbaikan", description: "Penyewa membayar biaya servis yang wajar (lampirkan nota/estimasi di chat).", needsAmount: true },
  "ganti-nilai": { label: "Ganti rugi nilai barang", description: "Nilai pasar barang bekas saat ini, bukan harga baru.", needsAmount: true },
  perpanjang: { label: "Perpanjang waktu", description: "Tambah waktu sewa, mis. untuk memperbaiki atau mencari bagian yang hilang.", needsAmount: false },
  "tanpa-kompensasi": { label: "Tanpa kompensasi (wajar pakai)", description: "Dianggap wajar pakai. Jaminan dikembalikan utuh.", needsAmount: false },
};

export const DISPUTE_STATUS_LABEL: Record<Dispute["status"], string> = {
  negosiasi: "Negosiasi",
  mediasi: "Mediasi admin",
  selesai: "Selesai",
};

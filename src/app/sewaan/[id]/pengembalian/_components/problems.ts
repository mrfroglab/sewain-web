// Problem types at check-in (PRD 10.1) with the default guidance from PRD 11.3.
// The store maps the label to a dispute case (hilang/kurang → hilang, berat → rusak-berat, lecet/gores → lecet-ringan, else rusak-ringan).

export const PROBLEM_TYPES: { label: string; hint: string }[] = [
  { label: "Lecet / goresan baru", hint: "Lecet atau aus ringan biasanya dianggap wajar pakai, tanpa kompensasi — kecuali cacatnya baru dan mengurangi fungsi atau nilai barang." },
  { label: "Rusak ringan (bisa diperbaiki)", hint: "Penyewa mengganti biaya perbaikan yang wajar (lampirkan nota/estimasi), dipotong dari deposit, sisanya dikembalikan." },
  { label: "Rusak berat", hint: "Penyewa mengganti nilai pasar barang bekas saat ini, bukan harga baru." },
  { label: "Kelengkapan kurang / hilang sebagian", hint: "Penyewa mengganti nilai pasar bekas bagian yang hilang. Jaminan yang kamu pegang jadi kompensasi awal sesuai kesepakatan." },
  { label: "Kotor / perlu dibersihkan", hint: "Biaya bersih-bersih yang wajar bisa dinegosiasikan. Foto bagian yang kotor." },
  { label: "Lainnya", hint: "Jelaskan di catatan dan lampirkan foto. Bukti dulu, opini belakangan." },
];

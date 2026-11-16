import type { Category, CategoryId } from "../types";

export const CATEGORIES: Category[] = [
  {
    id: "camping",
    name: "Camping & Hiking",
    descriptor: "Naik gunung tanpa beli alat",
    examples: "Tenda, carrier, sleeping bag",
    image: "/img/categories/camping.webp",
    checklist: ["Tenda lengkap (frame, pasak, flysheet)", "Resleting berfungsi", "Tidak bocor / sobek"],
  },
  {
    id: "kamera",
    name: "Kamera & Foto",
    descriptor: "Dokumentasi, tugas film, wisuda",
    examples: "Mirrorless, lensa, tripod",
    image: "/img/categories/kamera.webp",
    risk: "elektronik",
    checklist: ["Bisa menyala", "Lensa tidak berjamur", "Baterai & charger ikut", "Kartu memori dikosongkan"],
  },
  {
    id: "pakaian-acara",
    name: "Pakaian Acara",
    descriptor: "Sidang, seminar, wisuda",
    examples: "Blazer, kebaya, jas, pantofel",
    image: "/img/categories/pakaian-acara.webp",
    checklist: ["Bersih / sudah laundry", "Kancing & resleting lengkap", "Tidak ada noda baru"],
  },
  {
    id: "elektronik",
    name: "Elektronik & Presentasi",
    descriptor: "Seminar, nobar, acara himpunan",
    examples: "Proyektor, speaker, mic",
    image: "/img/categories/elektronik.webp",
    risk: "elektronik",
    checklist: ["Bisa menyala", "Kabel & adaptor lengkap", "Remote berfungsi"],
  },
  {
    id: "alat-masak",
    name: "Alat Masak",
    descriptor: "Acara besar, KKN, syukuran",
    examples: "Panci besar, kompor, rice cooker",
    image: "/img/categories/alat-masak.webp",
    risk: "listrik",
    checklist: ["Selang & regulator tidak bocor", "Bersih setelah dipakai", "Tutup & gagang lengkap"],
  },
  {
    id: "musim-hujan",
    name: "Musim Hujan",
    descriptor: "Sedia payung sebelum hujan",
    examples: "Payung, jas hujan, sepatu boot",
    image: "/img/categories/musim-hujan.webp",
  },
  {
    id: "kendaraan",
    name: "Kendaraan",
    descriptor: "Motor untuk KKN dan mudik dekat",
    examples: "Motor matic, helm",
    image: "/img/categories/kendaraan.webp",
    risk: "kendaraan",
    checklist: ["Rem berfungsi", "Lampu & sein menyala", "Klakson berfungsi", "STNK & 2 helm ikut"],
  },
  {
    id: "olahraga",
    name: "Olahraga",
    descriptor: "Main bareng tanpa modal alat",
    examples: "Raket, bola, sepeda lipat",
    image: "/img/categories/olahraga.webp",
    risk: "keselamatan",
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

export const categoryName = (id: CategoryId) => CATEGORY_BY_ID[id]?.name ?? id;

/** Disclaimers shown for high-risk categories (PRD 12.3). */
export const RISK_NOTES: Record<NonNullable<Category["risk"]>, string> = {
  kendaraan:
    "Kendaraan bermotor: penyewa wajib punya SIM sesuai golongan, foto odometer + BBM saat serah terima, dan tilang/kerusakan selama sewa jadi tanggung jawab penyewa.",
  elektronik: "Elektronik bernilai tinggi: cek fungsi bareng saat serah terima dan pertimbangkan deposit.",
  keselamatan: "Alat keselamatan/olahraga: penyewa bertanggung jawab memeriksa dan memakai alat dengan benar.",
  listrik: "Alat masak bertekanan/listrik: foto kondisi selang, regulator, dan kabel saat serah terima.",
};

/** Kategori terlarang (PRD 12.2) — shown disabled in the listing form, never selectable (FR-L4). */
export const FORBIDDEN_CATEGORIES = [
  "Senjata api, granat, dan senjata lain",
  "Bahan peledak dan bahan kimia berbahaya",
  "Senjata tajam non-peralatan",
  "Narkotika, obat resep, obat terlarang",
  "Konten/barang dewasa",
  "Hewan",
  "Dokumen identitas, ijazah, uang, surat berharga (sebagai barang sewaan)",
  "Barang bajakan atau hasil kejahatan",
];

/** Default banned keyword list (admin can edit, FR-L4). Matched case-insensitively on whole words. */
export const DEFAULT_BANNED_KEYWORDS = [
  "senjata",
  "pistol",
  "senapan",
  "airsoft",
  "granat",
  "peledak",
  "petasan",
  "mercon",
  "narkoba",
  "ganja",
  "sabu",
  "obat keras",
  "obat resep",
  "miras",
  "ijazah",
  "ktp asli",
  "sertifikat tanah",
  "bajakan",
  "kucing",
  "anjing",
  "burung",
];

export const HANDOVER_LABEL = {
  cod: "COD / ketemuan",
  jemput: "Ambil di tempat penyedia",
  kurir: "Kurir (diurus penyewa)",
  antar: "Diantar penyedia",
} as const;

export const ID_CARDS = ["KTM", "SIM", "Kartu pelajar", "Kartu pegawai", "e-KTP"];

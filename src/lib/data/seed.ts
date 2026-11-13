// Demo data (PRD 7.2): ±40 listings around UGM, 3 renters, 3 providers (incl. 1 Toko), 1 admin,
// and one booking in every status so the demo can jump to any stage.
// Everything is generated relative to `now` so countdowns (24h expiry, overdue, 48h auto-complete) stay meaningful.

import { addDays, isoDate } from "../format";
import { collateralValue, computeCommission, depositCash, quoteRent, suggestCollateral } from "../pricing";
import { sha256Text } from "../sha256";
import { AREA_BY_ID } from "./areas";
import { DEFAULT_BANNED_KEYWORDS } from "./categories";
import type {
  AppNotification,
  AreaId,
  AuditEntry,
  Booking,
  BookingStatus,
  CategoryId,
  CollateralOption,
  CollateralRules,
  CommissionConfig,
  DataState,
  Dispute,
  HandoverMethod,
  Listing,
  Message,
  PhotoRecord,
  Report,
  Review,
  Strike,
  User,
  VerificationRequest,
  WantedPost,
} from "../types";

export const DATA_VERSION = 3;

const H = 3_600_000;
const D = 86_400_000;

export const DEFAULT_COLLATERAL_RULES = (now: number): CollateralRules => ({
  lowMax: 500_000,
  midMax: 2_000_000,
  midDepositPercent: 25,
  highDepositPercent: 40,
  vehicleDepositPercent: 30,
  highValueBadge: 2_000_000,
  updatedAt: now - 20 * D,
  updatedBy: "u-admin",
});

export const DEFAULT_COMMISSION = (now: number): CommissionConfig => ({
  active: false, // pilot: 0% (PRD 14.2)
  mode: "persen",
  percent: 10,
  flat: 3_000,
  min: 2_000,
  max: 50_000,
  bearer: "penyewa",
  splitRenterPercent: 50,
  updatedAt: now - 20 * D,
  updatedBy: "u-admin",
});

/* ------------------------------------------------------------------ users */

function seedUsers(now: number): User[] {
  const verified = (daysAgo: number, nik: string, method: "ekyc" | "demo" | "manual" = "ekyc") => ({
    status: "terverifikasi" as const,
    method,
    verifiedAt: now - daysAgo * D,
    nikMasked: nik,
  });
  return [
    {
      id: "u-raka",
      name: "Raka Pratama",
      phone: "081227340011",
      email: "raka.pratama@mail.ugm.ac.id",
      role: "user",
      accountType: "individu",
      verification: verified(40, "3374********0011"),
      areaId: "pogung",
      campus: "UGM",
      studentVerified: true,
      bio: "Mahasiswa Teknik Geodesi semester 5. Suka naik gunung kalau long weekend.",
      joinedAt: now - 62 * D,
      strikes: 0,
      status: "aktif",
      baseRating: 4.8,
      baseRatingCount: 6,
      demo: { label: "Raka", persona: "Penyewa · mahasiswa, mau naik gunung long weekend" },
    },
    {
      id: "u-sinta",
      name: "Sinta Maharani",
      phone: "085640221877",
      email: "sinta.m@mail.ugm.ac.id",
      role: "user",
      accountType: "individu",
      verification: verified(35, "3471********0042"),
      areaId: "karangmalang",
      campus: "UGM",
      studentVerified: true,
      bio: "Mahasiswi FEB, sering ngurus acara himpunan.",
      joinedAt: now - 50 * D,
      strikes: 0,
      status: "aktif",
      baseRating: 4.9,
      baseRatingCount: 9,
      demo: { label: "Sinta", persona: "Penyewa · panitia acara himpunan" },
    },
    {
      id: "u-bima",
      name: "Bima Saputra",
      phone: "082134900776",
      role: "user",
      accountType: "individu",
      verification: { status: "belum" },
      areaId: "sendowo",
      campus: "UGM",
      joinedAt: now - 1 * D,
      strikes: 0,
      status: "aktif",
      demo: { label: "Bima", persona: "Pengguna baru · belum verifikasi KTP (hanya bisa menjelajah)" },
    },
    {
      id: "u-dina",
      name: "Dina Ayu Lestari",
      phone: "087738120934",
      email: "dina.ayu@mail.ugm.ac.id",
      role: "user",
      accountType: "individu",
      verification: verified(55, "3404********0087"),
      areaId: "sendowo",
      campus: "UGM",
      studentVerified: true,
      earlyLender: true,
      bio: "Fotografer lepas, mahasiswi Ilmu Komunikasi. Alat dirawat, lensa disimpan di dry box.",
      joinedAt: now - 70 * D,
      strikes: 0,
      status: "aktif",
      baseRating: 4.9,
      baseRatingCount: 23,
      demo: { label: "Dina", persona: "Penyedia · kamera & alat foto" },
    },
    {
      id: "u-tini",
      name: "Tini Rahayu",
      nickname: "Bu Tini",
      phone: "081392004418",
      role: "user",
      accountType: "individu",
      verification: verified(48, "3404********0019", "manual"),
      areaId: "klebengan",
      earlyLender: true,
      bio: "Warung makan dekat kampus. Alat masak besar bisa disewa untuk acara. Serah terima di warung saja ya.",
      joinedAt: now - 66 * D,
      strikes: 0,
      status: "aktif",
      baseRating: 4.8,
      baseRatingCount: 17,
      demo: { label: "Bu Tini", persona: "Penyedia · pemilik warung, alat masak besar" },
    },
    {
      id: "u-bayu",
      name: "Bayu Nugroho",
      nickname: "Mas Bayu",
      phone: "081578904412",
      email: "bayuoutdoor@gmail.com",
      role: "user",
      accountType: "toko",
      store: { name: "Bayu Outdoor & Kamera", areaId: "pogung", hours: "09.00–21.00" },
      verification: verified(68, "3404********0063"),
      areaId: "pogung",
      earlyLender: true,
      bio: "Rental alat camping & kamera sejak 2021. Pelanggan kebanyakan mahasiswa.",
      joinedAt: now - 75 * D,
      strikes: 0,
      status: "aktif",
      baseRating: 4.8,
      baseRatingCount: 112,
      demo: { label: "Mas Bayu", persona: "Penyedia akun Toko · rental camping & kamera di Pogung" },
    },
    {
      id: "u-admin",
      name: "Naila (Admin Sewain)",
      nickname: "Admin Sewain",
      phone: "080000000000",
      email: "admin@sewain.me",
      role: "admin",
      accountType: "individu",
      verification: verified(90, "-", "manual"),
      areaId: "ugm",
      joinedAt: now - 90 * D,
      strikes: 0,
      status: "aktif",
      demo: { label: "Admin", persona: "Admin · identitas, laporan, sengketa, komisi" },
    },
    // Other providers (not in the quick switcher list, but they are real accounts)
    {
      id: "u-fajar",
      name: "Fajar Ramadhan",
      phone: "089612340987",
      role: "user",
      accountType: "individu",
      verification: verified(30, "3402********0024"),
      areaId: "karangwuni",
      bio: "Punya dua motor yang jarang kepakai sejak kerja remote.",
      joinedAt: now - 45 * D,
      strikes: 0,
      status: "aktif",
      baseRating: 4.7,
      baseRatingCount: 14,
    },
    {
      id: "u-laras",
      name: "Larasati Putri",
      phone: "081904456120",
      role: "user",
      accountType: "individu",
      verification: verified(28, "3471********0055"),
      areaId: "karangmalang",
      campus: "UNY",
      bio: "Koleksi baju acara, semua sudah laundry sebelum disewakan.",
      joinedAt: now - 40 * D,
      strikes: 0,
      status: "aktif",
      baseRating: 4.9,
      baseRatingCount: 31,
    },
    {
      id: "u-nadia",
      name: "Nadia Kusuma",
      phone: "082242110093",
      role: "user",
      accountType: "individu",
      verification: verified(26, "3471********0071"),
      areaId: "terban",
      campus: "UGM",
      bio: "Alat presentasi & sound kecil untuk acara kampus.",
      joinedAt: now - 38 * D,
      strikes: 0,
      status: "aktif",
      baseRating: 4.7,
      baseRatingCount: 19,
    },
    {
      id: "u-yoga",
      name: "Yoga Prasetyo",
      phone: "085701239984",
      role: "user",
      accountType: "individu",
      verification: verified(22, "3404********0038"),
      areaId: "condongcatur",
      campus: "UPN",
      bio: "Anak futsal & badminton. Alat olahraga nganggur di kos.",
      joinedAt: now - 33 * D,
      strikes: 0,
      status: "aktif",
      baseRating: 4.6,
      baseRatingCount: 12,
    },
    {
      id: "u-gilang",
      name: "Gilang Mahendra",
      phone: "081311567023",
      role: "user",
      accountType: "individu",
      verification: { status: "menunggu", method: "manual" },
      areaId: "pogung",
      campus: "UGM",
      joinedAt: now - 2 * D,
      strikes: 0,
      status: "aktif",
    },
    {
      id: "u-putri",
      name: "Putri Anggraini",
      phone: "087812009331",
      role: "user",
      accountType: "individu",
      verification: { status: "menunggu", method: "manual" },
      areaId: "sendowo",
      campus: "UGM",
      joinedAt: now - 1 * D,
      strikes: 0,
      status: "aktif",
    },
    {
      id: "u-arif",
      name: "Arif Hidayat",
      phone: "081227778100",
      role: "user",
      accountType: "individu",
      verification: verified(20, "3404********0092"),
      areaId: "terban",
      joinedAt: now - 25 * D,
      strikes: 1,
      status: "aktif",
      baseRating: 3.9,
      baseRatingCount: 4,
    },
    {
      id: "u-maya",
      name: "Maya Larasati",
      phone: "085600771234",
      role: "user",
      accountType: "individu",
      verification: verified(18, "3471********0018"),
      areaId: "karangwuni",
      campus: "UGM",
      joinedAt: now - 30 * D,
      strikes: 0,
      status: "aktif",
      baseRating: 5,
      baseRatingCount: 5,
    },
    {
      id: "u-dimas",
      name: "Dimas Aditya",
      phone: "081393009812",
      role: "user",
      accountType: "individu",
      verification: verified(16, "3404********0077"),
      areaId: "klebengan",
      campus: "UGM",
      joinedAt: now - 27 * D,
      strikes: 0,
      status: "aktif",
      baseRating: 4.8,
      baseRatingCount: 7,
    },
  ];
}

/* --------------------------------------------------------------- listings */

interface ListingSeed {
  slug: string;
  title: string;
  category: CategoryId;
  ownerId: string;
  pricePerDay: number;
  itemValue: number;
  description: string;
  condition: string;
  pricePerWeek?: number;
  pricePerHour?: number;
  durationDiscount?: { minDays: number; percent: number };
  /** "auto" = use the automatic suggestion; "identitas" = identity only (may trigger a warning) */
  collateral?: "auto" | "identitas" | "auto+identitas";
  handover?: HandoverMethod[];
  stock?: number;
  approval?: "manual" | "otomatis";
  special?: string;
  vehicle?: Listing["vehicle"];
  minDays?: number;
  maxDays?: number;
}

const OWNER_DEFAULTS: Record<string, { areaId: AreaId; radiusKm: number; meetingPoint: string; hours: string }> = {
  "u-bayu": { areaId: "pogung", radiusKm: 5, meetingPoint: "Toko Bayu Outdoor, Jl. Pogung Baru (ambil di toko)", hours: "09.00–21.00" },
  "u-dina": { areaId: "sendowo", radiusKm: 3, meetingPoint: "Lobi Perpustakaan Pusat UGM", hours: "15.00–20.00" },
  "u-tini": { areaId: "klebengan", radiusKm: 1.5, meetingPoint: "Warung Bu Tini, Klebengan (ambil di warung)", hours: "08.00–14.00" },
  "u-fajar": { areaId: "karangwuni", radiusKm: 6, meetingPoint: "Minimarket Jl. Kaliurang km 5", hours: "07.00–20.00" },
  "u-laras": { areaId: "karangmalang", radiusKm: 4, meetingPoint: "Depan Masjid Kampus UGM", hours: "16.00–21.00" },
  "u-nadia": { areaId: "terban", radiusKm: 5, meetingPoint: "Bundaran UGM (sisi utara)", hours: "10.00–20.00" },
  "u-yoga": { areaId: "condongcatur", radiusKm: 5, meetingPoint: "Depan Gerbang Fakultas Teknik UGM", hours: "16.00–21.00" },
};

export const LISTING_SEEDS: ListingSeed[] = [
  // Camping & Hiking
  { slug: "tenda-dome-4p", title: "Tenda dome kapasitas 4 orang", category: "camping", ownerId: "u-bayu", pricePerDay: 35_000, pricePerWeek: 200_000, itemValue: 1_200_000, stock: 3, durationDiscount: { minDays: 3, percent: 10 }, approval: "otomatis", description: "Tenda double layer, flysheet tahan hujan, muat 4 orang + carrier. Sudah termasuk pasak, frame, dan tas.", condition: "Ada bekas tambalan kecil di flysheet sisi belakang (tidak bocor)." },
  { slug: "carrier-60l", title: "Carrier 60L + rain cover", category: "camping", ownerId: "u-bayu", pricePerDay: 25_000, pricePerWeek: 140_000, itemValue: 900_000, stock: 4, approval: "otomatis", description: "Carrier 60 liter dengan backsystem adjustable dan rain cover. Cocok untuk pendakian 2–3 hari.", condition: "Warna sedikit pudar di bagian bawah, resleting normal." },
  { slug: "sleeping-bag", title: "Sleeping bag polar tahan dingin", category: "camping", ownerId: "u-bayu", pricePerDay: 10_000, itemValue: 250_000, stock: 6, approval: "otomatis", collateral: "auto", description: "Sleeping bag model mummy dengan lapisan polar, nyaman sampai suhu ±10°C. Dicuci setelah setiap sewa.", condition: "Normal, tidak ada sobek." },
  { slug: "matras-camping", title: "Matras camping lipat", category: "camping", ownerId: "u-bayu", pricePerDay: 5_000, itemValue: 120_000, stock: 8, approval: "otomatis", description: "Matras foam lipat model zigzag, ringan dan ada lapisan alumunium.", condition: "Ada lecet halus di permukaan atas." },
  { slug: "kompor-lapangan", title: "Kompor lapangan + nesting set", category: "camping", ownerId: "u-bayu", pricePerDay: 15_000, itemValue: 350_000, stock: 3, description: "Kompor portable lipat + nesting 3 panci untuk masak di gunung. Gas kaleng tidak termasuk.", condition: "Nesting ada bekas gosong di bagian bawah (normal pemakaian)." },
  { slug: "headlamp", title: "Headlamp LED rechargeable", category: "camping", ownerId: "u-bayu", pricePerDay: 7_000, itemValue: 150_000, stock: 5, approval: "otomatis", description: "Headlamp 3 mode cahaya, baterai bisa dicas lewat USB-C. Kabel cas ikut.", condition: "Normal." },
  { slug: "trekking-pole", title: "Trekking pole sepasang", category: "camping", ownerId: "u-yoga", pricePerDay: 8_000, itemValue: 200_000, description: "Tongkat trekking alumunium, bisa dipanjang-pendekkan, sepasang.", condition: "Karet ujung salah satu tongkat agak aus." },
  { slug: "hammock", title: "Hammock parasut + tali webbing", category: "camping", ownerId: "u-yoga", pricePerDay: 6_000, itemValue: 150_000, description: "Hammock single parasut kuat sampai 150 kg, termasuk tali webbing dan carabiner.", condition: "Normal." },

  // Kamera & Foto
  { slug: "kamera-mirrorless", title: "Kamera mirrorless + lensa kit 16–50mm", category: "kamera", ownerId: "u-dina", pricePerDay: 120_000, itemValue: 9_500_000, durationDiscount: { minDays: 3, percent: 10 }, maxDays: 7, description: "Kamera mirrorless APS-C 24MP, video 4K. Termasuk lensa kit 16–50mm, 2 baterai, charger, dan SD card 64GB.", condition: "Lecet halus di layar dan bodi bagian bawah. Fungsi normal semua.", special: "Wajib dikembalikan dengan kartu memori sudah dikosongkan." },
  { slug: "lensa-50mm", title: "Lensa fix 50mm f/1.8", category: "kamera", ownerId: "u-dina", pricePerDay: 40_000, itemValue: 2_500_000, description: "Lensa portrait favorit buat foto wisuda dan produk. Bokeh lembut, fokus cepat.", condition: "Ring fokus mulus, ada lecet kecil di hood." },
  { slug: "tripod", title: "Tripod aluminium 160 cm", category: "kamera", ownerId: "u-dina", pricePerDay: 15_000, itemValue: 350_000, description: "Tripod ringan tinggi maksimal 160 cm, head 3-way, ada holder HP.", condition: "Kaki kanan agak seret saat dipanjangkan." },
  { slug: "ring-light", title: "Ring light 18 inci + stand", category: "kamera", ownerId: "u-dina", pricePerDay: 20_000, itemValue: 450_000, description: "Ring light 18 inci dengan 3 warna cahaya dan stand 2 meter. Cocok untuk konten dan wawancara.", condition: "Normal.", collateral: "auto+identitas" },
  { slug: "action-cam", title: "Action cam 4K + mounting kit", category: "kamera", ownerId: "u-bayu", pricePerDay: 60_000, itemValue: 3_800_000, stock: 2, description: "Action cam 4K60 waterproof 10 m, stabilizer bawaan. Termasuk 2 baterai, chest mount, dan tongsis.", condition: "Lensa pelindung ada baret halus (tidak mengganggu hasil)." },
  { slug: "kamera-dslr", title: "Kamera DSLR + lensa 18–55mm", category: "kamera", ownerId: "u-bayu", pricePerDay: 100_000, itemValue: 6_500_000, stock: 2, description: "DSLR entry-level 24MP, mudah dipakai pemula. Termasuk tas, baterai cadangan, dan SD card.", condition: "Grip karet sedikit mengelupas di sisi kanan." },

  // Pakaian acara
  { slug: "blazer-hitam", title: "Blazer hitam formal (M)", category: "pakaian-acara", ownerId: "u-laras", pricePerDay: 30_000, itemValue: 450_000, description: "Blazer slim fit unisex ukuran M, cocok untuk sidang, seminar, dan wawancara kerja.", condition: "Sudah laundry, tidak ada noda.", special: "Dikembalikan tanpa dicuci, biaya laundry sudah termasuk." },
  { slug: "kebaya-wisuda", title: "Kebaya brokat wisuda (S–M)", category: "pakaian-acara", ownerId: "u-laras", pricePerDay: 75_000, itemValue: 1_200_000, collateral: "identitas", description: "Kebaya brokat modern warna sage dengan kain batik. Ukuran S–M, ada furing.", condition: "Satu payet di lengan kiri lepas (sudah dijahit ulang)." },
  { slug: "jas-pria", title: "Setelan jas pria slim fit (L)", category: "pakaian-acara", ownerId: "u-laras", pricePerDay: 60_000, itemValue: 1_500_000, description: "Setelan jas + celana warna navy, ukuran L. Cocok untuk wisuda dan pernikahan.", condition: "Normal, baru dipakai 3 kali." },
  { slug: "pantofel", title: "Sepatu pantofel kulit (42)", category: "pakaian-acara", ownerId: "u-laras", pricePerDay: 20_000, itemValue: 400_000, description: "Pantofel kulit sintetis hitam ukuran 42, sol karet anti licin.", condition: "Ada lipatan di bagian depan (bekas pakai)." },
  { slug: "kemeja-batik", title: "Kemeja batik lengan panjang (L)", category: "pakaian-acara", ownerId: "u-laras", pricePerDay: 15_000, itemValue: 250_000, description: "Kemeja batik tulis lengan panjang, ukuran L, untuk acara resmi kampus.", condition: "Normal." },

  // Elektronik & presentasi
  { slug: "proyektor", title: "Proyektor mini + layar 70 inci", category: "elektronik", ownerId: "u-nadia", pricePerDay: 75_000, itemValue: 3_200_000, description: "Proyektor 3000 lumens, HDMI + USB. Layar tripod 70 inci ikut. Cocok untuk nobar dan seminar kecil.", condition: "Remote agak keras tombolnya, fungsi normal." },
  { slug: "speaker-portable", title: "Speaker portable 100W + mic", category: "elektronik", ownerId: "u-nadia", pricePerDay: 50_000, itemValue: 1_800_000, description: "Speaker meeting 100W dengan baterai 6 jam, termasuk 1 mic wireless. Bisa Bluetooth.", condition: "Lecet di sudut kiri bawah." },
  { slug: "mic-wireless", title: "Mic wireless dual untuk acara", category: "elektronik", ownerId: "u-nadia", pricePerDay: 35_000, itemValue: 900_000, description: "Sepasang mic wireless UHF dengan receiver. Jangkauan sampai 30 meter.", condition: "Normal.", collateral: "auto+identitas" },
  { slug: "laptop", title: "Laptop 14 inci untuk presentasi", category: "elektronik", ownerId: "u-nadia", pricePerDay: 85_000, itemValue: 7_000_000, maxDays: 5, description: "Laptop 14 inci, RAM 16GB, sudah terpasang Office, Zoom, dan Canva. Charger ikut.", condition: "Ada stiker di tutup belakang, keyboard normal." },
  { slug: "power-bank", title: "Power bank 20.000 mAh", category: "elektronik", ownerId: "u-nadia", pricePerDay: 8_000, itemValue: 250_000, description: "Power bank fast charging 20W dengan dua port USB. Kabel USB-C ikut.", condition: "Normal." },
  { slug: "kabel-roll", title: "Kabel roll 10 m + terminal 4 lubang", category: "elektronik", ownerId: "u-nadia", pricePerDay: 7_000, itemValue: 120_000, description: "Kabel roll 10 meter dengan terminal 4 lubang dan saklar. Untuk acara outdoor.", condition: "Normal." },

  // Alat masak
  { slug: "panci-besar", title: "Panci besar 40 liter", category: "alat-masak", ownerId: "u-tini", pricePerDay: 25_000, itemValue: 450_000, handover: ["jemput"], description: "Panci stainless 40 liter untuk masak acara, cukup untuk ±100 porsi sop. Tutup ikut.", condition: "Ada penyok kecil di sisi samping, tidak bocor.", special: "Dikembalikan dalam keadaan bersih." },
  { slug: "kompor-portable", title: "Kompor gas portable + regulator", category: "alat-masak", ownerId: "u-tini", pricePerDay: 20_000, itemValue: 400_000, handover: ["jemput"], description: "Kompor 1 tungku portable + selang dan regulator SNI. Tabung gas tidak termasuk.", condition: "Selang masih baru (ganti Oktober).", special: "Dikembalikan dalam keadaan bersih." },
  { slug: "rice-cooker", title: "Rice cooker besar 5 liter", category: "alat-masak", ownerId: "u-tini", pricePerDay: 20_000, itemValue: 600_000, handover: ["jemput"], collateral: "identitas", description: "Rice cooker 5 liter, cukup untuk ±40 porsi nasi. Fungsi masak dan hangatkan normal.", condition: "Lapisan anti lengket sedikit tergores." },
  { slug: "dandang", title: "Dandang kukus 30 cm", category: "alat-masak", ownerId: "u-tini", pricePerDay: 15_000, itemValue: 300_000, handover: ["jemput"], description: "Dandang alumunium 30 cm, 2 susun. Untuk kukus nasi, kue, atau bakpao.", condition: "Normal." },
  { slug: "wajan-besar", title: "Wajan besar 50 cm", category: "alat-masak", ownerId: "u-tini", pricePerDay: 15_000, itemValue: 250_000, handover: ["jemput"], description: "Wajan besi 50 cm untuk masak porsi besar, cocok untuk KKN dan syukuran.", condition: "Bagian bawah menghitam (normal pemakaian)." },

  // Musim hujan
  { slug: "payung-besar", title: "Payung golf besar muat 2 orang", category: "musim-hujan", ownerId: "u-tini", pricePerDay: 5_000, itemValue: 120_000, approval: "otomatis", description: "Payung golf diameter 130 cm, kerangka fiber kuat diterpa angin.", condition: "Normal." },
  { slug: "jas-hujan-ponco", title: "Jas hujan ponco tebal", category: "musim-hujan", ownerId: "u-bayu", pricePerDay: 5_000, itemValue: 90_000, stock: 6, approval: "otomatis", description: "Ponco PVC tebal, muat menutupi carrier. Ada kantong penyimpanan.", condition: "Normal." },
  { slug: "sepatu-boot", title: "Sepatu boot karet (41–42)", category: "musim-hujan", ownerId: "u-yoga", pricePerDay: 8_000, itemValue: 150_000, description: "Boot karet setinggi betis, anti slip. Cocok untuk musim hujan dan kegiatan lapangan.", condition: "Normal, sudah dicuci." },
  { slug: "jas-hujan-setelan", title: "Jas hujan setelan baju + celana", category: "musim-hujan", ownerId: "u-fajar", pricePerDay: 7_000, itemValue: 180_000, description: "Jas hujan setelan bahan karet tebal, ukuran L. Cocok untuk naik motor.", condition: "Normal." },

  // Kendaraan (high-risk, manual approval)
  { slug: "motor-matic-110", title: "Motor matic 110cc + 2 helm", category: "kendaraan", ownerId: "u-fajar", pricePerDay: 70_000, pricePerWeek: 420_000, itemValue: 12_000_000, minDays: 1, description: "Motor matic 110cc irit, servis rutin. Termasuk 2 helm dan jas hujan.", condition: "Baret di body samping kiri, mesin normal.", vehicle: { plateMasked: "AB 4*** **", stnkValidUntil: "2027-08-14", simClass: "C" } },
  { slug: "motor-matic-125", title: "Motor matic 125cc untuk KKN", category: "kendaraan", ownerId: "u-fajar", pricePerDay: 85_000, pricePerWeek: 500_000, itemValue: 18_000_000, durationDiscount: { minDays: 14, percent: 15 }, description: "Motor matic 125cc, kuat untuk jalan desa. Bisa sewa mingguan untuk KKN.", condition: "Jok sedikit sobek di belakang (sudah dilapis).", vehicle: { plateMasked: "AB 6*** **", stnkValidUntil: "2028-02-03", simClass: "C" } },

  // Olahraga
  { slug: "sepeda-lipat", title: "Sepeda lipat 20 inci", category: "olahraga", ownerId: "u-yoga", pricePerDay: 25_000, itemValue: 2_200_000, description: "Sepeda lipat 7 speed, ringan dan bisa masuk bagasi mobil. Gembok ikut.", condition: "Cat tergores di frame bawah." },
  { slug: "raket-badminton", title: "Raket badminton sepasang + kok", category: "olahraga", ownerId: "u-yoga", pricePerDay: 10_000, itemValue: 400_000, approval: "otomatis", description: "Sepasang raket carbon dan 1 slop kok bulu. Senar baru diganti.", condition: "Grip agak kusam." },
  { slug: "bola-futsal", title: "Bola futsal + 10 rompi tim", category: "olahraga", ownerId: "u-yoga", pricePerDay: 15_000, itemValue: 300_000, description: "Bola futsal ukuran 4 dan 10 rompi dua warna untuk sparing atau class meeting.", condition: "Normal." },
  { slug: "matras-yoga", title: "Matras yoga 8 mm", category: "olahraga", ownerId: "u-yoga", pricePerDay: 5_000, itemValue: 150_000, approval: "otomatis", description: "Matras yoga tebal 8 mm anti slip, dengan tali pembawa.", condition: "Normal, dibersihkan setelah dipakai." },
];

let optSeq = 0;
const optId = () => `co-${(++optSeq).toString(36)}`;

function collateralFor(seed: ListingSeed, rules: CollateralRules): CollateralOption[] {
  const s = suggestCollateral(seed.itemValue, seed.category, rules);
  const identity: CollateralOption = { id: optId(), kind: "identitas", cards: ["KTM", "SIM", "Kartu pelajar"] };
  if (seed.collateral === "identitas") return [identity];
  const preset = s.preset.map((p) => ({ ...p, id: optId() }));
  if (seed.collateral === "auto+identitas" && s.level !== "rendah") return [...preset, identity];
  return preset;
}

function seedListings(now: number, rules: CollateralRules): Listing[] {
  optSeq = 0;
  return LISTING_SEEDS.map((seed, i) => {
    const owner = OWNER_DEFAULTS[seed.ownerId];
    const area = AREA_BY_ID[owner.areaId];
    const jitter = (k: number) => (((i * k) % 9) - 4) * 0.0007;
    const rating = 4.5 + ((i * 7) % 6) / 10; // 4.5 – 5.0
    return {
      id: `l-${seed.slug}`,
      slug: seed.slug,
      ownerId: seed.ownerId,
      title: seed.title,
      category: seed.category,
      description: seed.description,
      photos: [1, 2, 3].map((n) => `/img/listings/${seed.slug}-${n}.webp`),
      conditionNotes: seed.condition,
      pricePerDay: seed.pricePerDay,
      pricePerHour: seed.pricePerHour,
      pricePerWeek: seed.pricePerWeek,
      durationDiscount: seed.durationDiscount,
      minDays: seed.minDays,
      maxDays: seed.maxDays,
      itemValue: seed.itemValue,
      collateralOptions: collateralFor(seed, rules),
      location: { lat: area.lat + jitter(37), lng: area.lng + jitter(53), areaId: owner.areaId },
      radiusKm: owner.radiusKm,
      handover: seed.handover ?? (seed.ownerId === "u-bayu" ? ["jemput", "cod"] : ["cod", "jemput"]),
      meetingPoint: owner.meetingPoint,
      handoverHours: owner.hours,
      rules: {
        lateFeePerDay: seed.pricePerDay,
        lateFeeCapPercent: 100,
        cancellation: "Gratis jika batal lebih dari 24 jam sebelum serah terima.",
        special: seed.special,
      },
      approval: seed.vehicle || seed.itemValue > rules.highValueBadge ? "manual" : seed.approval ?? "manual",
      autoApproveMinRating: seed.approval === "otomatis" ? 4.5 : undefined,
      stock: seed.stock ?? 1,
      vehicle: seed.vehicle,
      status: "aktif",
      createdAt: now - (60 - i) * D,
      baseRating: Math.round(rating * 10) / 10,
      baseRatingCount: 3 + ((i * 11) % 28),
      rentCount: 5 + ((i * 13) % 60),
    } satisfies Listing;
  });
}

/* ------------------------------------------------------------- bookings */

interface BookingSeed {
  id: string;
  listing: string; // slug
  renterId: string;
  start: number; // day offset from today
  end: number;
  status: BookingStatus;
  createdHoursAgo: number;
  collateralIndex?: number;
  handover?: HandoverMethod;
  note?: string;
  paid?: boolean;
}

function buildBooking(
  seed: BookingSeed,
  ctx: { now: number; today: string; listings: Listing[]; users: User[]; commission: CommissionConfig; counter: number },
): Booking {
  const listing = ctx.listings.find((l) => l.slug === seed.listing)!;
  const renter = ctx.users.find((u) => u.id === seed.renterId)!;
  const provider = ctx.users.find((u) => u.id === listing.ownerId)!;
  const startDate = addDays(ctx.today, seed.start);
  const endDate = addDays(ctx.today, seed.end);
  const createdAt = ctx.now - seed.createdHoursAgo * H;
  const quote = quoteRent(listing, startDate, endDate);
  const collateral = listing.collateralOptions[seed.collateralIndex ?? 0] ?? listing.collateralOptions[0];
  const commission = computeCommission(quote.total, ctx.commission);
  const agreementBody = {
    createdAt,
    listingId: listing.id,
    listingTitle: listing.title,
    category: listing.category,
    itemValue: listing.itemValue,
    renterName: renter.nickname ?? renter.name.split(" ")[0],
    providerName: provider.nickname ?? provider.name.split(" ")[0],
    startDate,
    endDate,
    quote,
    collateral,
    collateralValue: collateralValue(collateral, listing.itemValue),
    handover: seed.handover ?? listing.handover[0],
    lateFeePerDay: listing.rules.lateFeePerDay,
    lateFeeCap: Math.round((listing.itemValue * listing.rules.lateFeeCapPercent) / 100),
    cancellation: listing.rules.cancellation,
    special: listing.rules.special,
    conditionNotes: listing.conditionNotes,
    referencePhotos: listing.photos,
    commission,
  };
  const deposit = depositCash(collateral, listing.itemValue);
  const d = new Date(createdAt);
  return {
    id: seed.id,
    code: `SWN-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}-${String(ctx.counter).padStart(4, "0")}`,
    listingId: listing.id,
    renterId: renter.id,
    providerId: provider.id,
    startDate,
    endDate,
    handover: agreementBody.handover,
    collateral,
    note: seed.note,
    status: seed.status,
    overdue: false,
    createdAt,
    expiresAt: createdAt + 24 * H,
    agreement: { ...agreementBody, hash: sha256Text(JSON.stringify(agreementBody)), renterAgreedAt: createdAt },
    payment: {
      status: seed.paid ? "lunas" : "belum",
      method: seed.paid ? "qris" : undefined,
      paidAt: seed.paid ? createdAt + 3 * H : undefined,
      rent: quote.total,
      deposit,
      commission: commission.renterPays,
      total: quote.total + deposit + commission.renterPays,
    },
  };
}

/* ----------------------------------------------------------- the seed */

export function createSeed(now: number): DataState {
  const today = isoDate(now);
  const rules = DEFAULT_COLLATERAL_RULES(now);
  const commission = DEFAULT_COMMISSION(now);
  const users = seedUsers(now);
  const listings = seedListings(now, rules);
  const photo = (slug: string, n: number) => `/img/listings/${slug}-${n}.webp`;

  // A listing caught by the keyword filter, taken down (shows in admin reports).
  listings.push({
    ...listings.find((l) => l.slug === "headlamp")!,
    id: "l-flagged-airsoft",
    slug: "flagged-airsoft",
    ownerId: "u-arif",
    title: "Airsoft gun replika buat properti film",
    category: "olahraga",
    description: "Replika airsoft untuk properti tugas film. Bisa nembak BB.",
    photos: ["/img/demo/flagged.svg", "/img/demo/flagged.svg", "/img/demo/flagged.svg"],
    conditionNotes: "-",
    pricePerDay: 50_000,
    itemValue: 1_500_000,
    location: { ...AREA_BY_ID.terban, areaId: "terban" },
    status: "diturunkan",
    createdAt: now - 3 * D,
    rentCount: 0,
    baseRating: 0,
    baseRatingCount: 0,
  });

  let counter = 40;
  const ctx = () => ({ now, today, listings, users, commission, counter: ++counter });
  const B = (s: BookingSeed) => buildBooking(s, ctx());

  /* ---- historic completed bookings (reviews / testimonials) ---- */
  const historic: Booking[] = [
    B({ id: "b-h1", listing: "tenda-dome-4p", renterId: "u-maya", start: -30, end: -27, status: "COMPLETED", createdHoursAgo: 32 * 24, paid: true }),
    B({ id: "b-h2", listing: "kamera-mirrorless", renterId: "u-sinta", start: -25, end: -23, status: "COMPLETED", createdHoursAgo: 27 * 24, paid: true }),
    B({ id: "b-h3", listing: "panci-besar", renterId: "u-dimas", start: -20, end: -18, status: "COMPLETED", createdHoursAgo: 22 * 24, paid: true }),
    B({ id: "b-h4", listing: "kebaya-wisuda", renterId: "u-maya", start: -16, end: -15, status: "COMPLETED", createdHoursAgo: 18 * 24, paid: true }),
    B({ id: "b-h5", listing: "proyektor", renterId: "u-raka", start: -14, end: -13, status: "COMPLETED", createdHoursAgo: 15 * 24, paid: true }),
    B({ id: "b-h6", listing: "motor-matic-110", renterId: "u-dimas", start: -12, end: -9, status: "COMPLETED", createdHoursAgo: 13 * 24, paid: true }),
    B({ id: "b-h7", listing: "carrier-60l", renterId: "u-sinta", start: -10, end: -8, status: "COMPLETED", createdHoursAgo: 11 * 24, paid: true }),
    B({ id: "b-h8", listing: "blazer-hitam", renterId: "u-raka", start: -9, end: -8, status: "COMPLETED", createdHoursAgo: 10 * 24, paid: true }),
  ];
  for (const b of historic) {
    const endMs = new Date(`${b.endDate}T17:00:00`).getTime();
    Object.assign(b, {
      acceptedAt: b.createdAt + 2 * H,
      activeAt: new Date(`${b.startDate}T10:00:00`).getTime(),
      returnedAt: endMs,
      completedAt: endMs + 2 * H,
      collateralReturn: { providerReturnedAt: endMs + H, renterConfirmedAt: endMs + 2 * H },
    });
    b.agreement.providerAgreedAt = b.acceptedAt;
  }

  /* ---- one booking per status, with the demo accounts ---- */
  const req = B({ id: "b-requested", listing: "carrier-60l", renterId: "u-raka", start: 2, end: 5, status: "REQUESTED", createdHoursAgo: 4, handover: "jemput", note: "Buat naik Merbabu via Selo hari Sabtu. Ambil Jumat sore boleh, Mas?" });
  const req2 = B({ id: "b-requested-2", listing: "kompor-portable", renterId: "u-sinta", start: 1, end: 2, status: "REQUESTED", createdHoursAgo: 9, handover: "jemput", note: "Untuk bazar himpunan di Lembah UGM, Bu." });
  const acc = B({ id: "b-accepted", listing: "kamera-mirrorless", renterId: "u-raka", start: 1, end: 3, status: "ACCEPTED", createdHoursAgo: 20, collateralIndex: 0, handover: "cod", note: "Untuk dokumentasi seminar nasional jurusan." });
  acc.acceptedAt = acc.createdAt + 3 * H;
  acc.agreement.providerAgreedAt = acc.acceptedAt;
  acc.meetingPointDetail = "Lobi Perpustakaan Pusat UGM, dekat loker. Dina pakai jaket krem.";

  const act = B({ id: "b-active", listing: "tenda-dome-4p", renterId: "u-sinta", start: -1, end: 2, status: "ACTIVE", createdHoursAgo: 3 * 24, handover: "jemput", paid: true });
  act.acceptedAt = act.createdAt + 1 * H;
  act.agreement.providerAgreedAt = act.acceptedAt;
  act.activeAt = now - 26 * H;
  act.meetingPointDetail = "Toko Bayu Outdoor, Jl. Pogung Baru. Parkir di depan toko.";
  act.checkout = { photoIds: ["p-act-co-1", "p-act-co-2", "p-act-co-3"], collateralPhotoIds: ["p-act-col"], submittedAt: act.activeAt - 10 * 60_000, providerAgreedAt: act.activeAt - 5 * 60_000, renterAgreedAt: act.activeAt };

  const ovd = B({ id: "b-overdue", listing: "panci-besar", renterId: "u-raka", start: -4, end: -1, status: "ACTIVE", createdHoursAgo: 5 * 24, handover: "jemput", paid: true, note: "Buat masak syukuran kontrakan." });
  ovd.acceptedAt = ovd.createdAt + 2 * H;
  ovd.agreement.providerAgreedAt = ovd.acceptedAt;
  ovd.activeAt = now - 4 * D + 2 * H;
  ovd.overdue = true;
  ovd.meetingPointDetail = "Warung Bu Tini, Klebengan. Masuk lewat pintu samping.";
  ovd.checkout = { photoIds: ["p-ovd-co-1", "p-ovd-co-2", "p-ovd-co-3"], collateralPhotoIds: ["p-ovd-col"], submittedAt: ovd.activeAt - 600_000, providerAgreedAt: ovd.activeAt - 300_000, renterAgreedAt: ovd.activeAt };

  const ret = B({ id: "b-returned", listing: "tripod", renterId: "u-sinta", start: -5, end: -2, status: "RETURNED", createdHoursAgo: 6 * 24, handover: "cod", paid: true });
  ret.acceptedAt = ret.createdAt + 2 * H;
  ret.agreement.providerAgreedAt = ret.acceptedAt;
  ret.activeAt = now - 5 * D + 3 * H;
  ret.returnedAt = now - 20 * H;
  ret.meetingPointDetail = "Lobi Perpustakaan Pusat UGM.";
  ret.checkout = { photoIds: ["p-ret-co-1", "p-ret-co-2", "p-ret-co-3"], collateralPhotoIds: ["p-ret-col"], submittedAt: ret.activeAt - 600_000, providerAgreedAt: ret.activeAt - 300_000, renterAgreedAt: ret.activeAt };
  ret.checkin = { photoIds: ["p-ret-ci-1", "p-ret-ci-2", "p-ret-ci-3"], result: "sesuai", at: ret.returnedAt };

  const cmp = B({ id: "b-completed", listing: "sleeping-bag", renterId: "u-raka", start: -6, end: -3, status: "COMPLETED", createdHoursAgo: 7 * 24, handover: "jemput", paid: true });
  cmp.acceptedAt = cmp.createdAt + H;
  cmp.agreement.providerAgreedAt = cmp.acceptedAt;
  cmp.activeAt = now - 6 * D + 4 * H;
  cmp.returnedAt = now - 3 * D + 5 * H;
  cmp.completedAt = now - 3 * D + 7 * H;
  cmp.meetingPointDetail = "Toko Bayu Outdoor, Jl. Pogung Baru.";
  cmp.checkout = { photoIds: ["p-cmp-co-1", "p-cmp-co-2", "p-cmp-co-3"], collateralPhotoIds: ["p-cmp-col"], submittedAt: cmp.activeAt - 600_000, providerAgreedAt: cmp.activeAt - 300_000, renterAgreedAt: cmp.activeAt };
  cmp.checkin = { photoIds: ["p-cmp-ci-1", "p-cmp-ci-2", "p-cmp-ci-3"], result: "sesuai", at: cmp.returnedAt };
  cmp.collateralReturn = { providerReturnedAt: cmp.returnedAt + H, renterConfirmedAt: cmp.completedAt };

  const dec = B({ id: "b-declined", listing: "motor-matic-110", renterId: "u-sinta", start: 3, end: 4, status: "DECLINED", createdHoursAgo: 30 });
  dec.declinedAt = dec.createdAt + 5 * H;
  dec.declineReason = "Maaf, motornya lagi servis rutin sampai minggu depan.";

  const exp = B({ id: "b-expired", listing: "jas-pria", renterId: "u-raka", start: 1, end: 2, status: "EXPIRED", createdHoursAgo: 40 });

  const can = B({ id: "b-cancelled", listing: "rice-cooker", renterId: "u-sinta", start: 2, end: 3, status: "CANCELLED", createdHoursAgo: 50, handover: "jemput" });
  can.acceptedAt = can.createdAt + 2 * H;
  can.agreement.providerAgreedAt = can.acceptedAt;
  can.cancelledAt = can.createdAt + 20 * H;
  can.cancelledBy = "u-sinta";
  can.cancelReason = "Acara himpunan diundur ke bulan depan.";

  const dsp = B({ id: "b-disputed", listing: "lensa-50mm", renterId: "u-raka", start: -6, end: -3, status: "DISPUTED", createdHoursAgo: 7 * 24, collateralIndex: 0, handover: "cod", paid: true });
  dsp.acceptedAt = dsp.createdAt + 2 * H;
  dsp.agreement.providerAgreedAt = dsp.acceptedAt;
  dsp.activeAt = now - 6 * D + 5 * H;
  dsp.returnedAt = now - 3 * D + 6 * H;
  dsp.meetingPointDetail = "Lobi Perpustakaan Pusat UGM.";
  dsp.checkout = { photoIds: ["p-dsp-co-1", "p-dsp-co-2", "p-dsp-co-3"], collateralPhotoIds: ["p-dsp-col"], submittedAt: dsp.activeAt - 600_000, providerAgreedAt: dsp.activeAt - 300_000, renterAgreedAt: dsp.activeAt };
  dsp.checkin = { photoIds: ["p-dsp-ci-1", "p-dsp-ci-2", "p-dsp-ci-3", "p-dsp-ci-4"], result: "masalah", problemType: "Lecet / goresan baru", problemNote: "Ada goresan baru di elemen depan lensa, kelihatan saat disenter.", at: dsp.returnedAt };
  dsp.disputeId = "d-lensa";

  const res = B({ id: "b-resolved", listing: "action-cam", renterId: "u-sinta", start: -15, end: -12, status: "RESOLVED", createdHoursAgo: 16 * 24, handover: "jemput", paid: true });
  res.acceptedAt = res.createdAt + H;
  res.agreement.providerAgreedAt = res.acceptedAt;
  res.activeAt = now - 15 * D + 3 * H;
  res.returnedAt = now - 12 * D + 4 * H;
  res.resolvedAt = now - 10 * D;
  res.checkout = { photoIds: ["p-res-co-1", "p-res-co-2", "p-res-co-3"], collateralPhotoIds: ["p-res-col"], submittedAt: res.activeAt - 600_000, providerAgreedAt: res.activeAt - 300_000, renterAgreedAt: res.activeAt };
  res.checkin = { photoIds: ["p-res-ci-1", "p-res-ci-2", "p-res-ci-3"], result: "masalah", problemType: "Kelengkapan kurang", problemNote: "Chest mount tidak ikut dikembalikan.", at: res.returnedAt };
  res.collateralReturn = { providerReturnedAt: res.resolvedAt, renterConfirmedAt: res.resolvedAt + H };
  res.disputeId = "d-actioncam";

  const bookings = [...historic, req, req2, acc, act, ovd, ret, cmp, dec, exp, can, dsp, res];

  /* ---- photo records for seeded check-out / check-in (source "demo") ---- */
  const photos: PhotoRecord[] = [];
  const angles = ["Depan", "Samping", "Close-up kondisi"];
  const addSet = (b: Booking, key: string, stage: "checkout" | "checkin", at: number) => {
    const listing = listings.find((l) => l.id === b.listingId)!;
    for (let n = 1; n <= 3; n++) {
      const src = photo(listing.slug, n);
      photos.push({
        id: `p-${key}-${stage === "checkout" ? "co" : "ci"}-${n}`,
        bookingId: b.id,
        stage,
        uploaderId: b.providerId,
        src,
        sha256: sha256Text(`${src}|${b.id}|${stage}|${n}`),
        serverTimestamp: at + n * 20_000,
        source: "demo",
        angle: angles[n - 1],
      });
    }
  };
  const addCollateralPhoto = (b: Booking, key: string, at: number) => {
    const src = b.collateral.kind === "deposit" && !b.collateral.withIdentity ? "/img/demo/jaminan-deposit.svg" : "/img/demo/jaminan-ktm.svg";
    photos.push({ id: `p-${key}-col`, bookingId: b.id, stage: "jaminan", uploaderId: b.providerId, src, sha256: sha256Text(`${src}|${b.id}|jaminan`), serverTimestamp: at + 90_000, source: "demo", angle: "Jaminan" });
  };
  for (const [b, key] of [[act, "act"], [ovd, "ovd"], [ret, "ret"], [cmp, "cmp"], [dsp, "dsp"], [res, "res"]] as const) {
    addSet(b, key, "checkout", b.checkout!.submittedAt - 120_000);
    addCollateralPhoto(b, key, b.checkout!.submittedAt - 120_000);
    if (b.checkin) addSet(b, key, "checkin", b.checkin.at - 120_000);
  }
  photos.push({ id: "p-dsp-ci-4", bookingId: dsp.id, stage: "masalah", uploaderId: dsp.providerId, src: photo("lensa-50mm", 2), sha256: sha256Text("lensa-masalah"), serverTimestamp: dsp.returnedAt! - 30_000, source: "kamera", angle: "Close-up goresan" });

  /* ---- reviews ---- */
  const rv = (id: string, b: Booking, fromRole: "penyewa" | "penyedia", rating: number, comment: string, hoursAfter = 3): Review => ({
    id,
    bookingId: b.id,
    listingId: b.listingId,
    fromId: fromRole === "penyewa" ? b.renterId : b.providerId,
    toId: fromRole === "penyewa" ? b.providerId : b.renterId,
    fromRole,
    rating,
    comment,
    createdAt: (b.completedAt ?? now) + hoursAfter * H,
  });
  const [h1, h2, h3, h4, h5, h6, h7, h8] = historic;
  const reviews: Review[] = [
    rv("r-h1a", h1, "penyewa", 5, "Tendanya bersih, wangi, dan lengkap. Mas Bayu jelasin cara pasang dulu sebelum dibawa. Aman dipakai di Andong waktu hujan."),
    rv("r-h1b", h1, "penyedia", 5, "Barang dikembalikan tepat waktu dan sudah dikeringkan. Recommended penyewa."),
    rv("r-h2a", h2, "penyewa", 5, "Kameranya mulus, baterai dua-duanya penuh. Foto kondisi pas serah terima bikin tenang, nggak takut disalahin kalau ada lecet lama."),
    rv("r-h2b", h2, "penyedia", 5, "Sinta teliti, kartu memori dikosongkan sesuai aturan."),
    rv("r-h3a", h3, "penyewa", 5, "Panci besarnya pas buat masak 80 porsi. Bu Tini ramah banget, malah dikasih tips biar nggak gosong."),
    rv("r-h3b", h3, "penyedia", 4, "Pancinya dikembalikan bersih. Telat 1 jam tapi ngabarin dulu."),
    rv("r-h4a", h4, "penyewa", 5, "Kebayanya cantik dan pas di badan. Jaminannya cukup titip KTM, prosesnya cepat."),
    rv("r-h4b", h4, "penyedia", 5, "Kebaya kembali rapi. Terima kasih Maya!"),
    rv("r-h5a", h5, "penyewa", 4, "Proyektor terang buat nobar 40 orang. Remote agak keras, tapi sudah ditulis di deskripsi."),
    rv("r-h5b", h5, "penyedia", 5, "Raka komunikatif dan barang kembali utuh."),
    rv("r-h6a", h6, "penyewa", 5, "Motornya irit dan helm dua-duanya bersih. Foto odometer pas serah terima bikin jelas soal bensin."),
    rv("r-h6b", h6, "penyedia", 5, "Bensin dikembalikan full sesuai kesepakatan."),
    rv("r-h7a", h7, "penyewa", 5, "Carrier nyaman, rain cover kepake banget waktu turun dari Prau. Proses ambil di toko cuma 5 menit."),
    rv("r-h7b", h7, "penyedia", 5, "Penyewa tertib, carrier kembali kering."),
    rv("r-h8a", h8, "penyewa", 5, "Blazernya pas untuk sidang skripsi. Mbak Laras fast response."),
    rv("r-h8b", h8, "penyedia", 5, "Ontime, barang aman."),
    // b-completed: only the provider has reviewed → hidden until Raka reviews or 7 days pass (FR-T2)
    { id: "r-cmp-provider", bookingId: cmp.id, listingId: cmp.listingId, fromId: "u-bayu", toId: "u-raka", fromRole: "penyedia", rating: 5, comment: "Sleeping bag kembali bersih dan kering. Terima kasih!", createdAt: cmp.completedAt! + 2 * H },
  ];

  /* ---- messages ---- */
  let msgSeq = 0;
  const msg = (bookingId: string, senderId: string, text: string, at: number, photoId?: string): Message => ({ id: `m-${++msgSeq}`, bookingId, senderId, text, at, photoId });
  const messages: Message[] = [
    msg(req.id, "system", "Request sewa dikirim. Penyedia punya waktu 24 jam untuk merespons.", req.createdAt),
    msg(req.id, "u-raka", "Halo Mas Bayu, carrier 60L-nya masih ada buat Jumat–Senin? Buat ke Merbabu.", req.createdAt + 60_000),
    msg(req2.id, "system", "Request sewa dikirim. Penyedia punya waktu 24 jam untuk merespons.", req2.createdAt),
    msg(acc.id, "system", "Request sewa dikirim. Penyedia punya waktu 24 jam untuk merespons.", acc.createdAt),
    msg(acc.id, "u-raka", "Halo Kak Dina, kameranya buat dokumentasi seminar jurusan. Bisa ketemu di perpus pusat?", acc.createdAt + 120_000),
    msg(acc.id, "system", "Request disetujui. Detail titik temu sekarang terlihat oleh kedua pihak.", acc.acceptedAt!),
    msg(acc.id, "u-dina", "Bisa banget. Besok jam 4 sore ya di lobi perpus. Nanti kita foto kondisi kamera + jaminannya bareng.", acc.acceptedAt! + 60_000),
    msg(acc.id, "u-raka", "Siap kak, saya bawa KTM. Depositnya transfer atau tunai?", acc.acceptedAt! + 5 * 60_000),
    msg(acc.id, "u-dina", "Tunai aja pas ketemu, biar langsung difoto juga. Jangan transfer sebelum ketemu ya, sesuai saran Sewain 🙂", acc.acceptedAt! + 9 * 60_000),
    msg(act.id, "system", "Serah terima selesai. Kedua pihak menyetujui kondisi barang dan jaminan. Status: Sedang disewa.", act.activeAt!),
    msg(act.id, "u-sinta", "Mas, pasak tendanya ada 12 kan? Biar pas balikin nggak kurang.", act.activeAt! + 2 * H),
    msg(act.id, "u-bayu", "Betul 12 pasak + 4 tali. Selamat camping!", act.activeAt! + 2 * H + 15 * 60_000),
    msg(ovd.id, "system", "Tanggal kembali sudah lewat. Booking ditandai TELAT. Denda per hari berlaku sesuai kesepakatan.", now - 3 * H),
    msg(ovd.id, "u-tini", "Mas Raka, pancinya kapan dibalikin nggih? Besok mau dipakai warung.", now - 2 * H),
    msg(ret.id, "system", "Pengembalian dicatat. Kondisi: sesuai. Penyedia perlu mengembalikan jaminan.", ret.returnedAt!),
    msg(dsp.id, "system", "Penyedia melaporkan masalah saat pengembalian: Lecet / goresan baru. Sengketa dibuka (L1 negosiasi 48 jam).", dsp.returnedAt!),
    msg(dsp.id, "u-dina", "Raka, ini ada goresan baru di elemen depan lensa. Di foto check-out belum ada.", dsp.returnedAt! + 10 * 60_000, "p-dsp-ci-4"),
    msg(dsp.id, "u-raka", "Kak, saya pakai hood terus kok. Goresannya mungkin sudah ada sebelumnya tapi nggak kefoto.", dsp.returnedAt! + 40 * 60_000),
    msg(dsp.id, "system", "Negosiasi tidak menemukan kesepakatan. Sengketa dinaikkan ke mediasi admin (L2).", now - 1 * D),
  ];

  /* ---- disputes ---- */
  const disputes: Dispute[] = [
    {
      id: "d-lensa",
      bookingId: dsp.id,
      openedBy: "u-dina",
      caseType: "rusak-ringan",
      description: "Goresan baru di elemen depan lensa, terlihat jelas saat disenter. Tidak ada di foto check-out.",
      photoIds: ["p-dsp-ci-4"],
      createdAt: dsp.returnedAt!,
      layer: "L2",
      status: "mediasi",
      l1Deadline: dsp.returnedAt! + 48 * H,
      proposals: [
        { id: "pr-1", byId: "u-dina", type: "ganti-perbaikan", amount: 350_000, note: "Estimasi servis poles elemen depan di Jogja Camera Service.", at: dsp.returnedAt! + 30 * 60_000, status: "ditolak" },
        { id: "pr-2", byId: "u-raka", type: "tanpa-kompensasi", note: "Saya merasa goresan itu sudah ada sebelumnya.", at: dsp.returnedAt! + 50 * 60_000, status: "ditolak" },
      ],
    },
    {
      id: "d-actioncam",
      bookingId: res.id,
      openedBy: "u-bayu",
      caseType: "hilang",
      description: "Chest mount tidak dikembalikan.",
      photoIds: [],
      createdAt: res.returnedAt!,
      layer: "L1",
      status: "selesai",
      l1Deadline: res.returnedAt! + 48 * H,
      proposals: [{ id: "pr-3", byId: "u-bayu", type: "potong-deposit", amount: 150_000, note: "Potong deposit seharga chest mount baru.", at: res.returnedAt! + H, status: "diterima" }],
      outcome: "Disepakati di L1: deposit dipotong Rp150.000 untuk chest mount yang hilang, sisa deposit dikembalikan.",
      resolvedAt: res.resolvedAt,
    },
  ];

  /* ---- verifications ---- */
  const verifications: VerificationRequest[] = users
    .filter((u) => u.verification.status !== "belum" && u.role !== "admin")
    .map((u, i) => ({
      id: `v-${u.id}`,
      userId: u.id,
      submittedAt: u.verification.verifiedAt ? u.verification.verifiedAt - 3 * 60_000 : now - (i + 2) * H,
      method: u.verification.method ?? "manual",
      nameOnKtp: u.name.toUpperCase(),
      nikMasked: u.verification.nikMasked ?? `3404********00${10 + i}`,
      ktpPhotoId: undefined,
      selfiePhotoId: undefined,
      status: u.verification.status === "terverifikasi" ? "disetujui" : "menunggu",
      reviewedAt: u.verification.verifiedAt,
      reviewedBy: u.verification.method === "manual" && u.verification.status === "terverifikasi" ? "u-admin" : undefined,
      auto: u.verification.method === "ekyc",
    }));
  // A pending manual review whose KTP name does not match the profile name (FR-A2).
  const gilang = verifications.find((v) => v.userId === "u-gilang");
  if (gilang) gilang.nameOnKtp = "GILANG MAHENDRA PUTRA";

  /* ---- reports & strikes ---- */
  const reports: Report[] = [
    { id: "rp-1", reporterId: "u-admin", targetType: "listing", targetId: "l-flagged-airsoft", reason: "Kata kunci terlarang: airsoft", detail: "Ditandai otomatis oleh filter kata kunci. Listing diturunkan sementara.", createdAt: now - 3 * D, status: "baru" },
    { id: "rp-2", reporterId: "u-sinta", targetType: "listing", targetId: "l-laptop", reason: "Harga mencurigakan / curiga penipuan", detail: "Laptop 16GB disewakan murah, penyedia minta transfer DP dulu lewat WA.", createdAt: now - 20 * H, status: "baru" },
    { id: "rp-3", reporterId: "u-tini", targetType: "user", targetId: "u-arif", reason: "Tidak datang (no-show)", detail: "Sudah janjian jam 9 di warung, ditunggu sejam tidak datang dan tidak ada kabar.", createdAt: now - 9 * D, status: "ditindak", resolution: "Strike ringan untuk penyewa (no-show).", resolvedAt: now - 8 * D, resolvedBy: "u-admin" },
  ];
  const strikes: Strike[] = [{ id: "s-1", userId: "u-arif", reason: "No-show pada booking alat masak (laporan Bu Tini).", severity: "ringan", at: now - 8 * D, byAdminId: "u-admin" }];

  /* ---- audit ---- */
  const audit: AuditEntry[] = [
    { id: "a-1", actorId: "u-admin", action: "komisi.ubah", target: "Pengaturan komisi", oldValue: "persen 10%, aktif", newValue: "persen 10%, nonaktif (pilot 0%)", at: now - 20 * D },
    { id: "a-2", actorId: "u-admin", action: "jaminan.ubah", target: "Saran jaminan", oldValue: "deposit tinggi 50%", newValue: "deposit tinggi 40%", at: now - 20 * D },
    { id: "a-3", actorId: "u-admin", action: "user.strike", target: "Arif Hidayat", newValue: "strike ringan (no-show)", at: now - 8 * D },
    { id: "a-4", actorId: "u-admin", action: "listing.turunkan", target: "Airsoft gun replika buat properti film", newValue: "diturunkan (kata kunci terlarang)", at: now - 3 * D },
  ];

  /* ---- wanted board (P1, simple) ---- */
  const wanted: WantedPost[] = [
    { id: "w-1", requesterId: "u-sinta", title: "Toga wisuda (ukuran M)", description: "Butuh toga + topi untuk foto pra-wisuda Minggu ini, 1 hari saja.", category: "pakaian-acara", areaId: "karangmalang", location: AREA_BY_ID.karangmalang, radiusKm: 3, neededFrom: addDays(today, 3), neededUntil: addDays(today, 4), budgetPerDay: 40_000, createdAt: now - 5 * H, status: "terbuka", offers: [] },
    { id: "w-2", requesterId: "u-raka", title: "Action cam buat dokumentasi KKN", description: "KKN 2 minggu di Gunungkidul, butuh action cam atau kamera kecil tahan banting.", category: "kamera", areaId: "pogung", location: AREA_BY_ID.pogung, radiusKm: 5, neededFrom: addDays(today, 10), neededUntil: addDays(today, 24), budgetPerDay: 40_000, createdAt: now - 26 * H, status: "terbuka", offers: [{ id: "wo-1", providerId: "u-bayu", listingId: "l-action-cam", message: "Ada action cam 4K, sewa 2 minggu bisa diskon. Cek listing saya ya.", at: now - 20 * H }] },
    { id: "w-3", requesterId: "u-putri", title: "Proyektor untuk nobar himpunan", description: "Sabtu malam, nobar final di sekre himpunan. Butuh proyektor + layar.", category: "elektronik", areaId: "sendowo", location: AREA_BY_ID.sendowo, radiusKm: 3, neededFrom: addDays(today, 2), neededUntil: addDays(today, 3), budgetPerDay: 80_000, createdAt: now - 2 * D, status: "terpenuhi", offers: [{ id: "wo-2", providerId: "u-nadia", listingId: "l-proyektor", message: "Proyektor + layar 70 inci ready, bisa diantar ke sekre.", at: now - 2 * D + 3 * H }] },
    { id: "w-4", requesterId: "u-gilang", title: "Kompor portable + gas, camping 2 malam", description: "Camping di Kalibiru, butuh kompor portable dan nesting.", category: "camping", areaId: "pogung", location: AREA_BY_ID.pogung, radiusKm: 5, neededFrom: addDays(today, 6), neededUntil: addDays(today, 8), createdAt: now - 8 * H, status: "terbuka", offers: [] },
  ];

  /* ---- notifications ---- */
  let nSeq = 0;
  const notif = (userId: string, kind: AppNotification["kind"], title: string, body: string, href: string, hoursAgo: number, read = false): AppNotification => ({ id: `n-${++nSeq}`, userId, kind, title, body, href, at: now - hoursAgo * H, read });
  const notifications: AppNotification[] = [
    notif("u-bayu", "booking", "Request sewa baru", "Raka ingin menyewa Carrier 60L + rain cover (3 hari).", `/sewaan/${req.id}`, 4),
    notif("u-tini", "booking", "Request sewa baru", "Sinta ingin menyewa Kompor gas portable + regulator.", `/sewaan/${req2.id}`, 9),
    notif("u-tini", "booking", "Booking telat dikembalikan", "Panci besar 40 liter sudah lewat tanggal kembali.", `/sewaan/${ovd.id}`, 3),
    notif("u-raka", "booking", "Request disetujui", "Dina menyetujui sewa Kamera mirrorless. Atur serah terima lewat chat.", `/sewaan/${acc.id}`, 17),
    notif("u-raka", "booking", "Kamu telat mengembalikan barang", "Panci besar 40 liter seharusnya kembali kemarin. Denda harian berlaku.", `/sewaan/${ovd.id}`, 3),
    notif("u-raka", "sengketa", "Sengketa naik ke mediasi admin", "Lensa fix 50mm: admin akan memberi rekomendasi maksimal 5 hari kerja.", `/sewaan/${dsp.id}`, 24),
    notif("u-raka", "booking", "Beri rating untuk Mas Bayu", "Sewa Sleeping bag selesai. Rating kalian tampil setelah dua-duanya mengisi.", `/sewaan/${cmp.id}`, 60, true),
    notif("u-sinta", "booking", "Konfirmasi jaminan kembali", "Dina sudah menerima tripod. Tunggu Dina mengembalikan jaminanmu, lalu konfirmasi.", `/sewaan/${ret.id}`, 20),
    notif("u-sinta", "papan", "Ada yang merespons", "Belum ada penawaran untuk Toga wisuda. Coba perluas radius.", "/papan", 2, true),
    notif("u-dina", "sengketa", "Sengketa naik ke mediasi admin", "Lensa fix 50mm: admin sedang meninjau bukti foto.", `/sewaan/${dsp.id}`, 24),
    notif("u-dina", "booking", "Kembalikan jaminan Sinta", "Tripod sudah kembali dengan kondisi sesuai. Kembalikan jaminan lalu tandai di aplikasi.", `/sewaan/${ret.id}`, 20),
    notif("u-admin", "sengketa", "Sengketa menunggu mediasi", "Lensa fix 50mm (Dina vs Raka) naik ke L2.", "/admin/sengketa/d-lensa", 24),
    notif("u-admin", "verifikasi", "2 identitas menunggu review manual", "Gilang dan Putri menunggu verifikasi KTP.", "/admin/verifikasi", 5),
    notif("u-bima", "verifikasi", "Verifikasi KTP dulu, yuk", "Kamu sudah bisa menjelajah. Untuk menyewa atau menyewakan, verifikasi KTP + selfie dulu (±1 menit).", "/verifikasi", 20),
  ];

  return {
    version: DATA_VERSION,
    seeded: true,
    seedBase: now,
    clockOffset: 0,
    users,
    verifications,
    listings,
    bookings,
    photos,
    messages,
    reviews,
    reports,
    disputes,
    strikes,
    commission,
    collateralRules: rules,
    bannedKeywords: DEFAULT_BANNED_KEYWORDS,
    audit,
    wanted,
    notifications,
    favorites: { "u-raka": ["l-tenda-dome-4p", "l-action-cam"], "u-sinta": ["l-kebaya-wisuda"] },
    chatReads: {},
    search: { origin: "area", areaId: "ugm", point: { lat: AREA_BY_ID.ugm.lat, lng: AREA_BY_ID.ugm.lng }, radiusKm: 3 },
    bookingCounter: counter,
  };
}

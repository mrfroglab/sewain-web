import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc, LegalList, ToReview, type LegalSection } from "@/components/legal/LegalDoc";
import { LEGAL_DRAFT } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Kebijakan privasi (draf)",
  description: "Kerangka Kebijakan Privasi Sewain mengacu UU PDP. Draf, menunggu review konsultan hukum.",
};

// Outline follows PRD §12.4 (UU PDP row), FR-A5 (data publik), FR-P8 (retensi foto), ROADMAP D7 (KTP/selfie) + §4.

const WHO_SEES: { data: string; who: string }[] = [
  { data: "Nama depan/nama panggilan, area, status Terverifikasi, rating", who: "Semua orang" },
  { data: "Nama lengkap, nomor HP, email", who: "Kamu sendiri dan admin" },
  { data: "Foto KTP, selfie, NIK", who: "Admin verifikasi saja, setiap akses dicatat" },
  { data: "Lokasi barang", who: "Publik hanya melihat titik yang dibulatkan ± 250 m dan nama area" },
  { data: "Titik temu detail", who: "Pihak sewa, setelah request disetujui" },
  { data: "Chat, foto bukti, foto jaminan", who: "Kedua pihak sewa, dan mediator bila ada sengketa" },
];

const SECTIONS: LegalSection[] = [
  {
    id: "data",
    title: "Data yang kami kumpulkan",
    body: (
      <LegalList
        items={[
          "Data akun: nomor HP (untuk masuk dengan OTP), nama, email bila kamu isi, area/kampus, jenis akun.",
          "Data identitas untuk verifikasi: foto KTP, NIK, dan selfie. Selfie untuk pencocokan wajah kemungkinan termasuk data biometrik, yaitu data pribadi yang bersifat spesifik.",
          "Data transaksi: listing, request sewa, kesepakatan, chat, foto bukti kondisi, foto jaminan, ulasan, laporan, dan sengketa.",
          "Data teknis seperlunya: waktu masuk, sesi aktif, dan catatan keamanan untuk mencegah penyalahgunaan.",
        ]}
      />
    ),
  },
  {
    id: "tujuan",
    title: "Untuk apa data dipakai",
    body: (
      <LegalList
        items={[
          "Memastikan setiap pengguna orang sungguhan (satu NIK satu akun) dan menegakkan blokir.",
          "Menjalankan sewa: mencocokkan penyewa dan penyedia, mencatat kesepakatan, dan menyimpan bukti kondisi barang.",
          "Membantu mediasi saat ada sengketa.",
          "Mengirim notifikasi yang berkaitan dengan sewamu.",
          "Kami tidak menjual data pribadimu dan tidak memakainya untuk iklan pihak ketiga.",
        ]}
      />
    ),
  },
  {
    id: "siapa-melihat",
    title: "Siapa yang bisa melihat apa",
    body: (
      <dl className="divide-y divide-border-gray border-y border-border-gray">
        {WHO_SEES.map((r) => (
          <div key={r.data} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-6">
            <dt className="font-semibold text-ink">{r.data}</dt>
            <dd className="text-graphite">{r.who}</dd>
          </div>
        ))}
      </dl>
    ),
  },
  {
    id: "keamanan",
    title: "Penyimpanan dan keamanan",
    body: (
      <>
        <LegalList
          items={[
            "Berkas KTP, selfie, dan NIK disimpan terenkripsi. Untuk aturan satu NIK satu akun, yang dibandingkan adalah sidik kriptografis NIK, bukan NIK aslinya.",
            "Hanya admin berwenang yang bisa membuka berkas identitas, dan setiap akses tercatat di log audit.",
            "Foto bukti disimpan tanpa bisa diubah dan hanya bisa dibuka lewat tautan sementara oleh pihak yang berhak.",
          ]}
        />
        <ToReview>lokasi penyimpanan data (dalam/luar negeri) dan kewajiban terkait pendaftaran PSE lingkup privat.</ToReview>
      </>
    ),
  },
  {
    id: "retensi",
    title: "Berapa lama data disimpan",
    body: (
      <>
        <LegalList
          items={[
            "Foto KTP dan selfie: rencananya dihapus otomatis setelah keputusan verifikasi. Yang tersisa hanya status verifikasi dan sidik NIK.",
            "Foto bukti kondisi dan foto jaminan: usulan 90 hari setelah sewa selesai, atau sampai sengketa tuntas.",
            "Chat dan kesepakatan sewa: selama dibutuhkan untuk bukti dan kewajiban hukum, lalu dihapus atau dianonimkan.",
            "Sidik NIK akun yang diblokir disimpan lebih lama agar blokir tetap berlaku.",
          ]}
        />
        <ToReview>angka masa simpan final untuk setiap jenis data terhadap UU 27/2022 tentang Pelindungan Data Pribadi.</ToReview>
      </>
    ),
  },
  {
    id: "hak",
    title: "Hak kamu atas datamu",
    body: (
      <>
        <LegalList
          items={[
            "Melihat dan mengunduh salinan datamu.",
            "Memperbaiki data yang salah lewat halaman profil.",
            "Menarik persetujuan dan menghapus akun. Data akan dihapus atau dianonimkan, kecuali yang masih dibutuhkan untuk sewa atau sengketa yang sedang berjalan.",
            "Bertanya atau mengajukan keberatan soal pemrosesan datamu.",
          ]}
        />
        <p>
          Fitur ekspor dan hapus akun sedang disiapkan. Sementara itu, ajukan lewat{" "}
          <a href="mailto:halo@sewain.me" className="font-medium text-ink underline underline-offset-2">
            halo@sewain.me
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "pihak-lain",
    title: "Pihak lain yang membantu kami",
    body: (
      <>
        <p>Beberapa layanan pihak ketiga dipakai hanya sebatas yang diperlukan, misalnya pengirim kode OTP lewat WhatsApp/SMS, penyimpanan berkas, dan (nanti) layanan verifikasi identitas serta pembayaran berizin.</p>
        <ToReview>daftar final pemroses data, perjanjian pemrosesan, dan transfer data lintas negara.</ToReview>
      </>
    ),
  },
  {
    id: "perubahan",
    title: "Perubahan kebijakan ini",
    body: (
      <p>
        Setiap versi diberi nomor dan tanggal. Kalau ada perubahan penting, kamu akan diberi tahu dan diminta menyetujui versi barunya. Lihat juga{" "}
        <Link href="/bantuan#privasi" className="font-medium text-ink underline underline-offset-2">
          ringkasan privasi di halaman bantuan
        </Link>
        .
      </p>
    ),
  },
];

export default function PrivasiPage() {
  return (
    <LegalDoc
      title="Kebijakan privasi"
      version={LEGAL_DRAFT.privacyVersion}
      date={LEGAL_DRAFT.date}
      other={{ href: "/syarat", label: "Syarat & ketentuan" }}
      intro={<p>Data yang kami minta seminimal mungkin, dan yang terlihat oleh pengguna lain lebih sedikit lagi. Kerangka ini mengacu pada UU Pelindungan Data Pribadi (UU 27/2022).</p>}
      sections={SECTIONS}
    />
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc, LegalList, ToReview, type LegalSection } from "@/components/legal/LegalDoc";
import { LEGAL_DRAFT } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Syarat & ketentuan (draf)",
  description: "Kerangka Syarat & Ketentuan Sewain. Draf, menunggu review konsultan hukum.",
};

const a = (href: string, label: string) => (
  <Link href={href} className="font-medium text-ink underline underline-offset-2">
    {label}
  </Link>
);

// Outline follows PRD §12.4 (S&K row) + §9.3.1 (jaminan), §11 (sengketa), §12.2 (larangan), §14 (komisi).
const SECTIONS: LegalSection[] = [
  {
    id: "peran-sewain",
    title: "Peran Sewain: penghubung, bukan pihak sewa",
    body: (
      <>
        <LegalList
          items={[
            "Rencananya, Sewain berperan sebagai platform yang mempertemukan penyewa dan penyedia. Perjanjian sewa terjadi langsung di antara kedua pengguna.",
            "Sewain tidak memiliki, menyimpan, atau memeriksa barang yang disewakan.",
            "Dalam sengketa, Sewain bertindak sebagai mediator yang memberi rekomendasi, bukan hakim atau penjamin ganti rugi.",
          ]}
        />
        <ToReview>batas tanggung jawab platform, dan apakah ringkasan kesepakatan digital cukup kuat sebagai bukti perjanjian sewa (KUHPerdata Buku III).</ToReview>
      </>
    ),
  },
  {
    id: "akun",
    title: "Akun dan verifikasi identitas",
    body: (
      <>
        <LegalList
          items={[
            "Satu orang satu akun. Satu NIK hanya bisa dipakai untuk satu akun yang terverifikasi.",
            <>Untuk menyewa atau menyewakan, akun perlu diverifikasi dengan KTP dan selfie. Cara datanya diproses ada di {a("/privasi", "Kebijakan privasi")}.</>,
            "Kamu bertanggung jawab menjaga akses ke nomor HP dan sesi akunmu.",
          ]}
        />
        <ToReview>kapasitas hukum pengguna di bawah 21 tahun (banyak mahasiswa), dan apakah perlu persetujuan wali.</ToReview>
      </>
    ),
  },
  {
    id: "listing",
    title: "Listing dan barang yang dilarang",
    body: (
      <>
        <p>Penyedia bertanggung jawab atas kebenaran deskripsi, foto, dan kondisi barang yang ditawarkan.</p>
        <LegalList
          items={[
            <>Barang terlarang tidak boleh disewakan. Daftarnya ada di {a("/bantuan#larangan", "Barang yang dilarang")}.</>,
            <>Kendaraan dan barang berisiko tinggi punya syarat tambahan, lihat {a("/bantuan#kendaraan", "Kendaraan & barang berisiko tinggi")}.</>,
            "Sewain boleh menurunkan listing yang melanggar aturan, termasuk lewat filter kata terlarang.",
          ]}
        />
        <ToReview>izin usaha untuk akun Toko yang menyewakan kendaraan.</ToReview>
      </>
    ),
  },
  {
    id: "kesepakatan",
    title: "Kesepakatan sewa dan jaminan antar pengguna",
    body: (
      <>
        <LegalList
          items={[
            "Setiap sewa punya ringkasan kesepakatan (tanggal, harga, jaminan, denda telat, pembatalan, aturan khusus) yang disetujui kedua pihak di aplikasi.",
            "Jaminan adalah kesepakatan antara penyewa dan penyedia. Sewain tidak memegang uang, dokumen, atau barang jaminan.",
            "Penyedia wajib mengembalikan jaminan setelah barang kembali sesuai kesepakatan.",
            <>Default jaminan identitas menyarankan KTM, SIM, atau kartu lain, bukan e-KTP. Penjelasan lengkap ada di {a("/bantuan#jaminan", "Jaminan & deposit")}.</>,
          ]}
        />
        <ToReview>apakah jaminan dokumen berharga (BPKB, sertifikat) bisa dianggap gadai, dan dasar aturan soal menitipkan e-KTP fisik.</ToReview>
      </>
    ),
  },
  {
    id: "pembayaran",
    title: "Pembayaran dan komisi",
    body: (
      <>
        <LegalList
          items={[
            "Selama pilot, pembayaran sewa dilakukan langsung ke penyedia saat barang sudah di tangan. Jangan transfer apa pun sebelum ketemu langsung.",
            "Pembayaran lewat Sewain (payment gateway berlisensi) direncanakan untuk tahap berikutnya dan akan punya ketentuan sendiri.",
            <>Aturan komisi dijelaskan di {a("/bantuan#komisi", "Berapa komisinya?")}. Perubahan komisi diumumkan sebelum berlaku.</>,
          ]}
        />
        <ToReview>ketentuan dana pengguna saat gateway aktif (Fase 2), dan perlakuan pajak komisi.</ToReview>
      </>
    ),
  },
  {
    id: "bukti",
    title: "Foto dan chat sebagai bukti",
    body: (
      <LegalList
        items={[
          "Foto serah terima dan pengembalian diberi cap waktu dan sidik digital (hash) oleh server, lalu tidak bisa diubah.",
          "Chat di Sewain, foto bukti, dan ringkasan kesepakatan dipakai sebagai bukti kalau ada masalah. Percakapan di luar Sewain tidak bisa diverifikasi mediator.",
          "Dengan memakai fitur foto dan chat, kamu memahami bahwa isinya bisa dilihat pihak lain dalam sewa itu dan oleh mediator bila ada sengketa.",
        ]}
      />
    ),
  },
  {
    id: "sengketa",
    title: "Penyelesaian sengketa",
    body: (
      <>
        <p>
          Sengketa diselesaikan bertahap: negosiasi antar pengguna dulu, lalu mediasi admin. Alurnya ada di{" "}
          {a("/bantuan#sengketa", "Penyelesaian sengketa")}.
        </p>
        <ToReview>kekuatan rekomendasi mediator, dan rujukan ke jalur hukum di luar Sewain bila mediasi gagal.</ToReview>
      </>
    ),
  },
  {
    id: "pelanggaran",
    title: "Pelanggaran dan sanksi",
    body: (
      <LegalList
        items={[
          "Pelanggaran bisa berujung strike, penangguhan akun (suspend), sampai pemblokiran.",
          "Akun yang diblokir tidak bisa mendaftar ulang dengan NIK yang sama.",
          "Kamu bisa mengajukan keberatan atas sanksi lewat halaman bantuan.",
        ]}
      />
    ),
  },
  {
    id: "perubahan",
    title: "Perubahan dokumen ini",
    body: (
      <p>
        Setiap versi diberi nomor dan tanggal. Kalau ada perubahan penting, kamu akan diberi tahu di aplikasi dan diminta menyetujui versi barunya
        sebelum bisa bertransaksi lagi.
      </p>
    ),
  },
];

export default function SyaratPage() {
  return (
    <LegalDoc
      title="Syarat & ketentuan"
      version={LEGAL_DRAFT.termsVersion}
      date={LEGAL_DRAFT.date}
      other={{ href: "/privasi", label: "Kebijakan privasi" }}
      intro={<p>Pokok-pokok aturan main sewa-menyewa di Sewain. Bahasanya sengaja sederhana; versi final dari konsultan bisa lebih rinci.</p>}
      sections={SECTIONS}
    />
  );
}

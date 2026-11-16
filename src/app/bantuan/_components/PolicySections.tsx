import { Ban, Database, IdCard, Mail, ShieldAlert, Flag } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Ready } from "@/components/ui/Gate";
import { Notice, Skeleton } from "@/components/ui/Layout";
import { PUBLIC_MEETING_POINTS } from "@/lib/data/areas";
import { FORBIDDEN_CATEGORIES, RISK_NOTES } from "@/lib/data/categories";
import { CommissionNow, HighValueThreshold } from "./LiveSettings";
import { Bullets, HelpSection, LegalDraftNote, SubHeading } from "./ui";

// PRD §12.1 (anti-penipuan), §9.1 (verifikasi), §9.9 + §14 (komisi), §12.2 (larangan), §12.3 (berisiko tinggi),
// §12.4 (S&K, privasi), in plain Indonesian.

export function Aman() {
  return (
    <HelpSection id="aman" lead="Sebagian besar penipuan sewa-menyewa terjadi di luar aplikasi dan sebelum barang berpindah tangan. Pegang aturan sederhana ini.">
      <Notice tone="ink" icon={<ShieldAlert className="size-5" />} title="Jangan transfer apa pun sebelum barang di tangan atau ketemu langsung.">
        Pola paling umum: “penyedia” minta DP atau deposit lewat transfer, lalu menghilang. Selama pilot, bayar saat serah terima dan setelah barangnya kamu cek.
      </Notice>
      <Bullets
        items={[
          <>
            Ketemu di titik temu publik yang ramai. Contoh di sekitar UGM: {PUBLIC_MEETING_POINTS.slice(0, 3).join(", ")}.
          </>,
          "Ngobrol lewat chat Sewain. Pindah ke WhatsApp boleh, tapi bukti di luar Sewain tidak bisa dipakai mediator.",
          "Cek profil dulu: tanda Terverifikasi, rating, dan jumlah sewa yang sudah selesai.",
          "Selalu foto barang dan jaminan saat serah terima, walaupun sudah kenal.",
          "Curiga? Tekan Laporkan di halaman barang atau profil. Satu NIK hanya bisa punya satu akun, jadi akun yang diblokir tidak bisa daftar ulang.",
        ]}
      />
      <div>
        <SubHeading>Pola yang kami antisipasi</SubHeading>
        <Bullets
          items={[
            "Penyedia palsu minta transfer atau deposit, lalu menghilang.",
            "Penyewa meminjam lalu tidak mengembalikan.",
            "Penyedia tidak mengembalikan jaminan, terutama dokumen berharga.",
            "Akun ganda setelah diblokir.",
            "Titik temu yang sepi atau tidak aman.",
          ]}
        />
      </div>
    </HelpSection>
  );
}

export function Verifikasi() {
  return (
    <HelpSection
      id="verifikasi"
      lead="Penyewa dan penyedia sama-sama diverifikasi dengan KTP + selfie, cukup sekali. Ini dasar kepercayaan di Sewain: orang yang meminjam atau meminjamkan barangmu benar-benar ada."
    >
      <Bullets
        items={[
          "Satu NIK untuk satu akun. Akun yang diblokir tidak bisa membuat akun baru.",
          "Data KTP tidak pernah ditampilkan ke pengguna lain. Yang terlihat hanya tanda “Terverifikasi” dan nama depan atau nama panggilan.",
          "Belum verifikasi? Kamu tetap bisa menjelajah, tapi belum bisa mengajukan sewa atau membuat listing.",
          "Di produk nanti, pengecekan dilakukan otomatis oleh penyedia layanan verifikasi berizin (baca KTP, cek wajah asli, cocokkan data kependudukan), dengan review manual oleh tim sebagai cadangan.",
        ]}
      />
      <Notice icon={<IdCard className="size-4" />} title="Di prototipe ini">
        Scan KTP dan selfie disimulasikan, dan ada tombol “Lewati (demo)”. Tidak ada data yang dikirim ke pihak mana pun.
      </Notice>
      <ButtonLink href="/verifikasi" variant="secondary">
        <IdCard className="size-4" /> Verifikasi sekarang
      </ButtonLink>
    </HelpSection>
  );
}

export function Komisi() {
  return (
    <HelpSection id="komisi" lead="Satu-satunya pendapatan Sewain adalah komisi per transaksi sewa. Selama pilot (sekitar 6 bulan pertama), komisinya 0%.">
      <Ready fallback={<Skeleton className="h-36 w-full rounded-card" />}>
        <CommissionNow />
      </Ready>
      <Bullets
        items={[
          "Bentuknya persen dari nilai sewa atau flat per transaksi, dengan batas minimum dan maksimum opsional. Semuanya diatur admin.",
          "Yang menanggung bisa penyewa, penyedia, atau dibagi dua.",
          "Dihitung dari nilai sewa saja, bukan dari jaminan atau deposit.",
          "Perubahan hanya berlaku untuk sewaan baru. Sewaan lama tetap memakai angka di kesepakatannya.",
          "Selama nonaktif, nilai “seandainya aktif” tetap dicatat untuk analisis, tapi tidak ditagih.",
          "Komisi baru diaktifkan setelah pembayaran lewat Sewain (payment gateway) tersedia. Rencana awal 10% dari nilai sewa, min Rp2.000 — masih bisa berubah.",
        ]}
      />
    </HelpSection>
  );
}

export function Larangan() {
  return (
    <HelpSection
      id="larangan"
      lead="Barang di bawah ini tidak bisa disewakan di Sewain. Kategorinya tidak bisa dipilih, dan judul serta deskripsi listing disaring dengan daftar kata kunci yang dikelola admin."
    >
      <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {FORBIDDEN_CATEGORIES.map((c) => (
          <li key={c} className="flex gap-2.5">
            <Ban className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
            <span>{c}</span>
          </li>
        ))}
      </ul>
      <Bullets
        items={[
          "Pisau dapur dan perkakas yang wajar tetap boleh.",
          "Dokumen identitas dan surat berharga dilarang sebagai barang sewaan. Ini beda dengan menitipkannya sebagai jaminan (lihat bagian Jaminan).",
          "Lihat listing mencurigakan? Laporkan. Admin bisa menurunkan listing dan memberi strike.",
        ]}
      />
    </HelpSection>
  );
}

export function Kendaraan() {
  return (
    <HelpSection id="kendaraan" lead="Boleh disewakan, dengan syarat tambahan supaya kedua pihak sama-sama aman.">
      <div>
        <SubHeading>Kendaraan bermotor (motor, mobil)</SubHeading>
        <Bullets
          items={[
            "Penyedia wajib terverifikasi dan mengunggah foto STNK yang masih berlaku. Nomor polisi disamarkan untuk publik.",
            "Penyewa wajib punya SIM sesuai golongan.",
            "Jaminan yang disarankan: deposit, BPKB, atau jaminan custom.",
            "Foto odometer dan indikator bensin saat serah terima dan pengembalian.",
            "Selalu persetujuan manual, tidak ada setuju otomatis.",
            "Kesepakatan mencantumkan tanggung jawab tilang, kerusakan, dan kehilangan.",
          ]}
        />
      </div>
      <div>
        <SubHeading>Kategori berisiko lain</SubHeading>
        <Bullets items={[RISK_NOTES.elektronik, RISK_NOTES.keselamatan, RISK_NOTES.listrik]} />
      </div>
      <p className="text-body-sm text-smoke">
        Barang dengan nilai di atas{" "}
        <Ready fallback={<span>ambang yang diatur admin</span>}>
          <HighValueThreshold />
        </Ready>{" "}
        mendapat badge “Bernilai tinggi” supaya kedua pihak sadar risikonya, dan juga wajib disetujui manual oleh penyedia.
      </p>
    </HelpSection>
  );
}

export function Syarat() {
  return (
    <HelpSection id="syarat" lead="Poin-poin utama yang akan masuk ke Syarat & Ketentuan Sewain.">
      <LegalDraftNote />
      <Bullets
        items={[
          "Sewain adalah platform penghubung, bukan pihak dalam perjanjian sewa. Perjanjian sewa terjadi antara penyewa dan penyedia.",
          "Dalam sengketa, Sewain berperan sebagai mediator, bukan hakim atau penjamin.",
          "Jaminan adalah kesepakatan antar pengguna. Sewain tidak memegang uang, dokumen, atau barang jaminan.",
          "Foto bukti, chat di Sewain, dan ringkasan kesepakatan dipakai sebagai bukti kalau ada masalah.",
          "Barang terlarang, aturan jaminan, komisi, dan mekanisme sengketa mengikuti yang dijelaskan di halaman ini.",
          "Pelanggaran bisa berujung strike, suspend, sampai blokir berbasis NIK.",
        ]}
      />
      <div>
        <ButtonLink href="/syarat" variant="secondary">
          Baca draf Syarat & ketentuan
        </ButtonLink>
      </div>
    </HelpSection>
  );
}

export function Privasi() {
  return (
    <HelpSection id="privasi" lead="Data yang kami minta seminimal mungkin, dan yang terlihat oleh pengguna lain lebih sedikit lagi.">
      <LegalDraftNote>Kebijakan privasi resmi akan disusun bersama konsultan hukum dan mengacu pada UU Pelindungan Data Pribadi (UU 27/2022).</LegalDraftNote>
      <Bullets
        items={[
          "Foto KTP dan selfie adalah data pribadi yang sensitif. Hanya dipakai untuk verifikasi, disimpan terenkripsi, dan hanya bisa diakses admin berwenang dengan catatan audit.",
          "Nama lengkap, nomor HP, dan NIK tidak ditampilkan ke pengguna lain.",
          "Lokasi presisi tidak pernah ditampilkan. Yang terlihat hanya jarak yang dibulatkan (misalnya “± 1,2 km”) dan nama area.",
          "Titik temu detail baru terlihat setelah request disetujui.",
          "Foto jaminan hanya terlihat oleh kedua pihak dan mediator.",
          "Usulan masa simpan foto bukti: 90 hari setelah sewa selesai, atau sampai sengketa tuntas.",
        ]}
      />
      <div>
        <ButtonLink href="/privasi" variant="secondary">
          Baca draf Kebijakan privasi
        </ButtonLink>
      </div>
      <Notice icon={<Database className="size-4" />} title="Di prototipe ini">
        Semua data (akun, listing, foto) hanya tersimpan di browser yang sedang kamu pakai, tidak dikirim ke server mana pun.
      </Notice>
    </HelpSection>
  );
}

export function Kontak() {
  return (
    <HelpSection id="kontak" lead="Masalah di sebuah sewaan paling cepat diurus dari aplikasi, karena bukti foto, chat, dan kesepakatan langsung terlampir.">
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/sewaan">
          <Flag className="size-4" /> Buka sewaan saya
        </ButtonLink>
        <ButtonLink href="mailto:halo@sewain.me" variant="secondary">
          <Mail className="size-4" /> halo@sewain.me
        </ButtonLink>
      </div>
      <Bullets
        items={[
          "Di halaman sewaan, tekan “Laporkan masalah” untuk membuka sengketa. Admin menargetkan rekomendasi dalam 5 hari kerja.",
          "Akun Instagram dan WhatsApp resmi diumumkan saat pilot dibuka.",
          "Sewain dibuat oleh Tim Kurakuraninja, Universitas Gadjah Mada, Yogyakarta.",
        ]}
      />
    </HelpSection>
  );
}

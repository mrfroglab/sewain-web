import { ArrowRight, Camera, Info } from "lucide-react";
import { Ready } from "@/components/ui/Gate";
import { Notice, Skeleton } from "@/components/ui/Layout";
import { STATUS_FLOW, STATUS_LABEL } from "@/lib/selectors";
import { CollateralRulesNow } from "./LiveSettings";
import { Bullets, HelpSection, Rows, Steps, SubHeading } from "./ui";

// PRD §8 (alur), §9.3.1 (jaminan), §10 (foto bukti), §11 (sengketa), in plain Indonesian.

export function CaraKerja() {
  return (
    <HelpSection
      id="cara-kerja"
      lead="Sewain mempertemukan orang yang butuh barang sebentar dengan tetangga yang punya barang nganggur, dalam radius dekat. Barangnya kembali ke pemilik, jadi yang kami jaga adalah kepercayaan dan kondisi barang."
    >
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <SubHeading>Kalau kamu menyewa</SubHeading>
          <Steps
            items={[
              "Masuk dengan nomor HP, lalu verifikasi KTP + selfie (cukup sekali).",
              "Atur titik kos atau kampus dan radiusnya, lalu buka detail barang.",
              "Baca aturan penyedia dulu: harga, jaminan yang diminta, cara serah terima, dan denda telat.",
              "Ajukan tanggal dan cara serah terima, pilih bentuk jaminan, lalu setujui ringkasan kesepakatan.",
              "Tunggu persetujuan. Kalau 24 jam tidak direspons, request otomatis kadaluarsa. Titik temu detail baru terlihat setelah disetujui.",
              "Saat serah terima, barang dan jaminan difoto, lalu kalian berdua menekan “Setuju kondisi”.",
              "Saat mengembalikan, barang difoto lagi. Penyedia mengembalikan jaminan, kamu konfirmasi sudah diterima.",
              "Saling beri rating. Ada masalah? Laporkan dari halaman sewaan.",
            ]}
          />
        </div>
        <div>
          <SubHeading>Kalau kamu menyewakan</SubHeading>
          <Steps
            items={[
              "Daftar dan verifikasi KTP. Pilih akun Individu, atau Toko kalau kamu punya rental kecil.",
              "Buat listing: minimal 3 foto (termasuk cacat yang sudah ada), harga, perkiraan nilai barang, jaminan (ada saran otomatis), lokasi, dan radius jangkauan.",
              "Cek profil, rating, dan status verifikasi penyewa, lalu setujui atau tolak.",
              "Saat serah terima, foto barang dan jaminan.",
              "Saat barang kembali, foto lagi lalu pilih “Kondisi sesuai” atau “Ada masalah”.",
              "Kembalikan jaminan dan tandai di aplikasi.",
            ]}
          />
        </div>
      </div>

      <div>
        <SubHeading>Perjalanan satu sewaan</SubHeading>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2" aria-label="Urutan status sewaan">
          {STATUS_FLOW.map((s, i) => (
            <li key={s} className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-7 items-center rounded-control border border-border-gray px-3 text-nav font-medium text-ink">{STATUS_LABEL[s]}</span>
              {i < STATUS_FLOW.length - 1 && <ArrowRight aria-hidden className="size-3.5 text-ash" />}
            </li>
          ))}
        </ol>
        <Bullets
          className="mt-4"
          items={[
            "“Sedang disewa” baru dimulai setelah kedua pihak setuju kondisi barang dan jaminan saat serah terima.",
            "Lewat tanggal kembali, sewaan ditandai telat (bukan status akhir) dan denda per hari mengikuti aturan penyedia.",
            "Sebelum serah terima, request bisa ditolak, kadaluarsa, atau dibatalkan.",
            "“Selesai” butuh dua konfirmasi: penyedia mengembalikan jaminan, penyewa menerimanya. Kalau penyewa tidak merespons 48 jam, otomatis selesai.",
          ]}
        />
      </div>
    </HelpSection>
  );
}

export function Jaminan() {
  return (
    <HelpSection
      id="jaminan"
      lead="Jaminan adalah pegangan penyedia selama barangnya dipakai orang lain. Penyedia boleh membuka beberapa pilihan, dan penyewa memilih satu saat mengajukan sewa."
    >
      <Rows
        rows={[
          { term: "Titip kartu identitas", detail: "Pilihan bawaan. KTM, SIM, kartu pelajar, atau kartu lain. Kami menyarankan bukan e-KTP." },
          { term: "Uang deposit", detail: "Nominal tetap atau persen dari nilai barang. Dikembalikan setelah barang kembali dalam kondisi sesuai." },
          { term: "Titip barang lain", detail: "Misalnya HP lama atau laptop, dengan deskripsi dan perkiraan nilainya." },
          { term: "Jaminan custom", detail: "Teks bebas untuk barang bernilai tinggi, misalnya BPKB atau sertifikat." },
        ]}
      />
      <div>
        <SubHeading>Saran jaminan otomatis</SubHeading>
        <p className="mb-3">
          Nilai barang tidak dibatasi. Sebagai gantinya, sistem menyarankan jaminan sesuai nilai dan kategori barang. Ambang di bawah ini diatur admin dan berlaku sekarang:
        </p>
        <Ready fallback={<Skeleton className="h-44 w-full" />}>
          <CollateralRulesNow />
        </Ready>
        <p className="mt-3 text-body-sm text-smoke">
          Kalau penyedia memasang jaminan di bawah saran, muncul peringatan. Peringatannya tidak memblokir: keputusan akhir tetap di penyedia.
        </p>
      </div>
      <div>
        <SubHeading>Saat serah terima dan pengembalian</SubHeading>
        <Bullets
          items={[
            "Jaminan wajib difoto saat serah terima. Fotonya hanya bisa dilihat kalian berdua dan mediator.",
            "Untuk kartu atau dokumen, tutup sebagian nomor penting (misalnya NIK) sebelum difoto.",
            "Dokumen asli jadi tanggung jawab penyedia selama dititipkan.",
            "Pengembalian jaminan dikonfirmasi kedua pihak di aplikasi.",
            "Selama pilot, Sewain tidak memegang uang, dokumen, atau barang jaminan. Jaminan adalah kesepakatan antar pengguna. Nanti, deposit uang bisa ditahan lewat payment gateway berizin, bukan rekening Sewain.",
          ]}
        />
      </div>
    </HelpSection>
  );
}

export function FotoBukti() {
  return (
    <HelpSection
      id="foto-bukti"
      lead="Ini fitur inti Sewain. Kondisi barang direkam di tiga titik, jadi kalau ada yang berubah, semua orang bisa lihat kapan perubahannya terjadi."
    >
      <ol className="grid gap-5 sm:grid-cols-3 sm:gap-6">
        {[
          { title: "Foto referensi", when: "Saat membuat listing", text: "Penyedia memotret minimal 3 sudut plus close-up cacat yang sudah ada." },
          {
            title: "Serah terima",
            when: "Saat barang diambil",
            text: "Minimal 3 foto barang + foto jaminan. Kendaraan: tambah foto odometer dan indikator bensin. Kedua pihak menekan “Setuju kondisi”.",
          },
          {
            title: "Pengembalian",
            when: "Saat barang kembali",
            text: "Minimal 3 foto. Penyedia memilih “Kondisi sesuai” atau “Ada masalah” lengkap dengan jenis masalah dan fotonya.",
          },
        ].map((p, i) => (
          <li key={p.title} className="border-t border-ink pt-3">
            <p className="text-micro font-semibold uppercase tracking-[0.08em] text-smoke">
              {i + 1} · {p.when}
            </p>
            <p className="mt-1 font-semibold text-ink">{p.title}</p>
            <p className="mt-1 text-body-sm">{p.text}</p>
          </li>
        ))}
      </ol>
      <div>
        <SubHeading>Kenapa fotonya bisa dipercaya</SubHeading>
        <Bullets
          items={[
            "Foto diambil lewat kamera di dalam halaman. Kalau terpaksa dari galeri, fotonya diberi label “dari galeri” dan bobot buktinya lebih rendah.",
            "Waktu foto dicatat oleh sistem saat diunggah, bukan dari jam HP.",
            "Setiap foto punya sidik digital. Kalau fotonya diubah sedikit saja, sidiknya tidak cocok lagi.",
            "Foto tidak bisa dihapus atau diganti, hanya bisa ditambah.",
            "Tampilan foto diberi tanda air kecil: kode sewaan + tanggal dan jam.",
            "Mediator melihat foto referensi, serah terima, dan pengembalian berdampingan per sudut.",
          ]}
        />
      </div>
      <Notice icon={<Camera className="size-4" />} title="Batasan yang jujur">
        Foto bukan jaminan mutlak. Cacat bisa tersembunyi dari sudut tertentu, dan kerusakan di dalam mesin atau elektronik tidak kelihatan. Karena itu beberapa kategori punya checklist fungsi
        (misalnya kamera: bisa menyala, lensa tidak berjamur, baterai ikut) yang dicek bareng saat serah terima.
      </Notice>
    </HelpSection>
  );
}

export function Sengketa() {
  return (
    <HelpSection id="sengketa" lead="Bukti dulu, opini belakangan. Sewain berperan sebagai mediator, bukan hakim atau penjamin, dan masalah sebisa mungkin diselesaikan di lapis paling bawah.">
      <div>
        <SubHeading>Lima lapis penyelesaian</SubHeading>
        <Rows
          termWidth="sm:grid-cols-[230px_minmax(0,1fr)]"
          rows={[
            {
              tag: <LayerTag>L0</LayerTag>,
              term: "Pencegahan",
              detail: "Verifikasi KTP + selfie, kesepakatan sewa digital, saran jaminan, foto di tiga titik, aturan penyedia terlihat sebelum request, rating, dan peringatan anti-penipuan.",
            },
            {
              tag: <LayerTag>L1</LayerTag>,
              term: "Negosiasi langsung (48 jam)",
              detail:
                "Tekan “Laporkan masalah” saat pengembalian atau kapan pun selama sewa berjalan. Pihak lain diminta merespons. Pilih template solusi: potong deposit sebagian, ganti biaya perbaikan, ganti nilai barang, atau perpanjang waktu.",
            },
            {
              tag: <LayerTag>L2</LayerTag>,
              term: "Mediasi admin (target ≤ 5 hari kerja)",
              detail: "Admin menilai foto, chat, jaminan, dan kesepakatan, lalu memberi rekomendasi tertulis beserta alasannya. Rekomendasi tercatat di profil kedua pihak.",
            },
            {
              tag: <LayerTag>L3</LayerTag>,
              term: "Konsekuensi di platform",
              detail: "Menolak rekomendasi tanpa alasan, mengabaikan panggilan admin, atau terbukti curang: strike, lalu suspend, lalu blokir permanen berbasis NIK.",
            },
            {
              tag: <LayerTag>L4</LayerTag>,
              term: "Jalur hukum",
              detail: "Gugatan perdata atau laporan polisi di luar platform. Sewain menyerahkan data bukti sesuai permintaan resmi aparat dan hukum yang berlaku.",
            },
          ]}
        />
      </div>
      <div>
        <SubHeading>Panduan rekomendasi per kasus</SubHeading>
        <p className="mb-3 text-body-sm text-smoke">Ini titik awal mediator. Keputusan akhir tetap melihat bukti tiap kasus.</p>
        <Rows
          termWidth="sm:grid-cols-[230px_minmax(0,1fr)]"
          rows={[
            { term: "Lecet atau aus ringan", detail: "Dianggap wajar pakai, tanpa kompensasi. Pembedanya: apakah cacatnya baru dan mengurangi fungsi atau nilai." },
            { term: "Rusak, bisa diperbaiki", detail: "Penyewa mengganti biaya perbaikan yang wajar, dipotong dari deposit, sisanya dikembalikan." },
            { term: "Rusak berat atau hilang", detail: "Penyewa mengganti nilai pasar barang bekas saat ini, bukan harga baru." },
            { term: "Telat kembali", detail: "Denda per hari sesuai aturan penyedia, maksimal sesuai batas di kesepakatan." },
            { term: "Tidak dikembalikan", detail: "Sengketa prioritas dan blokir NIK. Jaminan yang dipegang penyedia jadi kompensasi awal, dan penyedia dibantu data untuk jalur hukum." },
            { term: "Jaminan ditahan penyedia", detail: "Penyedia wajib mengembalikan. Menolak berarti strike berat lalu suspend; kalau jaminannya dokumen berharga, kasusnya diprioritaskan." },
            { term: "Barang tidak sesuai deskripsi", detail: "Penyewa boleh batal tanpa penalti kalau dilaporkan saat serah terima. Penyedia kena strike kalau terbukti menyesatkan." },
            { term: "Penyedia batal sepihak", detail: "Strike untuk penyedia." },
            { term: "Penyewa tidak datang", detail: "Penyedia bebas membatalkan, penyewa kena strike." },
            { term: "Deposit ditahan tanpa bukti", detail: "Kalau penyedia tidak bisa menunjukkan kerusakan, deposit wajib dikembalikan. Berulang berarti strike." },
            { term: "Kendaraan: tilang/kecelakaan", detail: "Tilang dan kerusakan selama sewa jadi tanggung jawab penyewa sesuai kesepakatan. Kecelakaan dengan korban di luar kewenangan platform." },
            { term: "Klaim palsu (dua arah)", detail: "Strike berat atau suspend." },
          ]}
        />
      </div>
      <Notice icon={<Info className="size-4" />} title="Jujur soal batas kami">
        Selama pilot, pembayaran belum lewat Sewain. Jadi daya paksa kami adalah jaminan yang dipegang penyedia, reputasi, strike, suspend, dan blokir NIK. Setelah pembayaran lewat payment
        gateway aktif, deposit bisa ditahan sehingga rekomendasi mediator langsung bisa dijalankan.
      </Notice>
    </HelpSection>
  );
}

function LayerTag({ children }: { children: string }) {
  return <span className="inline-flex h-5 shrink-0 items-center rounded-control bg-ink px-1.5 text-micro font-semibold text-white">{children}</span>;
}

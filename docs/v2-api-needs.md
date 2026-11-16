# Kebutuhan API v2 dari web (snapshot terbatas + Fase 6A)

Disusun worker `web-v2a`, 16 Nov 2026, dari audit semua rute dan selector `sewain-web` terhadap tabel visibilitas
ROADMAP §4. Prioritas: **P0** = tanpa ini ada halaman yang salah/rusak di mode `scoped`; **P1** = fitur jadi
berkurang tapi tidak salah; **P2** = rapi-rapi.

Prinsip di web: kalau field di bawah tidak ada, web **tidak mengarang** angka. Statistik disembunyikan, cek
ketersediaan di klien dilewati (server tetap jadi penentu), dan teks diganti netral. Semua field baru bersifat
opsional, jadi web tetap kompatibel dengan v1 (`full`).

Mode uji di web: `NEXT_PUBLIC_SIMULATE_SCOPED=1` (dev saja) menyaring snapshot v1 di klien sesuai aturan §4 plus
usulan di dokumen ini. Lihat `src/lib/scope.ts`.

## Ringkasan

| # | Kebutuhan | Bentuk | Rute web | Prioritas |
|---|---|---|---|---|
| 1 | Penanda mode snapshot | `state.scope: "full" \| "scoped"`, `state.viewerId: string \| null` | semua (selector) | P0 |
| 2 | Profil publik semua user yang dirujuk | isi `users[]` | `/barang/[id]`, `/u/[id]`, `/cari`, `/papan`, ulasan, chat | P0 |
| 3 | `status` di profil publik | `User.status` tetap dikirim (aktif/suspend/blacklist) | `liveListings` di semua daftar barang | P0 |
| 4 | Listing yang dirujuk booking viewer, apa pun statusnya | isi `listings[]` | `/sewaan/*`, `/chat` | P0 |
| 5 | Tanggal sibuk per listing | `state.listingBusy` | `/barang/[id]/ajukan`, `/cari` (filter tanggal) | P0 |
| 6 | Statistik publik user | `User.publicStats` | `/u/[id]`, `/barang/[id]`, `/profil` | P1 |
| 7 | `chatReads` pihak lawan di booking bersama | isi `chatReads` | `/sewaan/[id]/chat` (tanda "Dibaca") | P1 |
| 8 | Persona demo di snapshot tamu (DEMO_MODE) | `User.demo` untuk akun demo | pemilih persona, panel Demo, `/masuk` | P0 (demo/staging) |
| 9 | Papan "dicari" | `wanted[]` publik + `offers` | `/papan` | P1 |
| 10 | `Idempotency-Key` + CORS | header + field body `idempotencyKey` | antrean aksi | P0 |
| 11 | Kode status aksi | 4xx `{ok:false,error}` untuk tolakan aturan, 5xx untuk galat sementara | antrean aksi | P0 |
| 12 | `GET /api/v1/config` | lihat §12 | seluruh app (mode bayar, legal) | P0 |
| 13 | `payBooking` metode `langsung` | arg `method: "langsung"` | `/sewaan/[id]` mode `offline` | P1 |
| 14 | `visibleAt` di ulasan | `Review.visibleAt?: number` | ulasan | P2 |
| 15 | Login HP di `/masuk` | OTP (F6.1, fase B) | `/masuk` | catatan |

## Detail

### 1. Penanda mode snapshot (P0)

```json
{ "scope": "scoped", "viewerId": "u-raka", "version": 812, "serverNow": 1763280000000, "...": "DataState" }
```

`viewerId` = `null` untuk tamu. Web memakai `scope` untuk memutuskan apakah agregat boleh dihitung dari data lokal
(`full`) atau harus dari field server (`scoped`). Tanpa penanda ini web hanya bisa menebak.

### 2. Profil publik semua user yang dirujuk (P0)

`users[]` wajib memuat profil publik untuk setiap user yang muncul di data yang dikirim: pemilik listing aktif,
penulis/penerima ulasan yang tampil, peminta dan penawar di papan, pihak lawan di booking viewer. Field publik:
`id, name` (nama depan saja), `nickname, accountType, store{name,areaId,hours}, areaId, campus, studentVerified,
earlyLender, bio, joinedAt, role, status, verification{status}, baseRating, baseRatingCount, demo` (lihat #8).
Tanpa `phone`, `email`, `verification.nikMasked/method/verifiedAt`, `strikes`.

Web sudah aman kalau user tidak ada (tampil "Pengguna"), tapi nama/avatar/badge jadi hilang.

### 3. `status` di profil publik (P0)

`liveListings()` menyaring listing yang pemiliknya `status === "aktif"`. Pilihan: kirim `status` di profil publik
(usulan), **atau** server tidak mengirim listing milik user suspend/blacklist. Web sekarang menganggap pemilik yang
tidak ada/tanpa status sebagai aktif, jadi opsi kedua juga aman.

### 4. Listing yang dirujuk booking viewer (P0)

Halaman `/sewaan/[id]/serah-terima`, `/pengembalian`, chat, dan daftar sewaan butuh `listings[]` berisi listing
setiap booking tempat viewer jadi pihak, walau listing itu sudah `nonaktif`/`arsip` (penyedia menjeda barang
saat sewa berjalan). Tanpa ini halaman serah terima menampilkan "Sewaan tidak ditemukan". Lokasi listing pihak
lain di sini boleh tetap dibulatkan.

### 5. Tanggal sibuk per listing (P0)

Form ajukan sewa menandai tanggal yang sudah terisi dan mencarikan tanggal kosong terdekat; filter tanggal di
`/cari` menyaring listing yang penuh. Keduanya dihitung dari booking orang lain. Usulan field snapshot (kecil,
tanpa identitas penyewa):

```json
"listingBusy": {
  "l-kompor-lapangan": [ { "start": "2026-11-20", "end": "2026-11-22", "count": 1 } ]
}
```

Isi: rentang booking `ACCEPTED`/`ACTIVE`/`DISPUTED` yang `end >= hari ini`, digabung per rentang, `count` =
jumlah unit terpakai (untuk stok toko). Alternatif kalau snapshot terlalu besar:
`GET /api/v1/listings/{id}/availability?from=YYYY-MM-DD&to=YYYY-MM-DD → {ok, stock, busy:[{start,end,count}]}`
plus filter tanggal di `GET /api/v1/listings/search` (sudah direncanakan F-S4).

Tanpa field ini web tidak menampilkan tanggal sibuk dan membiarkan server menolak bentrok (pesan server tampil
sebagai toast).

### 6. Statistik publik user (P1)

Kartu penyedia di detail barang dan profil publik menampilkan "n sewa selesai" dan skor kepercayaan. Keduanya
dihitung dari booking, sengketa, dan strike orang lain.

```json
"publicStats": { "completedRentals": 14, "disputes": 0, "trustScore": 78 }
```

`completedRentals` sudah termasuk `baseRatingCount` seed. `trustScore` pakai rumus `trustScore()` di
`src/lib/selectors.ts` (bisa dipindah apa adanya ke Go). Badge "Pernah bersengketa · n strike" di profil publik
akan disembunyikan di mode `scoped` kecuali server memutuskan jumlah strike memang publik (keputusan produk; kalau
ya, tambahkan `publicStats.strikes`). Tanpa field ini: angka disembunyikan, hanya rating yang tampil.

### 7. `chatReads` pihak lawan (P1)

Tanda "Dibaca" di chat memakai `chatReads["<pihakLawan>:<bookingId>"]`. Usulan: untuk setiap booking viewer, kirim
`chatReads` kedua pihak (ini data booking, bukan data pribadi). Tanpa ini tanda "Dibaca" tidak muncul.

### 8. Persona demo (P0 untuk demo/staging)

Pemilih persona (`/masuk`, panel Demo) membaca user dengan field `demo`. Di `DEMO_MODE`, snapshot tamu harus tetap
memuat profil publik akun demo **beserta** `demo:{label,persona}`. Contoh nomor HP di layar masuk memakai
`u-raka.phone`; di mode scoped web memakai nomor contoh statis.

### 9. Papan "dicari" (P1)

Tabel §4 belum menyebut `wanted`. Usulan: `wanted[]` berstatus `terbuka` publik (lokasi dibulatkan seperti
listing), `offers` hanya terlihat oleh peminta dan penawarnya sendiri (+admin). Postingan sendiri lengkap semua
status. Web sudah menangani `offers` kosong.

### 10. `Idempotency-Key` + CORS (P0)

Setiap aksi dari antrean web membawa kunci UUID v4 yang sama di setiap kirim ulang:

- header `Idempotency-Key: <uuid>`
- field body `"idempotencyKey": "<uuid>"` (cadangan, karena header kustom memicu preflight CORS)

Web hanya mengirim **header** kalau API satu origin, atau kalau `GET /api/v1/config` berhasil (= v2). Mohon CORS v2
mengizinkan `Idempotency-Key` di `Access-Control-Allow-Headers` (branch `ops` sudah). Perilaku yang diharapkan:
kunci yang sama + aktor yang sama → kembalikan respons asli (status + body) tanpa menjalankan ulang. Kunci sama
dengan aksi/args berbeda → `409 {ok:false,error}`.

### 11. Kode status aksi (P0)

Antrean web memperlakukan:

| Respons | Arti di web |
|---|---|
| 2xx `ok:true` | Sukses, hapus dari antrean |
| 2xx/4xx `ok:false` (kecuali 401/408/429) | Ditolak permanen: hapus, tampilkan `error`, sinkron ulang |
| 401 | Token kedaluwarsa: minta token baru, coba lagi |
| 408, 429, 5xx, galat jaringan | Sementara: coba lagi dengan backoff (maks ± 30 dtk), kunci sama |

v1 mengembalikan 200 `ok:false` untuk pelanggaran aturan; v2 boleh 4xx (mis. 409/422). Keduanya ditangani.

### 12. `GET /api/v1/config` (P0)

Sesuai usulan koordinator:

```json
{
  "ok": true,
  "appEnv": "staging",
  "demoMode": true,
  "paymentMode": "simulated",
  "auth": { "otpProvider": "echo" },
  "push": { "vapidPublicKey": "BP..." },
  "legal": { "termsVersion": "2026-11-draft-1", "privacyVersion": "2026-11-draft-1" }
}
```

Tanpa autentikasi, boleh di-cache singkat. Di v1 (404) web memakai default demo: `paymentMode: "simulated"`,
`demoMode: true`.

### 13. `payBooking` metode `langsung` (P1)

Mode `offline`: penyewa boleh menandai "sudah bayar langsung ke penyedia". Web memanggil
`payBooking(renterId, bookingId, "langsung")`. Server v2 perlu menerima `"langsung"` di enum metode dan menulis
pesan sistem netral ("Penyewa menandai sudah bayar langsung ke penyedia"), bukan "lunas via Sewain". Idealnya
penyedia juga bisa mengonfirmasi (aksi baru `confirmDirectPayment`, P2).

### 14. `visibleAt` di ulasan (P2)

Web menentukan ulasan tampil dengan melihat ulasan pasangannya. Di mode scoped ulasan pasangan yang belum tampil
tidak dikirim, jadi lebih rapi kalau server mengirim `visibleAt` dan web memakainya bila ada.

### 15. Login nomor HP di `/masuk` (catatan)

Alur "masuk pakai nomor HP" sekarang mencari `users[].phone` di klien. Di mode scoped nomor HP orang lain tidak
ada, jadi alur ini harus pindah ke OTP server (F6.1, fase B). Pemilih persona demo tidak terpengaruh.

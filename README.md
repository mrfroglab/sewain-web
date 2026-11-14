# sewain-web

Prototipe frontend **Sewain**: platform sewa-menyewa barang antar warga, mulai dari kampus UGM.
Dibuat untuk demo final Business Plan Competition Dinamik 21 (29 November 2026).

- Live: https://sewain.hallojanu.me
- Kebutuhan produk (`PRD.md`) dan design system (`DESIGN.md`) ada di folder project induk `sewain/` (pola multi-repo).

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript · zustand · Leaflet + OpenStreetMap · PWA (manifest + service worker) · pnpm.

## Cara kerja prototipe

Web ini terhubung ke [`sewain-api`](https://github.com/mrfroglab/sewain-api) (Go + Postgres/PostGIS) di `/api`:

- Saat API bisa dijangkau, server jadi sumber data tunggal. Setiap aksi diterapkan dulu di browser (UI instan), lalu
  dikirim ke server untuk divalidasi dan disimpan. Server mengirim event perubahan lewat WebSocket, sehingga semua
  perangkat (penyewa, penyedia, admin) tersinkron.
- Foto bukti di-upload; hash SHA-256 dan timestamp dihitung server. Halaman `/cari` memakai query radius dua arah PostGIS.
- Kalau API tidak terjangkau, web otomatis berjalan **offline** dengan data di browser (cadangan saat demo).

Logika domain yang sama juga ada di browser (dipakai untuk UI instan dan mode offline):

- `src/lib/store.ts` menjalankan semua alur PRD §7.2 sungguhan: state machine booking (REQUESTED → … → COMPLETED,
  termasuk EXPIRED, OVERDUE, DISPUTED, RESOLVED), kesepakatan sewa ber-hash SHA-256, jaminan, komisi, sengketa L1–L3,
  moderasi, dan pengaturan admin. Data disimpan di `localStorage`.
- Foto bukti (check-out, check-in, jaminan, chat, KTP/selfie) diambil lewat kamera browser, dikompres, di-hash, dan
  disimpan di IndexedDB. Foto dari galeri diberi label "dari galeri".
- Disimulasikan: OTP (kode `123456` ditampilkan di layar), eKYC (ada tombol "Lewati (demo)"), dan pembayaran.
- Sesi login per tab (`sessionStorage`), jadi satu jendela bisa jadi penyewa dan jendela lain jadi penyedia. Data
  tersinkron antar tab.
- Tombol **Demo** (kiri bawah): ganti akun, lompat ke booking di tiap status, percepat jam (uji kadaluarsa 24 jam,
  telat, selesai otomatis 48 jam), dan reset data.

Akun demo: Raka & Sinta (penyewa), Bima (belum verifikasi), Dina (kamera), Bu Tini (alat masak), Mas Bayu (akun Toko),
Admin. Semua bisa dipilih di halaman `/masuk`.

## Menjalankan

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck    # next typegen + tsc
pnpm lint         # oxlint
pnpm build && pnpm start
```

Environment variable (lihat `.env.example`): `NEXT_PUBLIC_SITE_URL` (opsional, default `https://sewain.hallojanu.me`),
`NEXT_PUBLIC_API_URL` (opsional; kosong = API di origin yang sama `/api`, isi `http://localhost:8080` untuk dev lokal).

## Struktur

```
src/app/            halaman (App Router)
src/components/     ui/ (tombol pill, badge, field, sheet…), shell/ (header, tab bar, footer, demo dock),
                    listing/, photo/ (kamera + foto bukti), map/ (Leaflet)
src/lib/            types, store (backend simulasi), seed data, selectors, pricing (sewa, komisi, saran jaminan),
                    photos (IndexedDB + SHA-256), session, format
public/img/         foto produk (lisensi bebas, atribusi di public/img/credits-*.json)
deploy/             docker-compose + deploy.sh untuk /opt/stacks/apps/sewain
```

## Deploy

Push ke `main` → GitHub Actions: typecheck, lint, build → image `ghcr.io/mrfroglab/sewain-web` → runner self-hosted
menarik image dan me-restart container `sewain-web` di `/opt/stacks/apps/sewain` (stack db + api + web; Caddy meneruskan
`/api/*` ke `sewain-api`).
Setup awal atau darurat: `deploy/deploy.sh` (atau `BUILD_LOCAL=1 deploy/deploy.sh` tanpa GHCR).

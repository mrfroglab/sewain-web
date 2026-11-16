# Suite regresi demo

Skenario yang dipakai sebagai gerbang sebelum versi baru menggantikan demo (ROADMAP §6). Semua jalan di viewport
390 px, dan tiap akun memakai browser context terpisah (= perangkat berbeda).

| Berkas | Isi |
|---|---|
| `api.mjs` | Kontrak API: login demo, otorisasi aktor, siklus booking, unggah foto (hash server), PostGIS dua arah, aksi admin, jam demo, WebSocket |
| `rental-cycle.mjs` | Siklus sewa penuh Raka ↔ Mas Bayu: request, setujui, bayar, check-out kamera, setuju kondisi, check-in, jaminan, rating |
| `dispute-admin-onboarding.mjs` | Sengketa L1, mediasi admin L2, wizard listing Bu Tini, daftar + OTP + eKYC simulasi, kadaluarsa via jam demo |
| `realtime.mjs` | Pesan chat muncul di perangkat lain tanpa reload |
| `offline-queue.mjs` | Antrean aksi (F6.9): aksi lalu reload instan, request terputus lalu reload, dan offline → online. Server menerima tepat sekali |
| `routes-smoke.mjs` | Semua rute × tamu/penyewa/penyedia/admin di 360 px: tanpa error JS, tanpa scroll horizontal, tanpa "tidak ditemukan". Tidak mengubah data, dijalankan terpisah: `node routes-smoke.mjs <web-base>` |
| `auth-otp.mjs` | F6.1/F6.2: daftar lewat OTP `echo` (label "Kode uji staging") → centang S&K → nama → unggah KTP + selfie dengan NIK → "menunggu review" di profil → admin membuka foto (akses diaudit) dan menyetujui → akun baru menerbitkan listing → keluar memanggil `/auth/logout`. Dilewati (exit 0) kalau `config.auth.otpProvider !== "echo"` |
| `account.mjs` | F6.6: dua perangkat satu akun → daftar sesi → "keluar dari semua perangkat lain" (perangkat yang dicabut dikembalikan ke `/masuk?next=`) → preferensi notifikasi tersimpan → ekspor JSON → tombol push di `/notifikasi` → akun demo tidak bisa dihapus → hapus akun dua langkah. Dilewati tanpa OTP `echo` |
| `mock-api.mjs` | Tiruan endpoint akun v2 di depan API demo (v1) untuk menguji dua suite di atas sebelum ada build integrasi. Lihat komentar di kepala berkas |
| `run.mjs` | Menjalankan semuanya berurutan, reset data demo sebelum/sesudah, keluar 1 kalau ada yang gagal |

```bash
cd e2e
npm install
npx playwright install chromium        # sekali, atau set CHROMIUM_PATH ke Chromium yang sudah ada
node run.mjs https://sewain-staging.hallojanu.me

# web lokal (port 3400–3403 diizinkan CORS staging) → API staging
API_URL=https://sewain-staging.hallojanu.me node run.mjs http://localhost:3400
```

`api.mjs` membaca `/api/v1/state` dengan token user yang relevan (raka/bayu/admin), jadi tetap lulus saat server v2
memakai `SNAPSHOT_SCOPE=scoped`.

Butuh `DEMO_MODE` di server (login demo + reset data). Suite ini mengubah data, jadi jangan arahkan ke produksi.
Untuk domain demo (`sewain.hallojanu.me`) hanya jalankan di luar jam presentasi. Data otomatis di-reset di akhir.

Mode snapshot terbatas tanpa backend v2: jalankan web dev dengan `NEXT_PUBLIC_SIMULATE_SCOPED=1` (lihat
`src/lib/scope.ts`), lalu arahkan `run.mjs` dan `routes-smoke.mjs` ke web itu.

Suite OTP butuh OTP baru per nomor; server membatasi kirim ulang 60 detik per nomor (juga sesaat setelah masuk di
perangkat lain), jadi `account.mjs` sengaja menunggu jeda itu. Tanpa build v2, jalankan dengan mock:

```bash
node mock-api.mjs 3403 https://sewain-staging.hallojanu.me &          # MOCK_DEMO_MODE=false = mode produksi (cookie)
NEXT_PUBLIC_API_URL=http://localhost:3403 pnpm exec next dev -p 3402   # dari akar repo
node auth-otp.mjs http://localhost:3402 http://localhost:3403
node account.mjs http://localhost:3402 http://localhost:3403
```

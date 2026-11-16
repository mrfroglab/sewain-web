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

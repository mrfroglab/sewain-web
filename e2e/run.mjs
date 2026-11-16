// Suite regresi demo Sewain. Menjalankan semua skenario berurutan terhadap satu URL, dengan reset data demo
// sebelum dan sesudah tiap skenario yang mengubah data. Keluar dengan kode 1 kalau ada yang gagal.
//
//   node e2e/run.mjs https://sewain-staging.hallojanu.me [outDir]
//   API_URL=https://sewain-staging.hallojanu.me node e2e/run.mjs http://localhost:3400   # web lokal → API staging
//
// Butuh DEMO_MODE di server (login demo + reset). Jangan arahkan ke produksi.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("pakai: node e2e/run.mjs <base-url> [outDir]");
  process.exit(2);
}
const out = process.argv[3] ?? path.join(process.env.TMPDIR ?? "/tmp", `sewain-e2e-${Date.now()}`);
const here = path.dirname(fileURLToPath(import.meta.url));
/** API origin; same as the web origin behind Caddy, different when a local web build points at staging. */
const api = (process.env.API_URL ?? base).replace(/\/$/, "");

async function resetDemo() {
  const login = await fetch(`${api}/api/v1/auth/demo-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "u-admin" }) }).then((r) => r.json());
  if (!login.ok) throw new Error(`demo-login gagal: ${JSON.stringify(login)}`);
  for (const name of ["resetClock", "resetDemo"]) {
    const r = await fetch(`${api}/api/v1/actions/${name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${login.token}` }, body: JSON.stringify({ args: [] }) }).then((x) => x.json());
    if (!r.ok) throw new Error(`${name} gagal: ${JSON.stringify(r)}`);
  }
}

const suites = [
  { name: "API kontrak + otorisasi", file: "api.mjs", args: [api] },
  { name: "Siklus sewa penuh (2 perangkat)", file: "rental-cycle.mjs", args: [base, path.join(out, "rental-cycle")], env: { SEPARATE: "1" } },
  { name: "Sengketa, admin, wizard, daftar, kadaluarsa", file: "dispute-admin-onboarding.mjs", args: [base, path.join(out, "dispute")], env: { SEPARATE: "1" } },
  { name: "Realtime antar perangkat", file: "realtime.mjs", args: [base] },
  { name: "Antrean aksi tahan reload/offline", file: "offline-queue.mjs", args: [base, api, path.join(out, "offline-queue")] },
  // Real OTP (v2, OTP_PROVIDER=echo). Both skip with exit 0 on servers without it.
  { name: "Daftar OTP → KYC → admin setujui → listing", file: "auth-otp.mjs", args: [base, api, path.join(out, "auth-otp")] },
  { name: "Pengaturan akun: sesi, preferensi, ekspor, hapus", file: "account.mjs", args: [base, api, path.join(out, "account")] },
];

let failed = 0;
for (const s of suites) {
  await resetDemo();
  console.log(`\n▶ ${s.name}`);
  const r = spawnSync(process.execPath, [path.join(here, s.file), ...s.args], { stdio: "inherit", env: { ...process.env, ...(s.env ?? {}) } });
  if (r.status !== 0) {
    failed++;
    console.log(`✗ ${s.name} (exit ${r.status})`);
  }
}
await resetDemo();
console.log(failed ? `\n${failed} suite gagal. Screenshot: ${out}` : "\nSemua suite lulus. Data demo sudah di-reset.");
process.exit(failed ? 1 : 0);

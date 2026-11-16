// Suite regresi demo Sewain. Menjalankan semua skenario berurutan terhadap satu URL, dengan reset data demo
// sebelum dan sesudah tiap skenario yang mengubah data. Keluar dengan kode 1 kalau ada yang gagal.
//
//   node e2e/run.mjs https://sewain-staging.hallojanu.me [outDir]
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

async function resetDemo() {
  const login = await fetch(`${base}/api/v1/auth/demo-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "u-admin" }) }).then((r) => r.json());
  if (!login.ok) throw new Error(`demo-login gagal: ${JSON.stringify(login)}`);
  for (const name of ["resetClock", "resetDemo"]) {
    const r = await fetch(`${base}/api/v1/actions/${name}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${login.token}` }, body: JSON.stringify({ args: [] }) }).then((x) => x.json());
    if (!r.ok) throw new Error(`${name} gagal: ${JSON.stringify(r)}`);
  }
}

const suites = [
  { name: "API kontrak + otorisasi", file: "api.mjs", args: [base] },
  { name: "Siklus sewa penuh (2 perangkat)", file: "rental-cycle.mjs", args: [base, path.join(out, "rental-cycle")], env: { SEPARATE: "1" } },
  { name: "Sengketa, admin, wizard, daftar, kadaluarsa", file: "dispute-admin-onboarding.mjs", args: [base, path.join(out, "dispute")], env: { SEPARATE: "1" } },
  { name: "Realtime antar perangkat", file: "realtime.mjs", args: [base] },
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

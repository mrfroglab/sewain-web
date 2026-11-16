// Antrean aksi tahan reload/offline (F6.9). Usage: node e2e/offline-queue.mjs <web-base> [api-base] [outDir]
//
// 1. Pesan chat → reload instan → pesan sampai ke server tepat sekali.
// 2. Setujui request → reload instan → status ACCEPTED, notifikasi "disetujui" tepat satu.
// 3. Offline (context.setOffline) → kirim pesan → indikator "aksi menunggu dikirim" → online → terkirim tepat sekali.
//
// api-base default = web-base (satu origin lewat Caddy). Untuk web lokal yang memakai API staging, isi api-base.
import { chromium } from "playwright";
import fs from "node:fs";

const base = (process.argv[2] ?? "").replace(/\/$/, "");
const api = (process.argv[3] ?? base).replace(/\/$/, "");
const out = process.argv[4] ?? `${process.env.TMPDIR ?? "/tmp"}/sewain-offline-queue`;
fs.mkdirSync(out, { recursive: true });

const j = async (path, opt = {}, token) => {
  const r = await fetch(api + path, { ...opt, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return r.json();
};
const login = async (id) => (await j("/api/v1/auth/demo-login", { method: "POST", body: JSON.stringify({ userId: id }) })).token;
const rakaToken = await login("u-raka");
// Read as a party (v2 scopes the snapshot per viewer).
const state = () => j("/api/v1/state", {}, rakaToken);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 15000) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) return v;
    await sleep(400);
  }
}

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), headless: true });
const errors = [];
const mk = async (userId, tag) => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  await p.addInitScript((id) => sessionStorage.setItem("sewain-session", JSON.stringify({ state: { userId: id }, version: 0 })), userId);
  p.on("pageerror", (e) => errors.push(`[${tag}] ${e.message}`));
  p.setDefaultTimeout(10000);
  return { c, p };
};

let n = 0;
let failed = 0;
const pages = [];
const step = async (name, fn) => {
  n++;
  try {
    await fn();
    console.log(`✓ ${n}. ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${n}. ${name}\n   ${String(e.message).split("\n")[0]}`);
    for (const [i, p] of pages.entries()) await p.screenshot({ path: `${out}/fail-${n}-${i}.png`, fullPage: true }).catch(() => {});
  }
};
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const countText = async (text) => (await state()).messages.filter((m) => m.text === text).length;

const { p: R } = await mk("u-raka", "raka");
const { c: bayuCtx, p: P } = await mk("u-bayu", "bayu");
pages.push(R, P);

await step("Pesan chat lalu reload instan → sampai ke server tepat sekali", async () => {
  await R.goto(base + "/sewaan/b-requested/chat", { waitUntil: "load" });
  await R.getByPlaceholder("Tulis pesan…").waitFor();
  await R.waitForTimeout(1500);
  const text = `Antrean reload ${Date.now().toString(36)}`;
  await R.getByPlaceholder("Tulis pesan…").fill(text);
  await R.getByRole("button", { name: "Kirim pesan" }).click();
  await R.reload({ waitUntil: "load" });
  const got = await until(async () => (await countText(text)) >= 1);
  assert(got, "pesan tidak pernah sampai ke server");
  await sleep(3000); // beri waktu kalau ada kiriman ganda
  const c = await countText(text);
  assert(c === 1, `pesan tersimpan ${c}× di server`);
  await R.getByText(text).first().waitFor();
  assert((await R.getByText(text).count()) === 1, "pesan tampil lebih dari sekali di layar");
});

await step("Setujui request lalu reload instan → ACCEPTED, notifikasi tepat satu", async () => {
  await P.goto(base + "/sewaan/b-requested", { waitUntil: "load" });
  await P.waitForTimeout(1500);
  await P.getByRole("button", { name: "Setujui" }).first().click();
  await P.getByRole("dialog").last().getByRole("button", { name: "Setujui request" }).click();
  await P.reload({ waitUntil: "load" });
  const ok = await until(async () => (await state()).bookings.find((b) => b.id === "b-requested")?.status === "ACCEPTED");
  assert(ok, "status booking tidak menjadi ACCEPTED");
  await sleep(3000);
  const st = await state();
  const notifs = st.notifications.filter((x) => x.userId === "u-raka" && /disetujui/i.test(x.title) && x.href === "/sewaan/b-requested");
  assert(notifs.length === 1, `notifikasi "disetujui" ada ${notifs.length}`);
  await P.getByText("Disetujui").first().waitFor();
});

await step("Offline → kirim pesan → indikator antrean → online → terkirim tepat sekali", async () => {
  await P.goto(base + "/sewaan/b-requested/chat", { waitUntil: "load" });
  await P.getByPlaceholder("Tulis pesan…").waitFor();
  await P.waitForTimeout(1500);
  await bayuCtx.setOffline(true);
  const text = `Antrean offline ${Date.now().toString(36)}`;
  await P.getByPlaceholder("Tulis pesan…").fill(text);
  await P.getByRole("button", { name: "Kirim pesan" }).click();
  await P.getByText(text).first().waitFor(); // tampil langsung (optimis)
  await P.getByTestId("pending-actions").waitFor({ timeout: 8000 });
  const label = await P.getByTestId("pending-actions").innerText();
  assert(/1 aksi menunggu dikirim/.test(label), `indikator: "${label}"`);
  await sleep(1500);
  assert((await countText(text)) === 0, "pesan sudah terkirim padahal offline");
  await bayuCtx.setOffline(false);
  const got = await until(async () => (await countText(text)) >= 1);
  assert(got, "pesan tidak terkirim setelah online");
  await sleep(3000);
  const c = await countText(text);
  assert(c === 1, `pesan tersimpan ${c}× di server`);
  await P.getByTestId("pending-actions").waitFor({ state: "detached", timeout: 8000 });
});

await step("Request diputus jaringan → tersimpan di localStorage → reload → terkirim tepat sekali", async () => {
  await R.goto(base + "/sewaan/b-requested/chat", { waitUntil: "load" });
  await R.getByPlaceholder("Tulis pesan…").waitFor();
  await R.waitForTimeout(1500);
  await R.route("**/api/v1/actions/**", (route) => route.abort("connectionreset"));
  const text = `Antrean putus ${Date.now().toString(36)}`;
  await R.getByPlaceholder("Tulis pesan…").fill(text);
  await R.getByRole("button", { name: "Kirim pesan" }).click();
  await R.waitForTimeout(1200);
  const stored = await R.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("sewain-outbox:")).flatMap((k) => JSON.parse(localStorage.getItem(k) ?? "[]")));
  assert(stored.length === 1 && stored[0].name === "sendMessage" && /^[0-9a-f-]{36}$/.test(stored[0].key), `isi antrean: ${JSON.stringify(stored).slice(0, 200)}`);
  assert((await countText(text)) === 0, "pesan sampai padahal request diputus");
  await R.unroute("**/api/v1/actions/**");
  await R.reload({ waitUntil: "load" });
  const got = await until(async () => (await countText(text)) >= 1);
  assert(got, "pesan tidak terkirim setelah reload");
  await sleep(3000);
  const c = await countText(text);
  assert(c === 1, `pesan tersimpan ${c}× di server`);
  const left = await R.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("sewain-outbox:")).length);
  assert(left === 0, "antrean belum kosong");
});

await step("Tidak ada error JavaScript di halaman", async () => {
  assert(errors.length === 0, errors.join(" | "));
});

await browser.close();
console.log(failed ? `\n${failed} langkah gagal. Screenshot: ${out}` : "\nAntrean aksi: semua lulus.");
process.exit(failed ? 1 : 0);

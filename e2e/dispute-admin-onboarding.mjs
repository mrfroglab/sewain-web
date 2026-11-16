// Disputes (L1 + admin L2), listing wizard, registration + eKYC skip, 24h expiry via demo clock.
import { chromium } from "playwright";
import fs from "node:fs";
import { randomPhone, serverConfig, signUpWithOtp } from "./otp-helpers.mjs";
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const errors = [];
const pages = [];
const mk = async (userId, tag) => {
  const c = process.env.SEPARATE ? await browser.newContext(ctx._options ?? { viewport: { width: 390, height: 844 }, permissions: ["camera"] }) : ctx;
  const p = await c.newPage();
  if (userId) await p.addInitScript((id) => sessionStorage.setItem("sewain-session", JSON.stringify({ state: { userId: id }, version: 0 })), userId);
  p.on("pageerror", (e) => errors.push(`[${tag}] ${e.message}`));
  p.on("console", (m) => m.type() === "error" && !m.text().includes("Failed to load resource") && errors.push(`[${tag} console] ${m.text().slice(0, 200)}`));
  p.setDefaultTimeout(8000);
  pages.push([tag, p]);
  return p;
};
const B = await mk("u-bayu", "bayu"), S = await mk("u-sinta", "sinta"), A = await mk("u-admin", "admin"), T = await mk("u-tini", "tini"), G = await mk(null, "guest");
let n = 0, failed = 0;
const step = async (name, fn) => {
  n++;
  try { await fn(); console.log(`✓ ${n}. ${name}`); }
  catch (e) { failed++; console.log(`✗ ${n}. ${name}\n   ${e.message.split("\n")[0]}`); for (const [tag, p] of pages) await p.screenshot({ path: `${out}/fail-${n}-${tag}.png`, fullPage: true }).catch(() => {}); }
};
const btn = (p, name) => p.getByRole("button", { name, exact: false });
const dialog = (p) => p.getByRole("dialog").last();
const go = async (p, path) => { await p.goto(base + path, { waitUntil: "load" }); await p.waitForTimeout(900); };

await step("Mas Bayu laporkan masalah pada b-active (L1)", async () => {
  await go(B, "/sewaan/b-active/sengketa");
  await B.getByRole("radio", { name: /Rusak/ }).first().click();
  await B.getByLabel("Ceritakan masalahnya").fill("Salah satu frame tenda patah saat dikembalikan, perlu diganti.");
  await btn(B, "Kirim laporan").click();
  await B.getByText(/Negosiasi/).first().waitFor();
});
await step("Mas Bayu ajukan solusi: potong deposit Rp50.000", async () => {
  await btn(B, "Ajukan solusi").click();
  const d = dialog(B);
  await d.getByRole("radio", { name: /deposit/i }).first().click();
  const amt = d.getByLabel(/Jumlah/);
  if (await amt.count()) await amt.fill("50000");
  await btn(d, "Kirim usulan").click();
  await B.waitForTimeout(600);
});
await step("Sinta menerima usulan → sengketa selesai (RESOLVED)", async () => {
  await go(S, "/sewaan/b-active/sengketa");
  await btn(S, "Terima").first().click();
  await btn(dialog(S), "Ya, terima").click();
  await S.waitForTimeout(600);
  await go(S, "/sewaan/b-active");
  await S.getByText("Sengketa selesai").first().waitFor();
});
await step("Admin menulis rekomendasi untuk d-lensa (L2)", async () => {
  await go(A, "/admin/sengketa/d-lensa");
  await btn(A, "Rekomendasi").first().click();
  const d = dialog(A);
  await d.getByLabel("Rekomendasi tertulis").fill("Goresan tidak terlihat di foto check-out. Penyewa mengganti biaya poles Rp200.000 dari deposit, sisa deposit dikembalikan.");
  const amt = d.getByLabel("Nominal");
  if (await amt.count()) await amt.fill("200000");
  await btn(d, "Kirim rekomendasi").click();
  await A.waitForTimeout(600);
});
await step("Admin menutup sengketa → booking RESOLVED", async () => {
  await btn(A, "Tutup kasus").first().click();
  const d = dialog(A);
  await d.getByLabel("Hasil akhir").fill("Kedua pihak menerima rekomendasi: Rp200.000 dipotong dari deposit.");
  await btn(d, "Tutup sengketa").click();
  await A.waitForTimeout(600);
  await go(A, "/sewaan/b-disputed");
  await A.getByText("Sengketa selesai").first().waitFor();
});
await step("Bu Tini membuat listing lewat wizard 5 langkah", async () => {
  await go(T, "/penyedia/barang/baru");
  await T.getByRole("button", { name: /Depan|Ambil foto/ }).first().click();
  await btn(T, "Foto contoh").click();
  await btn(T, /Selesai \(\d\)/).click();
  await T.waitForTimeout(1500);
  await T.getByLabel(/Tulis lecet/).fill("Ada penyok kecil di tutup, tidak bocor.");
  await btn(T, /^Lanjut/).click();
  await T.getByLabel("Judul").fill("Termos nasi besar 10 liter");
  await T.getByRole("radio", { name: /Alat Masak/ }).first().click();
  await T.getByLabel("Ceritakan barangnya").fill("Termos nasi stainless 10 liter, nasi tetap hangat sampai 6 jam. Cocok untuk acara dan KKN.");
  await btn(T, /^Lanjut/).click();
  await T.getByLabel("Harga per hari").fill("15000");
  await T.getByLabel(/Nilai barang saat ini/).fill("300000");
  await btn(T, /^Lanjut/).click();
  const saran = btn(T, /Pakai saran/);
  if (await saran.count()) await saran.first().click();
  await btn(T, /^Lanjut/).click();
  await btn(T, /^Pratinjau/).click();
  await btn(T, /^Terbitkan/).click();
  await T.waitForURL(/\/barang\/l-/, { timeout: 8000 });
  await T.getByText("Termos nasi besar 10 liter").first().waitFor();
});
// Real OTP servers (v2, provider "echo") have no fixed 123456: register through the OTP flow, then skip eKYC.
const cfg = await serverConfig(process.env.API_URL ?? base);
const realOtp = !!cfg && (!cfg.demoMode || (cfg.auth?.otpProvider && cfg.auth.otpProvider !== "demo"));
await step(realOtp ? "Tamu daftar: nomor HP → kode uji staging → S&K → nama → eKYC 'Lewati (demo)'" : "Tamu daftar: nomor HP → OTP 123456 → buat akun → eKYC 'Lewati (demo)'", async () => {
  if (realOtp) await signUpWithOtp(G, base, { phone: randomPhone(), name: "Putra Wijaya" });
  else {
    await go(G, "/masuk");
    await G.getByLabel("Nomor HP").fill("081299990011");
    await btn(G, "Kirim OTP").click();
    await G.getByLabel("Kode OTP 6 digit").fill("123456");
    await btn(G, "Verifikasi").click();
    await G.getByLabel("Nama lengkap").fill("Putra Wijaya");
    await btn(G, "Buat akun").click();
    await G.waitForURL(/\/verifikasi/, { timeout: 8000 });
  }
  await G.waitForTimeout(800);
  await btn(G, "Lewati (demo)").first().click();
  await G.getByText(/Terverifikasi/i).first().waitFor();
});
// v2 (SNAPSHOT_USERS=referenced): the new account has no listings or reviews, so other users' snapshots do not
// carry it. /u/<id> opened from a direct link must fetch GET /api/v1/users/{id}. Skipped while the API answers 404
// for every id (endpoint not deployed yet).
await step("Profil akun baru (tidak dirujuk) dibuka Mas Bayu lewat URL langsung", async () => {
  const newId = await G.evaluate(() => JSON.parse(sessionStorage.getItem("sewain-session") ?? "{}").state?.userId ?? null);
  if (!newId) throw new Error("id akun baru tidak terbaca dari sesi tab");
  const api = (process.env.API_URL ?? base).replace(/\/$/, "");
  const status = (id) => fetch(`${api}/api/v1/users/${encodeURIComponent(id)}`).then((r) => r.status, () => 0);
  const [known, fresh] = await Promise.all([status("u-bayu"), status(newId)]);
  if (known === 404 && fresh === 404) return console.log("   ↷ dilewati: server belum punya GET /api/v1/users/{id} (404 untuk semua id)");
  if (fresh !== 200) throw new Error(`GET /api/v1/users/${newId} → ${fresh}`);
  const asked = B.waitForResponse((r) => r.url().includes(`/api/v1/users/${newId}`), { timeout: 10000 }).then(() => true, () => false);
  await go(B, `/u/${newId}`);
  await B.getByRole("heading", { level: 1, name: "Putra" }).waitFor({ timeout: 10000 });
  await B.getByRole("heading", { name: /Barang yang disewakan/ }).waitFor();
  if (await B.getByText("Pengguna tidak ditemukan").count()) throw new Error("halaman 'Pengguna tidak ditemukan' tampil");
  console.log(`   profil ${newId} ${(await asked) ? "diambil dari GET /api/v1/users/{id}" : "sudah ada di snapshot"}`);
  await go(B, "/u/u-tidak-ada-sama-sekali");
  await B.getByText("Pengguna tidak ditemukan").waitFor({ timeout: 10000 });
});
await step("Percepat jam +1 hari lewat panel Demo → request b-requested kadaluarsa", async () => {
  await go(B, "/sewaan/b-requested");
  await B.getByRole("button", { name: /Mode demo/ }).click();
  await btn(dialog(B), "+1 hari").click();
  await B.keyboard.press("Escape");
  await go(B, "/sewaan/b-requested");
  await B.getByText("Kadaluarsa").first().waitFor();
});
await browser.close();
console.log(failed ? `${failed} step(s) failed` : "all steps passed");
console.log(errors.length ? "JS errors:\n" + errors.join("\n") : "no JS errors");
process.exit(failed || errors.length ? 1 : 0);

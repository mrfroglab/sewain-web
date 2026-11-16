// F6.1 + F6.2 end to end on a real-OTP server (provider "echo"): sign up with OTP → consent → name → upload KTP +
// selfie (sample images) → "menunggu review" → admin opens the photos (audited) and approves → the new account
// publishes a listing. Skips cleanly when the server is not v2 with OTP_PROVIDER=echo.
//
//   node e2e/auth-otp.mjs <web-base> <api-base> [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
import { harness, pickSamplePhoto, randomPhone, requireEcho, signUpWithOtp } from "./otp-helpers.mjs";

const [base, apiArg, outArg] = process.argv.slice(2);
const api = (apiArg ?? base).replace(/\/$/, "");
const out = outArg ?? `/tmp/sewain-auth-otp-${Date.now()}`;
fs.mkdirSync(out, { recursive: true });
const cfg = await requireEcho(api, "auth-otp");

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), headless: true });
const { mk, step, finish } = harness(browser, out);
const U = await mk("baru");
const btn = (p, name) => p.getByRole("button", { name, exact: false });
const phone = randomPhone();
const name = `Uji Otp ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
// Valid-looking NIK (Sleman 3404, born 12-03-04), random serial so reruns do not collide.
const nik = `340401120304${String(Math.floor(Math.random() * 9000) + 1000)}`;

await step("Daftar: nomor HP → kode uji staging → centang S&K → nama", async () => {
  await signUpWithOtp(U, base, { phone, name });
  await U.getByRole("heading", { name: "Verifikasi identitas" }).waitFor();
});

await step("Unggah KTP + selfie (foto contoh) dengan NIK, progres, lalu 'menunggu review'", async () => {
  await U.getByText(/dihapus otomatis setelah verifikasi diputuskan/).first().waitFor();
  if (await btn(U, "Lewati (demo)").count() !== (cfg.demoMode ? 1 : 0)) throw new Error("'Lewati (demo)' harus ada persis di mode demo");
  await btn(U, "Mulai verifikasi").click();
  await btn(U, "Buka kamera").click();
  await pickSamplePhoto(U);
  await U.getByLabel("Nama sesuai KTP").waitFor();
  await U.getByLabel("NIK").fill("1234");
  await U.getByText(/NIK harus 16 digit/).waitFor();
  await U.getByLabel("NIK").fill(nik);
  await btn(U, /^Simpan$/).click();
  await U.getByText(`${nik.slice(0, 4)} •••• •••• ${nik.slice(-4)}`).waitFor();
  await btn(U, "Lanjut ke selfie").click();
  await btn(U, "Buka kamera depan").click();
  await pickSamplePhoto(U);
  await U.getByRole("heading", { name: /Terkirim, menunggu review/ }).waitFor({ timeout: 20000 });
  await U.getByText(`${nik.slice(0, 4)}********${nik.slice(-4)}`).waitFor();
});

await step("Profil menampilkan 'Menunggu review admin'", async () => {
  await U.goto(`${base}/profil`, { waitUntil: "load" });
  await U.getByText("Menunggu review admin").waitFor();
});

let A;
await step("Admin membuka foto KTP/selfie (dicatat audit) lalu menyetujui", async () => {
  A = await mk("admin", { userId: "u-admin" });
  await A.goto(`${base}/admin/verifikasi`, { waitUntil: "load" });
  const card = A.locator("article").filter({ hasText: name.toUpperCase() }).first();
  await card.waitFor({ timeout: 15000 });
  await card.getByText(/akses dicatat|dicatat di log audit/).waitFor();
  await card.getByRole("button", { name: "Tampilkan foto" }).click();
  await card.getByRole("img", { name: "Foto KTP" }).waitFor();
  await card.getByRole("img", { name: "Selfie memegang KTP" }).waitFor();
  const audit = await fetch(`${api}/__mock/audit`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (audit && audit.audit.filter((a) => a.action === "kyc.file.read").length < 2) throw new Error("akses berkas tidak tercatat di audit mock");
  await card.getByRole("button", { name: "Setujui" }).click();
  await A.getByText(/sekarang terverifikasi/).first().waitFor();
});

await step("Akun baru terverifikasi lalu menerbitkan listing lewat wizard", async () => {
  await U.goto(`${base}/profil`, { waitUntil: "load" });
  await U.getByText("Terverifikasi").first().waitFor({ timeout: 15000 });
  await U.goto(`${base}/penyedia/barang/baru`, { waitUntil: "load" });
  await U.waitForTimeout(800);
  await U.getByRole("button", { name: /Depan|Ambil foto/ }).first().click();
  await pickSamplePhoto(U);
  await btn(U, /Selesai \(\d\)/).click();
  await U.waitForTimeout(1500);
  await U.getByLabel(/Tulis lecet/).fill("Normal, ada goresan halus di sisi kiri.");
  await btn(U, /^Lanjut/).click();
  const title = `Termos uji OTP ${phone.slice(-4)}`;
  await U.getByLabel("Judul").fill(title);
  await U.getByRole("radio", { name: /Alat Masak/ }).first().click();
  await U.getByLabel("Ceritakan barangnya").fill("Termos nasi stainless 10 liter, nasi tetap hangat sampai 6 jam. Cocok untuk acara dan KKN.");
  await btn(U, /^Lanjut/).click();
  await U.getByLabel("Harga per hari").fill("25000");
  await U.getByLabel(/Nilai barang saat ini/).fill("400000");
  await btn(U, /^Lanjut/).click();
  const saran = btn(U, /Pakai saran/);
  if (await saran.count()) await saran.first().click();
  await btn(U, /^Lanjut/).click();
  await btn(U, /^Pratinjau/).click();
  await btn(U, /^Terbitkan/).click();
  await U.waitForURL(/\/barang\/l-/, { timeout: 10000 });
  await U.getByText(title).first().waitFor();
});

await step("Keluar memanggil /auth/logout dan kembali jadi tamu", async () => {
  await U.goto(`${base}/profil`, { waitUntil: "load" });
  const logout = U.waitForRequest((r) => r.url().endsWith("/api/v1/auth/logout") && r.method() === "POST").then(() => null, (e) => e);
  await btn(U, /^Keluar$/).click();
  const e = await logout;
  if (e) throw new Error("POST /api/v1/auth/logout tidak dipanggil");
  await U.goto(`${base}/profil`, { waitUntil: "load" });
  await U.getByText("Masuk dulu, yuk").waitFor();
});

await finish();

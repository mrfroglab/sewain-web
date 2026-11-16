// F6.6 account settings end to end on a real-OTP server (provider "echo"): two devices on one account, list and
// revoke sessions (the revoked device is sent back to /masuk?next=), notification preferences survive a reload,
// JSON export downloads, push toggle on /notifikasi, two-step account deletion. Skips cleanly without v2 + echo.
//
//   node e2e/account.mjs <web-base> <api-base> [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
import { harness, randomPhone, requestCode, requireEcho, signInWithOtp, signUpWithOtp } from "./otp-helpers.mjs";

const [base, apiArg, outArg] = process.argv.slice(2);
const api = (apiArg ?? base).replace(/\/$/, "");
const out = outArg ?? `/tmp/sewain-account-${Date.now()}`;
fs.mkdirSync(out, { recursive: true });
await requireEcho(api, "account");

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), headless: true });
const { mk, step, finish } = harness(browser, out);
const A = await mk("hp-1");
const B = await mk("hp-2", { viewport: { width: 360, height: 780 } });
const btn = (p, name) => p.getByRole("button", { name, exact: false });
const phone = randomPhone();
const name = `Uji Akun ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const settings = async (p) => {
  await p.goto(`${base}/profil/pengaturan`, { waitUntil: "load" });
  await p.getByRole("heading", { name: "Pengaturan akun" }).waitFor();
};
const noHScroll = async (p) => {
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 1) throw new Error(`scroll horizontal ${over}px`);
};

await step("Daftar via OTP di HP 1, lalu masuk dengan nomor yang sama di HP 2", async () => {
  await signUpWithOtp(A, base, { phone, name });
  await A.waitForTimeout(1500); // profile (updateUser) reaches the server
  await signInWithOtp(B, base, phone);
});

await step("Pengaturan dari profil → sesi aktif berisi 2 perangkat", async () => {
  await A.goto(`${base}/profil`, { waitUntil: "load" });
  await A.getByRole("link", { name: /Pengaturan akun/ }).click();
  await A.getByRole("heading", { name: "Pengaturan akun" }).waitFor();
  const list = A.getByTestId("sessions");
  await list.getByText("Perangkat ini").waitFor();
  if ((await list.locator("li").count()) !== 2) throw new Error(`sesi: ${await list.locator("li").count()}`);
  await noHScroll(A);
});

await step("Keluar dari semua perangkat lain → tinggal 1, HP 2 dikembalikan ke /masuk?next=", async () => {
  await btn(A, "Keluar dari semua perangkat lain").click();
  await A.getByText(/1 perangkat lain sudah dikeluarkan/).waitFor();
  await A.waitForFunction(() => document.querySelectorAll('[data-testid="sessions"] li').length === 1);
  await B.goto(`${base}/sewaan`, { waitUntil: "load" });
  await B.waitForURL(/\/masuk\?next=%2Fsewaan/, { timeout: 15000 });
});

await step("Preferensi notifikasi tersimpan di server (chat lewat push, jam tenang)", async () => {
  await settings(A);
  const prefs = A.getByTestId("notif-prefs");
  await prefs.waitFor();
  // Channels the server does not offer (e.g. email on staging) are shown disabled; use push, which is always offered.
  const chatPush = prefs.getByRole("switch", { name: "Chat lewat Push" });
  if (await chatPush.isDisabled()) throw new Error("push tidak tersedia di server");
  const before = await chatPush.getAttribute("aria-checked");
  await chatPush.click();
  await A.waitForFunction(() => document.querySelector('[data-testid="notif-prefs"]')?.getAttribute("aria-busy") === "false");
  const quiet = A.getByRole("switch", { name: /Jam tenang/ });
  const quietBefore = await quiet.getAttribute("aria-checked");
  await quiet.click();
  await A.waitForTimeout(1000);
  await settings(A);
  await A.getByTestId("notif-prefs").waitFor();
  const after = await A.getByTestId("notif-prefs").getByRole("switch", { name: "Chat lewat Push" }).getAttribute("aria-checked");
  if (after === before) throw new Error("chat lewat push tidak tersimpan");
  if ((await A.getByRole("switch", { name: /Jam tenang/ }).getAttribute("aria-checked")) === quietBefore) throw new Error("jam tenang tidak tersimpan");
  await noHScroll(A);
});

await step("Ekspor data mengunduh JSON milik akun ini", async () => {
  const dl = A.waitForEvent("download");
  await btn(A, "Unduh data saya").click();
  const file = await dl;
  const data = JSON.parse(fs.readFileSync(await file.path(), "utf8"));
  if (!/^sewain-data-u-.+\.json$/.test(file.suggestedFilename())) throw new Error(`nama berkas ${file.suggestedFilename()}`);
  const me = data.profile ?? data.export?.profile;
  if (!me || !String(file.suggestedFilename()).includes(me.id)) throw new Error(`isi ekspor tidak memuat akun ini: ${Object.keys(data).join(",")}`);
});

await step("Notifikasi: tombol push di perangkat ini + tautan ke pengaturan", async () => {
  await A.goto(`${base}/notifikasi`, { waitUntil: "load" });
  await A.getByTestId("push-toggle").getByText("Notifikasi push di perangkat ini").waitFor();
  await A.getByRole("link", { name: /Atur jenis notifikasi/ }).waitFor();
});

await step("Akun demo tidak bisa dihapus", async () => {
  const R = await mk("raka", { userId: "u-raka" });
  await settings(R);
  await R.getByText("Akun demo tidak bisa dihapus").waitFor();
});

await step("Hapus akun dua langkah → keluar, nomor itu jadi nomor baru lagi", async () => {
  await settings(A);
  await btn(A, "Hapus akun saya").click();
  await btn(A.getByRole("dialog"), "Lanjut").click();
  const confirm = btn(A.getByRole("dialog"), "Hapus permanen");
  if (!(await confirm.isDisabled())) throw new Error("tombol hapus harus mati sebelum mengetik HAPUS");
  await A.getByLabel("Ketik HAPUS").fill("hapus");
  await confirm.click();
  await A.getByText(/Akunmu sudah dihapus/).waitFor();
  await A.waitForURL((u) => u.pathname === "/", { timeout: 10000 });
  await A.goto(`${base}/masuk`, { waitUntil: "load" });
  await A.getByLabel("Nomor HP").fill(phone);
  await requestCode(A);
  await A.getByTestId("staging-otp").getByRole("button", { name: "Isi otomatis" }).click();
  await A.getByRole("heading", { name: "Buat akun baru" }).waitFor();
});

await finish();

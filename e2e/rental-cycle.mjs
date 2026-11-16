// Full rental cycle, two tabs: Raka (penyewa) + Mas Bayu (penyedia). Usage: node e2e.mjs <base> <outDir>
import { chromium } from "playwright";
import fs from "node:fs";
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), headless: true, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["camera"] });
const errors = [];
const mk = async (userId, tag) => {
  const c = process.env.SEPARATE ? await browser.newContext(ctx._options ?? { viewport: { width: 390, height: 844 }, permissions: ["camera"] }) : ctx;
  const p = await c.newPage();
  await p.addInitScript((id) => sessionStorage.setItem("sewain-session", JSON.stringify({ state: { userId: id }, version: 0 })), userId);
  p.on("pageerror", (e) => errors.push(`[${tag}] ${e.message}`));
  p.on("console", (m) => m.type() === "error" && !m.text().includes("Failed to load resource") && errors.push(`[${tag} console] ${m.text().slice(0, 200)}`));
  p.setDefaultTimeout(8000);
  return p;
};
const R = await mk("u-raka", "raka");
const P = await mk("u-bayu", "bayu");
let n = 0;
const step = async (name, fn) => {
  n++;
  try { await fn(); console.log(`✓ ${n}. ${name}`); }
  catch (e) { console.log(`✗ ${n}. ${name}\n   ${e.message.split("\n")[0]}`); await R.screenshot({ path: `${out}/fail-${n}-raka.png`, fullPage: true }); await P.screenshot({ path: `${out}/fail-${n}-bayu.png`, fullPage: true }); await browser.close(); console.log("errors:", errors); process.exit(1); }
};
const btn = (p, name) => p.getByRole("button", { name, exact: false });
const dialog = (p) => p.getByRole("dialog").last();
const iso = (d) => { const t = new Date(Date.now() + d * 864e5); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
let id = "";
const go = async (p, path) => { await p.goto(base + path, { waitUntil: "load" }); await p.waitForTimeout(900); };

await step("Raka membuka form ajukan sewa", async () => go(R, "/barang/l-kompor-lapangan/ajukan"));
await step("Isi tanggal, serah terima, jaminan, setujui kesepakatan, kirim", async () => {
  const dates = R.locator('input[type="date"]');
  await dates.nth(0).fill(iso(1));
  await dates.nth(1).fill(iso(3));
  for (const group of await R.getByRole("radiogroup").all()) {
    if (!(await group.locator('[aria-checked="true"]').count())) await group.getByRole("radio").first().click().catch(() => {});
  }
  const radios = R.locator('[role="radio"][aria-checked="false"]');
  if (!(await R.locator('[role="radio"][aria-checked="true"]').count())) await radios.first().click();
  await R.locator("#setuju-kesepakatan").check();
  await btn(R, "Kirim request sewa").click();
  await R.waitForURL(/\/sewaan\/b-/, { timeout: 8000 });
  id = R.url().split("/sewaan/")[1].split(/[/?#]/)[0];
  console.log("   booking", id);
});
await step("Mas Bayu menyetujui request", async () => {
  await go(P, `/sewaan/${id}`);
  await btn(P, "Setujui").first().click();
  await btn(dialog(P), "Setujui request").click();
  await P.getByText("Disetujui").first().waitFor();
});
await step("Raka bayar via Sewain (simulasi)", async () => {
  await go(R, `/sewaan/${id}`);
  await btn(R, "Bayar via Sewain").click();
  await dialog(R).getByRole("button", { name: /^Bayar/ }).last().click();
  await R.getByText(/lunas/i).first().waitFor();
});
await step("Mas Bayu foto serah terima: 3 foto kamera asli (fake device) + foto jaminan contoh", async () => {
  await go(P, `/sewaan/${id}/serah-terima`);
  await P.getByRole("button", { name: /Depan/ }).first().click();
  const shutter = P.getByRole("button", { name: "Ambil foto", exact: true });
  await shutter.waitFor();
  await P.waitForFunction(() => !document.querySelector('button[aria-label="Ambil foto"]')?.hasAttribute("disabled"), null, { timeout: 8000 });
  for (let i = 1; i <= 3; i++) {
    await shutter.click();
    try { await btn(P, `Selesai (${i})`).waitFor({ timeout: 4000 }); }
    catch (e) { const t = await P.getByRole("button", { name: /Selesai/ }).textContent().catch(() => "?"); const dis = await shutter.isDisabled(); console.log(`   shutter click ${i}: button now "${t}", shutter disabled=${dis}`); throw e; }
    await P.waitForTimeout(250);
  }
  await btn(P, "Selesai (3)").click();
  await P.waitForTimeout(1500);
  await P.getByRole("button", { name: /Ambil foto|Foto jaminan|Jaminan/ }).first().click();
  await btn(P, "Foto contoh").click();
  await btn(P, /Selesai \(\d\)/).click();
  await P.waitForTimeout(1200);
  await btn(P, "Kirim foto serah terima").click();
  await P.getByText(/Setuju kondisi|menunggu/i).first().waitFor();
});
await step("Raka cek foto & tekan Setuju kondisi → ACTIVE", async () => {
  await go(R, `/sewaan/${id}/serah-terima`);
  await btn(R, "Setuju kondisi").click();
  await R.waitForTimeout(800);
  await go(R, `/sewaan/${id}`);
  await R.getByText("Sedang disewa").first().waitFor();
});
await step("Mas Bayu catat pengembalian (3 foto contoh, kondisi sesuai)", async () => {
  await go(P, `/sewaan/${id}/pengembalian`);
  await P.getByRole("button", { name: /Depan|Ambil foto/ }).first().click();
  await btn(P, "Foto contoh").click();
  await btn(P, /Selesai \(\d\)/).click();
  await P.waitForTimeout(1500);
  await P.getByRole("radio", { name: /Kondisi sesuai/ }).first().click();
  await btn(P, "Simpan pengembalian").click();
  await P.waitForTimeout(800);
  await go(P, `/sewaan/${id}`);
  await P.getByText("Sudah kembali").first().waitFor();
});
await step("Mas Bayu kembalikan jaminan", async () => {
  await btn(P, "Jaminan sudah saya kembalikan").click();
  await btn(dialog(P), "Ya, sudah").click();
  await P.waitForTimeout(600);
});
await step("Raka konfirmasi jaminan diterima → COMPLETED", async () => {
  await go(R, `/sewaan/${id}`);
  await btn(R, "Jaminan sudah saya terima").click();
  await btn(dialog(R), "Ya, sudah terima").click();
  await R.getByText("Selesai").first().waitFor();
});
await step("Rating dua arah (tampil setelah keduanya mengisi)", async () => {
  for (const p of [R, P]) {
    await go(p, `/sewaan/${id}`);
    await p.getByRole("radio", { name: "5 bintang" }).first().click();
    const ta = p.locator("textarea").first();
    if (await ta.count()) await ta.fill("Lancar, barang sesuai dan komunikasi enak. Recommended!");
    await btn(p, "Kirim rating").click();
    await p.waitForTimeout(700);
  }
  await go(R, `/sewaan/${id}`);
  await R.getByText("Lancar, barang sesuai").first().waitFor();
});
await step("Chat per booking tersinkron antar tab", async () => {
  await go(R, `/sewaan/${id}/chat`);
  const input = R.getByPlaceholder("Tulis pesan…");
  await input.fill("Makasih Mas, kompornya mantap!");
  await R.getByRole("button", { name: "Kirim pesan" }).click();
  await R.getByText("Makasih Mas, kompornya mantap!").first().waitFor();
  await go(P, `/sewaan/${id}/chat`);
  await P.getByText("Makasih Mas, kompornya mantap!").first().waitFor();
});
await R.screenshot({ path: `${out}/final-raka.png`, fullPage: true });
await browser.close();
console.log(errors.length ? "JS errors:\n" + errors.join("\n") : "no JS errors");
process.exit(errors.length ? 1 : 0);

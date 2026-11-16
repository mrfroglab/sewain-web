import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const B = process.argv[2] ?? "http://localhost:8088";
const j = async (path, opt = {}, token) => {
  const r = await fetch(B + path, { ...opt, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opt.headers ?? {}) } });
  return { status: r.status, body: await r.json() };
};
const login = async (id) => (await j("/api/v1/auth/demo-login", { method: "POST", body: JSON.stringify({ userId: id }) })).body.token;
const act = (token, name, args, id) => j(`/api/v1/actions/${name}`, { method: "POST", body: JSON.stringify({ args, id }) }, token);
let pass = 0, failN = 0;
const check = (name, cond, extra = "") => { cond ? pass++ : failN++; console.log(`${cond ? "✓" : "✗"} ${name} ${cond ? "" : extra}`); };

const events = [];
const ws = new WebSocket(B.replace("http", "ws") + "/api/v1/events");
ws.onmessage = (m) => events.push(JSON.parse(m.data));
await new Promise((r) => (ws.onopen = r));

const raka = await login("u-raka"), bayu = await login("u-bayu"), admin = await login("u-admin");
check("demo-login returns tokens", raka && bayu && admin);
const forged = await act(raka, "acceptBooking", ["u-bayu", "b-requested"]);
check("actor must match session (403)", forged.status === 403, JSON.stringify(forged));
const iso = (d) => new Date(Date.now() + d * 864e5).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
const st = (await j("/api/v1/state")).body;
const listing = st.listings.find((l) => l.id === "l-kompor-lapangan");
const created = await act(raka, "createBooking", ["u-raka", { listingId: listing.id, startDate: iso(1), endDate: iso(3), handover: "jemput", collateralOptionId: listing.collateralOptions[0].id }], "b-testapi12345");
check("createBooking keeps client id", created.body.ok && created.body.value === "b-testapi12345", JSON.stringify(created.body));
const dup = await act(raka, "createBooking", ["u-raka", { listingId: "l-laptop", startDate: iso(-2), endDate: iso(1), handover: "cod", collateralOptionId: "x" }]);
check("rule violation → ok:false with message", dup.body.ok === false && /lewat|jaminan/i.test(dup.body.error), JSON.stringify(dup.body));
const acc = await act(bayu, "acceptBooking", ["u-bayu", "b-testapi12345"]);
check("provider accepts", acc.body.ok, JSON.stringify(acc.body));
const st2 = (await j("/api/v1/state")).body;
const b = st2.bookings.find((x) => x.id === "b-testapi12345");
check("state shows ACCEPTED + meeting point + agreement hash", b?.status === "ACCEPTED" && b.meetingPointDetail && /^[0-9a-f]{64}$/.test(b.agreement.hash), JSON.stringify(b?.status));
check("system messages + notification created", st2.messages.some((m) => m.bookingId === b.id && m.senderId === "system") && st2.notifications.some((n) => n.userId === "u-raka" && /disetujui/i.test(n.title)));

// Photo evidence upload: server computes SHA-256 + timestamp
const img = readFileSync(new URL("../public/img/listings/tripod-1.webp", import.meta.url));
const fd = new FormData();
fd.append("file", new Blob([img], { type: "image/webp" }), "x.webp");
fd.append("stage", "checkout"); fd.append("bookingId", b.id); fd.append("source", "kamera"); fd.append("angle", "Depan");
const up = await (await fetch(B + "/api/v1/photos", { method: "POST", body: fd, headers: { Authorization: `Bearer ${bayu}` } })).json();
const expected = createHash("sha256").update(img).digest("hex");
check("photo upload: server-side sha256 matches bytes", up.ok && up.photo.sha256 === expected, JSON.stringify(up).slice(0, 200));
const served = await fetch(B + up.photo.src);
check("photo served with X-Content-SHA256", served.status === 200 && served.headers.get("x-content-sha256") === expected);

// PostGIS two-way radius search
const s1 = (await j(`/api/v1/listings/search?lat=-7.7713&lng=110.3776&radiusKm=3`)).body;
const s2 = (await j(`/api/v1/listings/search?lat=-7.7596&lng=110.3727&radiusKm=3`)).body;
check(`PostGIS search from UGM 3km: ${s1.hits?.length} hits, hidden ${s1.hiddenByProviderReach}`, s1.ok && s1.hits.length > 30);
check(`two-way rule from Pogung hides Bu Tini (radius 1,5km): hidden ${s2.hiddenByProviderReach}`, s2.ok && s2.hiddenByProviderReach >= 5 && !s2.hits.some((h) => h.id === "l-panci-besar"));
const s3 = (await j(`/api/v1/listings/search?lat=-7.7713&lng=110.3776&radiusKm=5&kategori=kamera&jaminan=cukup-identitas`)).body;
check(`filters (kategori kamera + cukup identitas): ${s3.hits?.length} hits`, s3.ok && s3.hits.length >= 1);

// Admin-only + demo clock
const notAdmin = await act(raka, "updateCommission", ["u-raka", { active: true }]);
check("non-admin cannot change commission", notAdmin.body.ok === false);
const com = await act(admin, "updateCommission", ["u-admin", { active: true, percent: 10 }]);
const st3 = (await j("/api/v1/state")).body;
check("admin changes commission + audit log", com.body.ok && st3.commission.active === true && st3.audit[0].action === "komisi.ubah");
await act(admin, "updateCommission", ["u-admin", { active: false }]);
const clk = await act(bayu, "advanceClock", [25 * 3600000]);
const st4 = (await j("/api/v1/state")).body;
check("advanceClock +25h → b-requested EXPIRED (job berkala)", clk.body.ok && st4.bookings.find((x) => x.id === "b-requested").status === "EXPIRED");
await act(bayu, "resetClock", []);
await new Promise((r) => setTimeout(r, 400));
check(`websocket received change events (${events.length})`, events.filter((e) => e.type === "changed").length >= 5);
ws.close();
console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);

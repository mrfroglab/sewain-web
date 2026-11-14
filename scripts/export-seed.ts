// Exports the demo seed to JSON for sewain-api (make seed-export in sewain-api). Run with TZ=Asia/Jakarta.
import { writeFileSync } from "node:fs";
import { createSeed } from "../src/lib/data/seed";
// Fixed base: 2026-01-05 12:00 WIB. The Go server shifts every timestamp/date to "now" when it seeds.
const BASE = Date.UTC(2026, 0, 5, 5, 0, 0);
const s = createSeed(BASE);
const { search: _s, ...data } = s as any;
writeFileSync(process.argv[2], JSON.stringify({ base: BASE, data }, null, 0));
console.log("users", s.users.length, "listings", s.listings.length, "bookings", s.bookings.length, "photos", s.photos.length, "messages", s.messages.length);

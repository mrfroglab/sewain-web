// Bridges Listing.photos (srcs: "/img/..." or "idb:<id>") and the PhotoCaptureField (PhotoRecord ids).

import { sha256Text } from "@/lib/sha256";
import type { CategoryId, ID, Listing, PhotoRecord } from "@/lib/types";
import { PHOTO_ANGLES } from "./draft";

const DEFAULT_DEMO = [1, 2, 3].map((n) => `/img/listings/tenda-dome-4p-${n}.webp`);

/**
 * "Foto contoh" for the camera: the 3 photos of a similar seeded listing in the chosen category,
 * else in the category the provider usually lists, else a tent.
 */
export function demoPhotosFor(category: CategoryId | null, listings: Listing[], userId: ID): string[] {
  const seeded = (l: Listing) => l.photos.length >= 3 && l.photos.every((p) => p.startsWith("/img/listings/"));
  const cat = category ?? listings.find((l) => l.ownerId === userId)?.category ?? null;
  if (!cat) return DEFAULT_DEMO;
  const pool = listings.filter((l) => l.category === cat && seeded(l));
  const pick = pool.find((l) => l.ownerId !== userId) ?? pool[pool.length - 1];
  return pick ? pick.photos.slice(0, 3) : DEFAULT_DEMO;
}

/**
 * Edit mode: every listing photo needs a PhotoRecord so it can be shown/removed in the capture field.
 * Seeded photos never had one. Pure: returns the ids plus the records still to register
 * (register them with `addPhotos` from an effect).
 */
export function planReferencePhotos(listing: Listing, photos: PhotoRecord[]): { ids: ID[]; missing: PhotoRecord[] } {
  const created: PhotoRecord[] = [];
  const ids = listing.photos.map((src, i) => {
    if (src.startsWith("idb:")) {
      const id = src.slice(4);
      if (!photos.some((p) => p.id === id) && !created.some((p) => p.id === id)) {
        created.push({ id, stage: "referensi", uploaderId: listing.ownerId, src, sha256: sha256Text(src), serverTimestamp: listing.createdAt, source: "kamera", angle: PHOTO_ANGLES[i] });
      }
      return id;
    }
    const existing = photos.find((p) => p.src === src && p.stage === "referensi") ?? created.find((p) => p.src === src);
    if (existing) return existing.id;
    const rec: PhotoRecord = {
      id: `p-ref-${sha256Text(`${listing.id}|${src}`).slice(0, 12)}`,
      stage: "referensi",
      uploaderId: listing.ownerId,
      src,
      sha256: sha256Text(src),
      serverTimestamp: listing.createdAt,
      source: "kamera",
      angle: PHOTO_ANGLES[i],
    };
    created.push(rec);
    return rec.id;
  });
  return { ids, missing: created };
}

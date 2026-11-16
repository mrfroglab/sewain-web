"use client";

// Photo evidence (PRD 10). Captured photos are compressed on the client (FR-P7), hashed with SHA-256,
// stamped with the (demo) server clock (FR-P2/P3) and stored in IndexedDB. They can be added, never replaced (FR-P4).
// In the real product the hash and timestamp are produced by the Go API on upload.

import { createStore, get as idbGet, set as idbSet } from "idb-keyval";
import { useEffect, useState } from "react";
import { isOnline, registerDemoPhoto, resolveMediaUrl, uploadPhoto } from "./api";
import { sha256Blob } from "./sha256";
import { refreshSnapshot, useAppStore } from "./store";
import type { ID, PhotoRecord, PhotoSource, PhotoStage } from "./types";

let store: ReturnType<typeof createStore> | null = null;
const db = () => (store ??= createStore("sewain-photos", "blobs"));

async function decode(input: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(input);
  } catch {
    const url = URL.createObjectURL(input);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** Longest side 1600 px by default, WebP ~80% (falls back to JPEG where WebP encoding is unsupported). */
export async function compressImage(input: Blob, maxSide = 1600, quality = 0.8): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await decode(input);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
  const blob = (await toBlob("image/webp")) ?? (await toBlob("image/jpeg"));
  if (!blob) throw new Error("Gagal memproses foto.");
  return { blob, width, height };
}

const newId = () => `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export interface SavePhotoInput {
  blob: Blob;
  stage: PhotoStage;
  uploaderId: ID;
  source: PhotoSource;
  bookingId?: ID;
  angle?: string;
  /** default true; KTP/selfie in the eKYC simulation are compressed harder */
  maxSide?: number;
  /** server upload progress 0..1 (F6.4) */
  onProgress?: (fraction: number) => void;
}

/** KTP & selfie never leave the browser in the prototype (PRD §7.2: foto eKYC simulasi tidak disimpan di server). */
const LOCAL_ONLY_STAGES: PhotoStage[] = ["ktp", "selfie"];

/**
 * Compress → (server mode) upload: sewain-api computes SHA-256 over the received bytes and stamps the server time
 * (FR-P2/P3/P7) → register metadata. Offline: hash in the browser and keep the blob in IndexedDB.
 */
export async function savePhoto(input: SavePhotoInput): Promise<PhotoRecord> {
  const { blob, width, height } = await compressImage(input.blob, input.maxSide ?? 1600);
  if (isOnline() && !LOCAL_ONLY_STAGES.includes(input.stage)) {
    const record = await uploadPhoto<PhotoRecord>(blob, { stage: input.stage, bookingId: input.bookingId, angle: input.angle, source: input.source, width, height }, input.onProgress);
    useAppStore.getState().addPhotos([record]);
    return record;
  }
  const id = newId();
  const sha256 = await sha256Blob(blob);
  await idbSet(id, blob, db());
  const record: PhotoRecord = {
    id,
    bookingId: input.bookingId,
    stage: input.stage,
    uploaderId: input.uploaderId,
    src: `idb:${id}`,
    sha256,
    serverTimestamp: useAppStore.getState().now(),
    source: input.source,
    angle: input.angle,
    width,
    height,
    bytes: blob.size,
  };
  useAppStore.getState().addPhotos([record]);
  return record;
}

/** "Pakai foto contoh (demo)": registers a bundled image as evidence, hashed from its real bytes. */
export async function saveDemoPhoto(url: string, meta: Omit<SavePhotoInput, "blob" | "source" | "onProgress">): Promise<PhotoRecord> {
  if (isOnline() && !LOCAL_ONLY_STAGES.includes(meta.stage) && url.startsWith("/img/")) {
    const record = await registerDemoPhoto<PhotoRecord>(url, { stage: meta.stage, bookingId: meta.bookingId, angle: meta.angle });
    useAppStore.getState().addPhotos([record]);
    return record;
  }
  const res = await fetch(url);
  const blob = await res.blob();
  const record: PhotoRecord = {
    id: newId(),
    bookingId: meta.bookingId,
    stage: meta.stage,
    uploaderId: meta.uploaderId,
    src: url,
    sha256: await sha256Blob(blob),
    serverTimestamp: useAppStore.getState().now(),
    source: "demo",
    angle: meta.angle,
    bytes: blob.size,
  };
  useAppStore.getState().addPhotos([record]);
  return record;
}

/**
 * Signed photo URLs from the snapshot (v2, docs/integration/media.md §3) expire after about an hour. When one fails
 * to load, fetch a fresh snapshot (new `src`) once per photo, throttled across the page. Returns true when a refresh
 * was started, so the caller can show a placeholder instead of a broken image.
 */
const retriedPhotos = new Set<string>();
let refreshing: Promise<void> | null = null;
export function onPhotoLoadError(photoId: ID, src: string | undefined): boolean {
  if (!src || src.startsWith("idb:") || src.startsWith("/img/") || !isOnline()) return false;
  const key = `${photoId}|${src}`;
  if (retriedPhotos.has(key)) return false;
  retriedPhotos.add(key);
  refreshing ??= refreshSnapshot().finally(() => window.setTimeout(() => (refreshing = null), 3000));
  return true;
}

/** Resolve a photo src ("/img/..." or "idb:<id>") to something an <img> can show. undefined while loading; null if missing. */
export function usePhotoSrc(src?: string): string | null | undefined {
  const isIdb = !!src?.startsWith("idb:");
  const [url, setUrl] = useState<string | null | undefined>(isIdb ? undefined : src && resolveMediaUrl(src));
  useEffect(() => {
    if (!src) {
      setUrl(null);
      return;
    }
    if (!src.startsWith("idb:")) {
      setUrl(resolveMediaUrl(src));
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(undefined);
    idbGet<Blob>(src.slice(4), db())
      .then((blob) => {
        if (cancelled) return;
        if (!blob) return setUrl(null);
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setUrl(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  return url;
}

export function usePhoto(id?: ID): PhotoRecord | undefined {
  return useAppStore((s) => (id ? s.photos.find((p) => p.id === id) : undefined));
}

export function usePhotos(ids?: ID[]): PhotoRecord[] {
  const photos = useAppStore((s) => s.photos);
  return (ids ?? []).map((id) => photos.find((p) => p.id === id)).filter((p): p is PhotoRecord => !!p);
}

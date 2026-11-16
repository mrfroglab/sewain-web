"use client";

import { Camera, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { saveDemoPhoto, savePhoto } from "@/lib/photos";
import { toast } from "@/lib/toast";
import type { ID, PhotoStage } from "@/lib/types";
import { cn } from "../ui/cn";
import { CameraCapture, type Capture } from "./CameraCapture";

/** A capture on its way to the server (F6.4): progress while sending, "Coba lagi" when it failed. */
interface PendingUpload {
  key: string;
  capture: Capture;
  angle?: string;
  pct: number;
  error?: string;
}
import { EvidencePhoto } from "./EvidencePhoto";

/**
 * A list of evidence photos with a "take photo" button. Returns photo IDs (PhotoRecord ids).
 * Evidence is append-only (FR-P4) unless `removable` is set (e.g. listing photos before publishing).
 */
export function PhotoCaptureField({
  label,
  help,
  min = 0,
  max = 12,
  stage,
  uploaderId,
  bookingId,
  bookingCode,
  value,
  onChange,
  demoSources = [],
  angles = [],
  frame,
  facing,
  removable,
  cols = 3,
}: {
  label: string;
  help?: string;
  min?: number;
  max?: number;
  stage: PhotoStage;
  uploaderId: ID;
  bookingId?: ID;
  bookingCode?: string;
  value: ID[];
  onChange: (ids: ID[]) => void;
  demoSources?: string[];
  angles?: string[];
  frame?: "none" | "ktp" | "selfie";
  facing?: "environment" | "user";
  removable?: boolean;
  cols?: 2 | 3 | 4;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  // Uploads finish one by one; always append to the latest value, not the one captured when the camera closed.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const busy = pending.some((p) => !p.error);
  const missing = Math.max(0, min - value.length);
  const nextAngle = angles[value.length + pending.length];

  const patch = (key: string, p: Partial<PendingUpload>) => setPending((list) => list.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const upload = async (item: PendingUpload) => {
    patch(item.key, { pct: 0, error: undefined });
    try {
      const meta = { stage, uploaderId, bookingId, angle: item.angle };
      const c = item.capture;
      const rec = c.kind === "demo" ? await saveDemoPhoto(c.url, meta) : await savePhoto({ ...meta, blob: c.blob, source: c.source, onProgress: (pct) => patch(item.key, { pct }) });
      setPending((list) => list.filter((x) => x.key !== item.key));
      const ids = [...latest.current, rec.id];
      latest.current = ids;
      onChange(ids);
    } catch (e) {
      patch(item.key, { error: e instanceof Error ? e.message : "Gagal mengunggah foto." });
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-body-sm font-semibold text-ink">{label}</p>
          {help && <p className="mt-0.5 text-caption text-smoke">{help}</p>}
        </div>
        <span className={cn("shrink-0 text-caption font-medium", missing ? "text-smoke" : "text-ink")}>
          {value.length}
          {min ? `/${min} min` : ""}
        </span>
      </div>
      <div className={cn("grid gap-2", cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-4")}>
        {value.map((id) => (
          <div key={id} className="relative">
            <EvidencePhoto id={id} bookingCode={bookingCode} />
            {removable && (
              <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} aria-label="Hapus foto" className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white shadow-floating">
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}
        {pending.map((p) => (
          <div key={p.key} className="relative aspect-square overflow-hidden rounded-image bg-soft-gray">
            <img src={p.capture.preview} alt="" className="absolute inset-0 size-full object-cover opacity-60" />
            {p.error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/80 p-1.5 text-center" role="alert">
                <span className="line-clamp-2 text-micro text-sale-text">{p.error}</span>
                <button type="button" onClick={() => void upload(p)} className="inline-flex h-8 items-center gap-1 rounded-control bg-ink px-2.5 text-micro font-semibold text-white">
                  <RefreshCw className="size-3" /> Coba lagi
                </button>
                <button type="button" onClick={() => setPending((l) => l.filter((x) => x.key !== p.key))} className="text-micro text-smoke underline">
                  Buang
                </button>
              </div>
            ) : (
              <div className="absolute inset-x-1.5 bottom-1.5" role="status" aria-label={`Mengunggah ${Math.round(p.pct * 100)}%`}>
                <div className="h-1 overflow-hidden rounded-full bg-white/70">
                  <div className="h-full rounded-full bg-ink transition-[width] duration-200" style={{ width: `${Math.max(4, Math.round(p.pct * 100))}%` }} />
                </div>
                <span className="mt-0.5 block text-center text-[10px] font-semibold tabular-nums text-ink">{p.pct >= 1 ? "Menyimpan…" : `${Math.round(p.pct * 100)}%`}</span>
              </div>
            )}
          </div>
        ))}
        {value.length + pending.length < max && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-image border border-dashed border-ash bg-soft-gray text-caption font-medium text-graphite hover:border-ink disabled:opacity-50"
          >
            <Camera className="size-5" />
            {busy ? "Memproses…" : nextAngle ? nextAngle : "Ambil foto"}
          </button>
        )}
      </div>
      {missing > 0 && <p className="mt-1.5 text-caption text-smoke">Kurang {missing} foto lagi.</p>}
      <CameraCapture
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        hint={nextAngle ? `Sudut berikutnya: ${nextAngle}` : help}
        frame={frame}
        facing={facing}
        demoSources={demoSources}
        onDone={async (caps) => {
          const start = value.length + pending.length;
          const items = caps.slice(0, Math.max(0, max - start)).map((capture, i) => ({ key: `${Date.now()}-${i}-${Math.random()}`, capture, angle: angles[start + i], pct: 0 }));
          if (!items.length) return;
          setPending((list) => [...list, ...items]);
          // One at a time keeps the order of angles and the evidence timestamps.
          for (const item of items) await upload(item);
          if (items.length > 1 && caps.length > items.length) toast(`Maksimal ${max} foto.`, "info");
        }}
      />
    </div>
  );
}

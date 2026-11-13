"use client";

import { Camera, X } from "lucide-react";
import { useState } from "react";
import { saveDemoPhoto, savePhoto } from "@/lib/photos";
import { toast } from "@/lib/toast";
import type { ID, PhotoStage } from "@/lib/types";
import { cn } from "../ui/cn";
import { CameraCapture } from "./CameraCapture";
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
  const [busy, setBusy] = useState(false);
  const missing = Math.max(0, min - value.length);
  const nextAngle = angles[value.length];

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
        {value.length < max && (
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
          setBusy(true);
          try {
            const ids: ID[] = [];
            let i = value.length;
            for (const c of caps.slice(0, max - value.length)) {
              const meta = { stage, uploaderId, bookingId, angle: angles[i] };
              const rec = c.kind === "demo" ? await saveDemoPhoto(c.url, meta) : await savePhoto({ ...meta, blob: c.blob, source: c.source });
              ids.push(rec.id);
              i++;
            }
            onChange([...value, ...ids]);
          } catch (e) {
            toast(e instanceof Error ? e.message : "Gagal menyimpan foto.", "error");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

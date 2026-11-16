"use client";

import { Camera, ImagePlus, RefreshCw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppConfig } from "@/lib/config";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";

export type Capture = { kind: "blob"; blob: Blob; source: "kamera" | "galeri"; preview: string } | { kind: "demo"; url: string; preview: string };

/**
 * In-page camera (FR-P1): getUserMedia viewfinder so photos are taken live, not reused from the gallery.
 * Fallbacks: gallery upload (labelled "dari galeri", lower evidential weight) and, for the demo,
 * "Pakai foto contoh" so the flow works on a laptop without a camera.
 */
export function CameraCapture({
  open,
  onClose,
  onDone,
  title = "Ambil foto",
  hint,
  frame = "none",
  facing = "environment",
  multiple = true,
  demoSources: demoSourcesProp = [],
}: {
  open: boolean;
  onClose: () => void;
  onDone: (captures: Capture[]) => void;
  title?: string;
  hint?: string;
  frame?: "none" | "ktp" | "selfie";
  facing?: "environment" | "user";
  multiple?: boolean;
  demoSources?: string[];
}) {
  // "Foto contoh" only exists on demo servers (POST /api/v1/photos/demo is DEMO_MODE-only in v2).
  const demoMode = useAppConfig((s) => s.demoMode);
  const demoSources = demoMode ? demoSourcesProp : [];
  const video = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"environment" | "user">(facing);
  const [status, setStatus] = useState<"idle" | "starting" | "live" | "denied" | "unsupported">("idle");
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [flash, setFlash] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setStatus("starting");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const v = video.current;
        if (!v) return;
        // Only enable the shutter once real frames arrive (videoWidth > 0); otherwise the first tap is lost.
        const ready = () => !cancelled && v.videoWidth > 0 && setStatus("live");
        v.onloadeddata = ready;
        v.onplaying = ready;
        v.srcObject = stream;
        void v.play().catch(() => {});
        ready();
      })
      .catch(() => !cancelled && setStatus("denied"));
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, mode, stop]);

  useEffect(() => {
    if (!open) {
      captures.forEach((c) => c.kind === "blob" && URL.revokeObjectURL(c.preview));
      setCaptures([]);
      setMode(facing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const finish = (list: Capture[]) => {
    stop();
    onDone(list);
    onClose();
  };

  const shoot = (attempt = 0) => {
    const v = video.current;
    if (!v) return;
    if (!v.videoWidth) {
      if (attempt < 10) window.setTimeout(() => shoot(attempt + 1), 100);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (mode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 120);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const cap: Capture = { kind: "blob", blob, source: "kamera", preview: URL.createObjectURL(blob) };
        if (!multiple) finish([cap]);
        else setCaptures((c) => [...c, cap]);
      },
      "image/jpeg",
      0.92,
    );
  };

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const caps: Capture[] = Array.from(files).map((f) => ({ kind: "blob", blob: f, source: "galeri", preview: URL.createObjectURL(f) }));
    if (!multiple) finish(caps.slice(0, 1));
    else setCaptures((c) => [...c, ...caps]);
  };

  const useDemo = () => {
    const pick = multiple ? demoSources : demoSources.slice(0, 1);
    const caps: Capture[] = pick.map((url) => ({ kind: "demo", url, preview: url }));
    if (!multiple) finish(caps);
    else setCaptures((c) => [...c, ...caps]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center gap-3 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
        <button type="button" onClick={() => (stop(), onClose())} aria-label="Tutup kamera" className="grid size-9 place-items-center rounded-full bg-white/10">
          <X className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold">{title}</p>
          {hint && <p className="truncate text-caption text-white/70">{hint}</p>}
        </div>
        {status === "live" && (
          <button type="button" onClick={() => setMode((m) => (m === "user" ? "environment" : "user"))} aria-label="Ganti kamera" className="grid size-9 place-items-center rounded-full bg-white/10">
            <RefreshCw className="size-4" />
          </button>
        )}
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 items-center justify-center overflow-hidden">
        <video ref={video} playsInline muted autoPlay className={cn("absolute inset-0 size-full object-cover", mode === "user" && "-scale-x-100", status !== "live" && "opacity-0")} />
        {flash && <div className="absolute inset-0 bg-white/80" />}
        {status === "live" && frame === "ktp" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
            <div className="aspect-[1.586] w-full max-w-md rounded-[14px] border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            <p className="absolute bottom-6 text-center text-body-sm text-white/90">Posisikan KTP di dalam bingkai, pastikan tulisan terbaca</p>
          </div>
        )}
        {status === "live" && frame === "selfie" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
            <div className="aspect-[3/4] w-3/5 max-w-xs rounded-[50%] border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            <p className="absolute bottom-6 text-center text-body-sm text-white/90">Pegang KTP di samping wajah, lihat ke kamera</p>
          </div>
        )}
        {status === "starting" && <p className="text-body-sm text-white/70">Membuka kamera…</p>}
        {(status === "denied" || status === "unsupported") && (
          <div className="max-w-sm px-6 text-center">
            <Camera className="mx-auto mb-3 size-8 text-white/60" />
            <p className="text-body font-semibold">{status === "denied" ? "Kamera tidak bisa dibuka" : "Browser ini tidak mendukung kamera"}</p>
            <p className="mt-1 text-body-sm text-white/70">
              Kamu masih bisa unggah dari galeri. Foto dari galeri diberi label <b>“dari galeri”</b> dan bobot buktinya lebih rendah di mata mediator.
            </p>
          </div>
        )}
      </div>

      {captures.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3">
          {captures.map((c, i) => (
            <div key={i} className="relative size-14 shrink-0 overflow-hidden rounded-[8px] bg-white/10">
              <img src={c.preview} alt={`Foto ${i + 1}`} className="size-full object-cover" />
              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px]">{c.kind === "demo" ? "demo" : c.source}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 items-center gap-2 px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
        <div className="flex flex-col items-start gap-2">
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-control bg-white/10 px-3 py-2 text-caption">
            <ImagePlus className="size-4" /> Galeri
          </button>
          {demoSources.length > 0 && (
            <button type="button" onClick={useDemo} className="inline-flex items-center gap-1.5 rounded-control bg-white/10 px-3 py-2 text-caption">
              <Sparkles className="size-4" /> Foto contoh
            </button>
          )}
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => shoot()}
            disabled={status !== "live"}
            aria-label="Ambil foto"
            className="grid size-[72px] place-items-center rounded-full border-4 border-white/90 disabled:opacity-30"
          >
            <span className="size-14 rounded-full bg-white" />
          </button>
        </div>
        <div className="flex justify-end">
          {multiple && (
            <Button variant="secondary" size="sm" disabled={!captures.length} onClick={() => finish(captures)}>
              Selesai ({captures.length})
            </Button>
          )}
        </div>
      </div>
      <input ref={fileInput} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}

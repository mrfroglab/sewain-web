"use client";

import { Eye, ImageOff, ScrollText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminKycFile, type KycSubmission } from "@/lib/account";

type Kind = "ktp" | "selfie";
type FileState = { url: string } | { error: string };

const LABEL: Record<Kind, string> = { ktp: "Foto KTP", selfie: "Selfie memegang KTP" };

/**
 * KTP + selfie of a server KYC submission (F6.2). Loaded only after the admin taps, because every read is written to
 * the audit log (`kyc.file.read`). Fetched with the session (cookie or bearer) and shown as object URLs, never as a
 * plain <img src> to the API.
 */
export function KycPhotos({ submission }: { submission: KycSubmission }) {
  const [files, setFiles] = useState<Partial<Record<Kind, FileState>>>({});
  const [loading, setLoading] = useState(false);
  const urls = useRef<string[]>([]);
  const [zoom, setZoom] = useState<Kind | null>(null);

  useEffect(() => {
    const list = urls.current;
    return () => list.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const purged = !!submission.filesPurgedAt;

  const load = async () => {
    setLoading(true);
    const kinds: Kind[] = ["ktp", "selfie"];
    const results = await Promise.all(kinds.map((k) => adminKycFile(submission.id, k)));
    const next: Partial<Record<Kind, FileState>> = {};
    results.forEach((r, i) => {
      if (r.blob) {
        const url = URL.createObjectURL(r.blob);
        urls.current.push(url);
        next[kinds[i]] = { url };
      } else next[kinds[i]] = { error: r.status === 410 ? "Sudah dihapus (retensi)" : r.error ?? "Gagal memuat" };
    });
    setFiles(next);
    setLoading(false);
  };

  const shown = Object.keys(files).length > 0;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5">
        {(["ktp", "selfie"] as Kind[]).map((k) => {
          const f = files[k];
          return (
            <figure key={k} className="min-w-0">
              {f && "url" in f ? (
                <button type="button" onClick={() => setZoom(k)} className="relative block aspect-[4/3] w-full overflow-hidden rounded-image bg-soft-gray" aria-label={`Perbesar ${LABEL[k]}`}>
                  <img src={f.url} alt={LABEL[k]} className="absolute inset-0 size-full object-cover" />
                </button>
              ) : (
                <div className="grid aspect-[4/3] place-items-center rounded-image bg-soft-gray p-2 text-center text-micro text-ash">
                  <span>
                    <ImageOff className="mx-auto mb-1 size-5" />
                    {f && "error" in f ? f.error : purged ? "Sudah dihapus (retensi)" : "Belum dibuka"}
                  </span>
                </div>
              )}
              <figcaption className="mt-1.5 text-micro font-medium text-graphite">{LABEL[k]}</figcaption>
            </figure>
          );
        })}
      </div>
      {!shown && !purged && (
        <Button variant="secondary" size="sm" block className="mt-2.5" onClick={load} loading={loading}>
          <Eye className="size-4" /> Tampilkan foto
        </Button>
      )}
      <p className="mt-2 flex gap-1.5 text-micro text-smoke">
        <ScrollText className="mt-px size-3 shrink-0" />
        Setiap kali foto dibuka, aksesmu dicatat di log audit. Buka hanya untuk meninjau.
      </p>
      {zoom && files[zoom] && "url" in files[zoom]! && (
        <div className="fixed inset-0 z-[1200] bg-black/85" role="dialog" aria-modal="true" aria-label={LABEL[zoom]}>
          <button type="button" onClick={() => setZoom(null)} aria-label="Tutup foto" className="grid size-full place-items-center p-4">
            <img src={(files[zoom] as { url: string }).url} alt={LABEL[zoom]} className="max-h-[85dvh] w-auto max-w-full rounded-image object-contain" />
          </button>
        </div>
      )}
    </div>
  );
}

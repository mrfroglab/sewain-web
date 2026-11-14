"use client";

import { Camera, Info, SendHorizontal } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { CameraCapture, type Capture } from "@/components/photo/CameraCapture";
import { Spinner } from "@/components/ui/Button";
import { saveDemoPhoto, savePhoto } from "@/lib/photos";
import { useAppStore } from "@/lib/store";
import { toast, toastResult } from "@/lib/toast";
import type { Booking, ID } from "@/lib/types";
import { QUICK_REPLIES, WA_WARNING, mentionsWhatsApp } from "./thread";

/** Keep the keyboard open on phones when tapping send / a chip. */
const keepFocus = (e: MouseEvent) => e.preventDefault();

/**
 * Composer pinned under the conversation: quick replies, camera (one photo, saved as chat evidence),
 * text input and send. Shows the WhatsApp notice (FR-C1) while the draft mentions WA or a phone number.
 */
export function Composer({ booking, userId, demoPhoto }: { booking: Booking; userId: ID; demoPhoto?: string }) {
  const sendMessage = useAppStore((s) => s.sendMessage);
  const [draft, setDraft] = useState("");
  const [camera, setCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const waDraft = mentionsWhatsApp(draft);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return false;
    return toastResult(sendMessage(userId, booking.id, { text: t }));
  };

  const sendPhoto = async (caps: Capture[]) => {
    const c = caps[0];
    if (!c) return;
    setUploading(true);
    try {
      const meta = { stage: "chat" as const, uploaderId: userId, bookingId: booking.id };
      const rec = c.kind === "demo" ? await saveDemoPhoto(c.url, meta) : await savePhoto({ ...meta, blob: c.blob, source: c.source });
      toastResult(sendMessage(userId, booking.id, { photoId: rec.id }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mengirim foto.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="shrink-0 border-t border-border-gray bg-white">
      {waDraft ? (
        <p className="mx-4 mt-2 flex items-start gap-2 rounded-[10px] bg-soft-gray px-3 py-2 text-caption text-graphite" aria-live="polite">
          <Info className="mt-px size-3.5 shrink-0 text-ink" aria-hidden />
          {WA_WARNING}
        </p>
      ) : (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-2" aria-label="Balasan cepat">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              type="button"
              onMouseDown={keepFocus}
              onClick={() => send(q)}
              className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-control border border-border-gray bg-white px-3.5 text-nav font-medium text-ink transition-colors hover:border-ink"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-center gap-2 px-4 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (send(draft)) setDraft("");
        }}
      >
        <button
          type="button"
          onClick={() => setCamera(true)}
          disabled={uploading}
          aria-label="Kirim foto"
          title="Kirim foto"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-border-gray text-ink transition-colors hover:border-ink disabled:opacity-40"
        >
          {uploading ? <Spinner /> : <Camera className="size-[18px]" />}
        </button>
        <label htmlFor="chat-draft" className="sr-only">
          Tulis pesan
        </label>
        <input
          id="chat-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // iOS scrolls the (locked) page to reveal the input; put it back when the keyboard closes.
          onBlur={() => window.matchMedia("(max-width: 1023.98px)").matches && window.scrollTo(0, 0)}
          placeholder="Tulis pesan…"
          autoComplete="off"
          enterKeyHint="send"
          maxLength={1000}
          // 16px avoids the iOS zoom-on-focus.
          className="h-10 min-w-0 flex-1 rounded-control border border-border-gray bg-soft-gray px-4 text-body-lg text-ink placeholder:text-ash focus:border-ink focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          onMouseDown={keepFocus}
          disabled={!draft.trim()}
          aria-label="Kirim pesan"
          title="Kirim"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white transition-colors hover:bg-graphite disabled:bg-image-gray disabled:text-ash"
        >
          <SendHorizontal className="size-[18px]" />
        </button>
      </form>

      <CameraCapture
        open={camera}
        onClose={() => setCamera(false)}
        onDone={(caps) => void sendPhoto(caps)}
        title="Kirim foto di chat"
        hint="Foto tersimpan sebagai bukti, lengkap dengan waktu & kode sewa"
        multiple={false}
        demoSources={demoPhoto ? [demoPhoto] : []}
      />
    </div>
  );
}

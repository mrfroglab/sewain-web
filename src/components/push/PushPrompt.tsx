"use client";

import { BellRing, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAppConfig } from "@/lib/config";
import { checkPush, enablePush, MEANINGFUL_ACTIONS, pushAskedBefore, pushSupported, rememberPushAsked, usePush } from "@/lib/push";
import { useSession } from "@/lib/session";
import { setActionObserver } from "@/lib/store";
import { toast } from "@/lib/toast";

/**
 * Polite push opt-in (F6.5): asked once, right after the first meaningful action (a request, a reply, a listing),
 * when a notification is obviously useful. Never on page load; the browser permission dialog only opens after "Ya".
 */
export function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const fromServer = useAppConfig((s) => s.fromServer);
  const signedIn = useSession((s) => !!s.userId);

  useEffect(() => {
    if (!fromServer) return;
    setActionObserver((name) => {
      if (!MEANINGFUL_ACTIONS.has(name) || !pushSupported() || pushAskedBefore() || Notification.permission !== "default") return;
      void checkPush().then(() => {
        const { serverKey, subscribed } = usePush.getState();
        if (serverKey && !subscribed) window.setTimeout(() => setVisible(true), 1200); // after the success toast
      });
    });
    return () => setActionObserver(null);
  }, [fromServer]);

  if (!visible || !signedIn) return null;

  const answer = async (yes: boolean) => {
    rememberPushAsked(yes ? "ya" : "nanti");
    if (!yes) return setVisible(false);
    setBusy(true);
    const r = await enablePush();
    setBusy(false);
    setVisible(false);
    toast(r.ok ? "Siap! Kami kabari lewat notifikasi." : r.error, r.ok ? "success" : "error");
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-[560] flex justify-center px-4 lg:bottom-6">
      <section role="dialog" aria-labelledby="push-ask" className="pointer-events-auto w-full max-w-sm animate-fade-up rounded-card bg-white p-4 shadow-floating">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-soft-gray text-ink">
            <BellRing className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="push-ask" className="text-body-sm font-semibold text-ink">
              Mau dikabari saat ada balasan?
            </h2>
            <p className="mt-0.5 text-caption text-smoke">Notifikasi untuk request sewa, chat, dan sengketa. Bisa dimatikan kapan saja di Notifikasi.</p>
          </div>
          <button type="button" onClick={() => void answer(false)} aria-label="Tutup" className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-smoke hover:bg-soft-gray">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => void answer(false)} disabled={busy}>
            Nanti saja
          </Button>
          <Button onClick={() => void answer(true)} loading={busy}>
            Ya, kabari
          </Button>
        </div>
      </section>
    </div>
  );
}

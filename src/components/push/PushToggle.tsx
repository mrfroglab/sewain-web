"use client";

import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/Field";
import { checkPush, disablePush, enablePush, rememberPushAsked, usePush } from "@/lib/push";
import { toast } from "@/lib/toast";

/**
 * "Notifikasi push di perangkat ini" (F6.5), for /notifikasi and the account settings. Hidden when the server has no
 * VAPID key (push off) and explained when the browser cannot do push.
 */
export function PushToggle({ className }: { className?: string }) {
  const { supported, serverKey, permission, subscribed, checked } = usePush();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void checkPush();
  }, []);

  if (!checked || (supported && !serverKey)) return null;

  const change = async (on: boolean) => {
    setBusy(true);
    const r = on ? await enablePush() : await disablePush();
    setBusy(false);
    rememberPushAsked(on ? "ya" : "nanti");
    if (!r.ok) return toast(r.error, "error");
    toast(on ? "Notifikasi push aktif di perangkat ini." : "Notifikasi push dimatikan di perangkat ini.", "success");
  };

  const description = !supported
    ? "Browser ini belum mendukung notifikasi push. Di iPhone, pasang Sewain ke layar utama (iOS 16.4+) dulu."
    : permission === "denied"
      ? "Izin notifikasi diblokir di browser. Buka pengaturan situs untuk mengizinkannya lagi."
      : "Kabar request sewa, chat, dan sengketa langsung muncul walau Sewain sedang ditutup.";

  return (
    <div className={className} data-testid="push-toggle">
      <div className="flex gap-3 rounded-card border border-border-gray p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-soft-gray text-ink">
          <BellRing className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <Toggle checked={subscribed} onChange={(v) => void change(v)} disabled={busy || !supported || permission === "denied"} label="Notifikasi push di perangkat ini" description={description} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { Laptop, LogOut, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Layout";
import { listSessions, revokeOtherSessions, revokeSession, type SessionInfo } from "@/lib/account";
import { relativeTime } from "@/lib/format";
import { useAppStore, useNow } from "@/lib/store";
import { toast } from "@/lib/toast";
import { SettingsSection } from "./ui";

/** "Chrome di Android", "Safari di iPhone", … from the User-Agent the server recorded. */
export function deviceLabel(ua = ""): { label: string; phone: boolean } {
  const browser = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  if (!ua) return { label: "Perangkat tidak dikenal", phone: false };
  return { label: os ? `${browser} di ${os}` : browser, phone: /Android|iPhone|Mobile/.test(ua) };
}

export function SessionsSection() {
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  // Wall clock, not the demo clock: session times are real.
  const now = useNow() - useAppStore((s) => s.clockOffset);

  useEffect(() => {
    let live = true;
    listSessions().then((r) => {
      if (!live) return;
      if (r.body.ok) setSessions([...(r.body.sessions ?? [])].sort((a, b) => Number(b.current) - Number(a.current) || Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt)));
      else setError(r.body.error ?? "Gagal memuat sesi.");
    });
    return () => {
      live = false;
    };
  }, [version]);

  const revoke = async (s: SessionInfo) => {
    setBusy(s.id);
    const r = await revokeSession(s.id);
    setBusy(null);
    if (!r.body.ok) return toast(r.body.error ?? "Gagal mengeluarkan perangkat.", "error");
    toast(`${deviceLabel(s.userAgent).label} sudah dikeluarkan.`, "success");
    setVersion((v) => v + 1);
  };

  const revokeOthers = async () => {
    setBusy("others");
    const r = await revokeOtherSessions();
    setBusy(null);
    if (!r.body.ok) return toast(r.body.error ?? "Gagal mengeluarkan perangkat lain.", "error");
    toast(r.body.revoked ? `${r.body.revoked} perangkat lain sudah dikeluarkan.` : "Tidak ada perangkat lain yang masuk.", "success");
    setVersion((v) => v + 1);
  };

  const others = sessions?.filter((s) => !s.current).length ?? 0;

  return (
    <SettingsSection id="sesi" title="Sesi aktif" description="Perangkat yang sedang masuk ke akunmu. Keluarkan yang tidak kamu kenali.">
      {error ? (
        <p className="rounded-card bg-soft-gray p-4 text-body-sm text-graphite">{error}</p>
      ) : !sessions ? (
        <Skeleton className="h-32 rounded-card" />
      ) : (
        <>
          <ul className="divide-y divide-border-gray overflow-hidden rounded-card border border-border-gray" data-testid="sessions">
            {sessions.map((s) => {
              const d = deviceLabel(s.userAgent);
              const Icon = d.phone ? Smartphone : Laptop;
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-soft-gray text-ink">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5 text-body-sm font-semibold text-ink">
                      {d.label}
                      {s.current && <Badge tone="ink">Perangkat ini</Badge>}
                    </span>
                    <span className="block truncate text-caption text-smoke">
                      {s.current ? "Aktif sekarang" : `Terakhir aktif ${relativeTime(Date.parse(s.lastSeenAt), now)}`}
                      {s.ip ? ` · IP ${s.ip}` : ""}
                    </span>
                  </span>
                  {!s.current && (
                    <Button variant="secondary" size="sm" onClick={() => void revoke(s)} loading={busy === s.id} disabled={!!busy}>
                      Keluarkan
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          <Button variant="secondary" block className="mt-3" onClick={() => void revokeOthers()} loading={busy === "others"} disabled={!!busy || others === 0}>
            <LogOut className="size-4" /> Keluar dari semua perangkat lain
          </Button>
        </>
      )}
    </SettingsSection>
  );
}

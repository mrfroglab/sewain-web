"use client";

import { Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { PushToggle } from "@/components/push/PushToggle";
import { cn } from "@/components/ui/cn";
import { Toggle } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Layout";
import { getNotificationPrefs, putNotificationPrefs, type NotificationPrefsPatch, type NotificationPrefsResponse, type NotifyCategory, type NotifyChannel } from "@/lib/account";
import { toast } from "@/lib/toast";
import { SettingsSection } from "./ui";

const CATEGORIES: { key: NotifyCategory; label: string; hint: string }[] = [
  { key: "booking", label: "Sewa & pembayaran", hint: "Request, persetujuan, serah terima, ulasan" },
  { key: "chat", label: "Chat", hint: "Pesan baru di sewaan" },
  { key: "sengketa", label: "Sengketa", hint: "Laporan masalah dan mediasi" },
  { key: "sistem", label: "Akun & verifikasi", hint: "Verifikasi, keamanan, info penting" },
];

const CHANNELS: { key: Exclude<NotifyChannel, "inapp" | "whatsapp">; label: string }[] = [
  { key: "webpush", label: "Push" },
  { key: "email", label: "Email" },
];

function MiniSwitch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-10 shrink-0 rounded-control transition-colors disabled:cursor-not-allowed disabled:opacity-40", checked ? "bg-ink" : "bg-image-gray")}
    >
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-soft transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

/** GET/PUT /api/v1/me/notification-prefs (notify.md §5). Changes save immediately; the server answers with the result. */
export function NotificationPrefsSection() {
  const [data, setData] = useState<NotificationPrefsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    getNotificationPrefs().then((r) => {
      if (!live) return;
      if (r.body.ok && r.body.prefs) setData(r.body);
      else setError(r.body.error ?? "Gagal memuat preferensi.");
    });
    return () => {
      live = false;
    };
  }, []);

  const save = async (patch: NotificationPrefsPatch, optimistic: NotificationPrefsResponse) => {
    const before = data;
    setData(optimistic);
    setSaving(true);
    const r = await putNotificationPrefs(patch);
    setSaving(false);
    if (r.body.ok && r.body.prefs) return setData(r.body);
    setData(before);
    toast(r.body.error ?? "Gagal menyimpan preferensi.", "error");
  };

  const setChannel = (ch: NotifyChannel, cat: NotifyCategory, on: boolean) => {
    if (!data) return;
    const next = structuredClone(data);
    next.prefs.channels[ch][cat] = on;
    void save({ channels: { [ch]: { [cat]: on } } }, next);
  };

  const setQuiet = (patch: Partial<NotificationPrefsResponse["prefs"]["quietHours"]>) => {
    if (!data) return;
    const next = structuredClone(data);
    next.prefs.quietHours = { ...next.prefs.quietHours, ...patch };
    void save({ quietHours: next.prefs.quietHours }, next);
  };

  return (
    <SettingsSection id="notifikasi" title="Notifikasi" description="Notifikasi di aplikasi selalu aktif. Pilih kabar mana yang juga dikirim lewat push dan email.">
      <PushToggle className="mb-3" />
      {error ? (
        <p className="rounded-card bg-soft-gray p-4 text-body-sm text-graphite">{error}</p>
      ) : !data ? (
        <Skeleton className="h-48 rounded-card" />
      ) : (
        <>
          <div className="overflow-hidden rounded-card border border-border-gray" data-testid="notif-prefs" aria-busy={saving}>
            <div className="grid grid-cols-[minmax(0,1fr)_48px_48px] items-center gap-2 border-b border-border-gray bg-soft-gray px-4 py-2 text-caption font-semibold text-graphite">
              <span>Kabar</span>
              {CHANNELS.map((c) => (
                <span key={c.key} className="text-center">
                  {c.label}
                </span>
              ))}
            </div>
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="grid grid-cols-[minmax(0,1fr)_48px_48px] items-center gap-2 border-b border-border-gray px-4 py-3 last:border-0">
                <span className="min-w-0">
                  <span className="block text-body-sm font-semibold text-ink">{cat.label}</span>
                  <span className="block text-caption text-smoke">{cat.hint}</span>
                </span>
                {CHANNELS.map((c) => (
                  <span key={c.key} className="flex justify-center">
                    <MiniSwitch
                      checked={!!data.prefs.channels[c.key]?.[cat.key]}
                      disabled={!data.available[c.key]}
                      onChange={(v) => setChannel(c.key, cat.key, v)}
                      label={`${cat.label} lewat ${c.label}`}
                    />
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-2 text-caption text-smoke">
            {!data.available.email && "Email belum aktif di server. "}
            {!data.available.webpush ? "Push belum aktif di server. " : data.pushSubscriptions === 0 ? "Push baru terkirim setelah kamu mengaktifkannya di perangkat. " : ""}
            WhatsApp menyusul.
          </p>

          <div className="mt-4 rounded-card border border-border-gray p-4">
            <Toggle
              checked={data.prefs.quietHours.enabled}
              onChange={(enabled) => setQuiet({ enabled })}
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Moon className="size-4" /> Jam tenang
                </span>
              }
              description="Push dan email ditahan sampai jam tenang selesai. Kecuali notifikasi penting seperti sengketa."
            />
            {data.prefs.quietHours.enabled && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-caption text-smoke">
                  Mulai
                  <input
                    type="time"
                    value={data.prefs.quietHours.start}
                    onChange={(e) => e.target.value && setQuiet({ start: e.target.value })}
                    className="mt-1 block h-11 w-full rounded-control border border-border-gray px-3 text-body text-ink"
                  />
                </label>
                <label className="text-caption text-smoke">
                  Selesai
                  <input
                    type="time"
                    value={data.prefs.quietHours.end}
                    onChange={(e) => e.target.value && setQuiet({ end: e.target.value })}
                    className="mt-1 block h-11 w-full rounded-control border border-border-gray px-3 text-body text-ink"
                  />
                </label>
              </div>
            )}
          </div>
        </>
      )}
    </SettingsSection>
  );
}

"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { exportMyData } from "@/lib/account";
import { toast } from "@/lib/toast";
import type { User } from "@/lib/types";
import { SettingsSection } from "./ui";

/** UU PDP: everything Sewain stores about you, as one JSON file (GET /api/v1/me/export). */
export function ExportSection({ user }: { user: User }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    const r = await exportMyData();
    setBusy(false);
    if (!r.body.ok) return toast(r.body.error ?? "Gagal menyiapkan data.", "error");
    const blob = new Blob([JSON.stringify(r.body.export ?? r.body, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sewain-data-${user.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast("Data akunmu sudah diunduh.", "success");
  };
  return (
    <SettingsSection id="ekspor" title="Ekspor data" description="Unduh salinan data akunmu: profil, barang, sewaan, pesan, ulasan, dan status verifikasi (tanpa foto KTP).">
      <Button variant="secondary" block onClick={() => void download()} loading={busy}>
        <Download className="size-4" /> Unduh data saya (JSON)
      </Button>
    </SettingsSection>
  );
}

"use client";

import { TriangleAlert, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Layout";
import { Sheet } from "@/components/ui/Sheet";
import { deleteMyAccount } from "@/lib/account";
import { useRealSession, useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import type { User } from "@/lib/types";
import { SettingsSection } from "./ui";

const CONFIRM_WORD = "HAPUS";

/**
 * DELETE /api/v1/me (UU PDP): the account is anonymised, KTP data erased, every session ends. Two steps: what will
 * happen, then type HAPUS. The server refuses while a rental is still open (409, message shown as is).
 */
export function DangerZone({ user }: { user: User }) {
  const router = useRouter();
  const real = useRealSession();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const close = () => {
    setStep(0);
    setWord("");
  };

  const confirm = async () => {
    setBusy(true);
    const r = await deleteMyAccount();
    setBusy(false);
    if (!r.body.ok) {
      close();
      // 409 = a rule (open rentals, …): explain it on the page, not only in a toast.
      if (r.status === 409) return setBlocked(r.body.error ?? "Akun belum bisa dihapus.");
      return toast(r.body.error ?? "Gagal menghapus akun.", "error");
    }
    close();
    // The server already ended the session and cleared the cookie; sign out locally too.
    useSession.getState().signOut();
    toast("Akunmu sudah dihapus. Terima kasih sudah memakai Sewain.", "success");
    router.push("/");
  };

  return (
    <SettingsSection id="hapus" title="Hapus akun" description="Data pribadimu dihapus atau dianonimkan. Riwayat sewa yang wajib disimpan tetap ada tanpa namamu.">
      {blocked && (
        <Notice icon={<TriangleAlert className="size-4" />} title="Akun belum bisa dihapus" className="mb-3">
          <span data-testid="delete-blocked">{blocked}</span>
        </Notice>
      )}
      {real ? (
        <Button variant="secondary" block onClick={() => setStep(1)} className="border-sale-text text-sale-text">
          <UserX className="size-4" /> Hapus akun saya
        </Button>
      ) : (
        <p className="rounded-card bg-soft-gray p-4 text-body-sm text-graphite">Akun demo tidak bisa dihapus. Masuk dengan nomor HP untuk mencoba fitur ini.</p>
      )}

      <Sheet
        open={step === 1}
        onClose={close}
        title="Hapus akun?"
        description={`Akun ${user.name} akan dihapus permanen.`}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={close}>
              Batal
            </Button>
            <Button onClick={() => setStep(2)}>Lanjut</Button>
          </div>
        }
      >
        <ul className="space-y-2 text-body-sm text-graphite">
          <li>• Kamu keluar dari semua perangkat dan tidak bisa masuk lagi dengan akun ini.</li>
          <li>• Profil, barang, favorit, dan data KTP dihapus. Nama di riwayat sewa diganti &ldquo;Pengguna dihapus&rdquo;.</li>
          <li>• Sewaan yang masih berjalan harus selesai atau dibatalkan dulu.</li>
          <li>• Mau simpan salinan? Unduh dulu lewat &ldquo;Ekspor data&rdquo;.</li>
        </ul>
      </Sheet>

      <Sheet
        open={step === 2}
        onClose={close}
        title="Konfirmasi terakhir"
        description={`Ketik ${CONFIRM_WORD} untuk menghapus akun. Ini tidak bisa dibatalkan.`}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={close} disabled={busy}>
              Batal
            </Button>
            <Button onClick={() => void confirm()} disabled={word.trim().toUpperCase() !== CONFIRM_WORD} loading={busy}>
              Hapus permanen
            </Button>
          </div>
        }
      >
        <TextField label={`Ketik ${CONFIRM_WORD}`} value={word} onChange={(e) => setWord(e.target.value)} autoCapitalize="characters" autoComplete="off" />
      </Sheet>
    </SettingsSection>
  );
}

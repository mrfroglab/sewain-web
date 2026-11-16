"use client";

import { ArrowRight, FlaskConical } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Layout";
import { publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { formatPhone, isValidPhone, normalizePhone, randomPhone } from "./helpers";

/** Step 1 of "Masuk / daftar dengan nomor HP" (FR-A1). */
export function PhoneStep({
  value,
  onChange,
  onSubmit,
  currentUser,
  real = false,
}: {
  value: string;
  onChange: (v: string) => void;
  /** real OTP: resolves with an error message to show, or null once the code is on its way */
  onSubmit: (phone: string) => void | Promise<string | null>;
  /** F6.1: the server sends a real OTP (no demo shortcuts on this screen) */
  real?: boolean;
  /** set while switching accounts: "kamu masih masuk sebagai …" */
  currentUser: User | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sample = useAppStore((s) => s.users.find((u) => u.id === "u-raka"));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const phone = normalizePhone(value);
    if (!isValidPhone(phone)) return setError("Nomor HP belum benar. Contoh: 0812 3456 7890.");
    setError(null);
    setBusy(true);
    const err = await onSubmit(phone);
    setBusy(false);
    if (err) setError(err);
  };

  const fill = (phone: string) => {
    onChange(formatPhone(phone));
    setError(null);
  };

  const fillNew = () => fill(randomPhone(useAppStore.getState().users.flatMap((u) => (u.phone ? [u.phone] : []))));

  return (
    <section aria-labelledby="masuk-hp">
      <h1 id="masuk-hp" className="text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink lg:text-[32px]">
        Masuk atau daftar
      </h1>
      <p className="mt-2 max-w-md text-body text-smoke">Cukup pakai nomor HP. Kami kirim kode OTP untuk memastikan nomornya benar milikmu.</p>

      {currentUser && (
        <p className="mt-4 text-body-sm text-graphite">
          Kamu masih masuk sebagai <b className="text-ink">{publicName(currentUser)}</b> sampai memilih akun lain.
        </p>
      )}

      <form onSubmit={submit} className="mt-6 max-w-md" noValidate>
        <TextField
          label="Nomor HP"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0812 3456 7890"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (error) setError(null);
          }}
          error={error}
          help={real ? "Kode dikirim lewat WhatsApp atau SMS. Nomor baru otomatis lanjut ke pendaftaran." : "Nomor baru otomatis lanjut ke pendaftaran."}
          className="[&_input]:text-body-lg"
        />
        <Button type="submit" size="lg" block className="mt-4" loading={busy}>
          {busy ? "Mengirim…" : "Kirim OTP"} <ArrowRight className="size-4" />
        </Button>
      </form>

      {!real && <Notice icon={<FlaskConical className="size-4" />} title="Mode demo: OTP tanpa SMS" className="mt-5 max-w-md">
        <p>Kodenya ditampilkan di layar berikutnya. Coba salah satu:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {sample?.phone && (
            <button type="button" onClick={() => fill(sample.phone!)} className="inline-flex h-9 items-center rounded-control border border-border-gray bg-white px-3 text-caption font-medium text-ink hover:border-ink">
              Nomor {publicName(sample)} (sudah terdaftar)
            </button>
          )}
          <button type="button" onClick={fillNew} className="inline-flex h-9 items-center rounded-control border border-border-gray bg-white px-3 text-caption font-medium text-ink hover:border-ink">
            Nomor baru (daftar)
          </button>
        </div>
      </Notice>}

      <p className="mt-5 max-w-md text-caption text-smoke">
        Dengan melanjutkan, kamu setuju dengan{" "}
        <Link href={real ? "/syarat" : "/bantuan#syarat"} className="font-medium text-ink underline underline-offset-2">
          syarat penggunaan
        </Link>{" "}
        dan{" "}
        <Link href={real ? "/privasi" : "/bantuan#privasi"} className="font-medium text-ink underline underline-offset-2">
          kebijakan privasi
        </Link>{" "}
        Sewain.
      </p>
    </section>
  );
}

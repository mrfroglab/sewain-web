"use client";

import { ArrowRight, BadgeCheck, Check, Info } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { KV, Notice } from "@/components/ui/Layout";
import { formatDate, isoDate } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import type { User, VerificationMethod } from "@/lib/types";
import { METHOD_LABEL, maskNikPretty } from "./kyc";

export interface VerifyResult {
  method: VerificationMethod;
  nameOnKtp: string;
  nik: string;
  /** name on KTP differed from the profile and the user confirmed (would go to manual review in the product) */
  mismatch: boolean;
}

function Actions({ next }: { next: string | null }) {
  return (
    <div className="mt-6 grid gap-2">
      <ButtonLink href={next ?? "/"} size="lg" block>
        {next ? "Lanjutkan" : "Mulai cari barang"} <ArrowRight className="size-4" />
      </ButtonLink>
      {next !== "/profil" && (
        <ButtonLink href="/profil" variant="secondary" size="lg" block>
          Lihat profil
        </ButtonLink>
      )}
    </div>
  );
}

/** Step 4: success. */
export function DoneStep({ user, result, next }: { user: User; result: VerifyResult; next: string | null }) {
  return (
    <section aria-labelledby="verif-done" className="animate-fade-up">
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-ink text-white">
          <Check className="size-8" strokeWidth={2.5} />
        </span>
        <h1 id="verif-done" className="mt-5 text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">
          Terverifikasi
        </h1>
        <p className="mt-2 text-body text-smoke">Sekarang kamu bisa menyewa dan menyewakan barang di Sewain.</p>
      </div>

      <div className="mt-6 rounded-card border border-border-gray px-4 py-2">
        <KV k="Nama di KTP" v={result.nameOnKtp} strong />
        <KV k="NIK" v={<span className="tabular-nums">{maskNikPretty(result.nik)}</span>} />
        <KV k="Metode" v={METHOD_LABEL[result.method]} />
        <KV k="Yang dilihat orang lain" v={`${publicName(user)} · Terverifikasi`} />
      </div>

      {result.mismatch && (
        <Notice icon={<Info className="size-4" />} className="mt-3">
          Nama di KTP beda dengan profil. Di aplikasi asli ini ditinjau manual dulu; di demo langsung disetujui.
        </Notice>
      )}
      {result.method === "demo" && (
        <Notice icon={<Info className="size-4" />} className="mt-3">
          Scan dilewati (mode demo), jadi dipakai NIK contoh. Di aplikasi asli tombol ini tidak ada.
        </Notice>
      )}

      <Actions next={next} />
    </section>
  );
}

/** Shown when the account was already verified before opening this page. */
export function VerifiedStatus({ user, next, onRedo }: { user: User; next: string | null; onRedo?: () => void }) {
  const v = user.verification;
  return (
    <section aria-labelledby="verif-status" className="animate-fade-up">
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-ink text-white">
          <BadgeCheck className="size-8" />
        </span>
        <h1 id="verif-status" className="mt-5 text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">
          Identitasmu sudah terverifikasi
        </h1>
        <p className="mt-2 text-body text-smoke">
          {v.verifiedAt ? `Sejak ${formatDate(isoDate(v.verifiedAt), true)}` : "Terverifikasi"}
          {v.method ? ` lewat ${METHOD_LABEL[v.method]}` : ""}. Kamu bisa langsung menyewa dan menyewakan.
        </p>
      </div>

      <div className="mt-6 rounded-card border border-border-gray px-4 py-2">
        <KV k="Nama lengkap" v={user.name} strong />
        {v.nikMasked && v.nikMasked !== "-" && <KV k="NIK" v={<span className="tabular-nums">{v.nikMasked}</span>} />}
        <KV k="Yang dilihat orang lain" v={`${publicName(user)} · Terverifikasi`} />
      </div>
      <p className="mt-2 text-caption text-smoke">NIK dan nama lengkap hanya terlihat olehmu dan admin.</p>

      <Actions next={next} />
      {onRedo && <div className="mt-4 text-center">
        <button type="button" onClick={onRedo} className="inline-flex h-9 items-center rounded-control px-3 text-body-sm text-smoke underline underline-offset-4 hover:text-ink">
          Coba lagi alur scan KTP (demo)
        </button>
      </div>}
    </section>
  );
}

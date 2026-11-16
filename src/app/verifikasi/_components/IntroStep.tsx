"use client";

import { ArrowRight, EyeOff, Fingerprint, Lock, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Layout";
import { publicName } from "@/lib/selectors";
import type { User } from "@/lib/types";
import { SkipDemoButton } from "./SkipDemoButton";

const REASONS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <ShieldCheck className="size-5" />,
    title: "Biar sama-sama tenang",
    body: "Semua penyewa dan penyedia di Sewain terverifikasi. Kamu tahu barangmu dipinjam orang yang jelas.",
  },
  {
    icon: <Fingerprint className="size-5" />,
    title: "Satu NIK, satu akun",
    body: "Mencegah akun ganda, termasuk dari orang yang pernah diblokir karena tidak mengembalikan barang.",
  },
  {
    icon: <EyeOff className="size-5" />,
    title: "Data KTP tidak ditampilkan",
    body: "Pengguna lain hanya melihat nama depanmu dan tanda “Terverifikasi”. NIK dan foto KTP tidak pernah ditunjukkan.",
  },
  {
    icon: <Lock className="size-5" />,
    title: "Foto aman",
    body: "Di aplikasi asli, foto dikirim terenkripsi ke mitra eKYC lalu dihapus otomatis. Di prototipe ini foto hanya tersimpan di browser-mu.",
  },
];

/** Real KYC (F6.2): what actually happens to the photos (PRD §7.2, UU PDP). */
export const REAL_PRIVACY =
  "Foto KTP dan selfie dikirim lewat koneksi terenkripsi, disimpan terenkripsi, dan hanya dibuka admin peninjau (setiap akses tercatat). Fotonya dihapus otomatis setelah verifikasi diputuskan; yang disimpan hanya status dan NIK tersamar.";

export function IntroStep({ user, onStart, onSkip, notice, real = false }: { user: User; onStart: () => void; onSkip?: () => void; notice?: ReactNode; real?: boolean }) {
  const reasons = real ? REASONS.map((r) => (r.title === "Foto aman" ? { ...r, body: REAL_PRIVACY } : r)) : REASONS;
  return (
    <section aria-labelledby="verif-intro" className="animate-fade-up">
      <h1 id="verif-intro" className="text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">
        Verifikasi identitas
      </h1>
      <p className="mt-2 text-body text-smoke">
        Hai {publicName(user)},{" "}
        {real
          ? "cukup sekali: foto KTP, lalu selfie sambil memegang KTP. Admin meninjau paling lambat 1×24 jam, setelah itu kamu bisa menyewa dan menyewakan."
          : "cukup sekali dan ±1 menit: foto KTP, lalu selfie sambil memegang KTP. Setelah itu kamu bisa menyewa dan menyewakan."}
      </p>

      {notice && <div className="mt-5">{notice}</div>}

      <ul className="mt-6 space-y-5">
        {reasons.map((r) => (
          <li key={r.title} className="flex gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-soft-gray text-ink">{r.icon}</span>
            <span className="min-w-0">
              <span className="block text-body font-semibold text-ink">{r.title}</span>
              <span className="mt-0.5 block text-body-sm text-smoke">{r.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <Notice tone="outline" title="Siapkan dulu" className="mt-6">
        KTP asli (bukan fotokopi), tempat yang cukup terang, dan izinkan akses kamera saat diminta.
      </Notice>

      <div className="mt-6 space-y-3">
        <Button size="lg" block onClick={onStart}>
          Mulai verifikasi <ArrowRight className="size-4" />
        </Button>
        {onSkip && <SkipDemoButton onSkip={onSkip} />}
      </div>
    </section>
  );
}

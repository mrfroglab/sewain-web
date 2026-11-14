"use client";

import { CalendarX, Clock, Hourglass, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/Layout";
import { rupiah } from "@/lib/format";
import { useAppStore } from "@/lib/store";

function Rule({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-soft-gray text-ink">{icon}</span>
      <div className="min-w-0">
        <p className="text-body-sm font-semibold text-ink">{title}</p>
        <div className="mt-0.5 text-body-sm text-smoke">{children}</div>
      </div>
    </div>
  );
}

/** id="aturan": the defaults every new listing starts with (PRD 6 #5, #9; 9.3). Set per listing in the form. */
export function RulesExplainer() {
  const r = useAppStore((s) => s.collateralRules);
  return (
    <section id="aturan" className="scroll-mt-24">
      <SectionHeading
        title="Aturan default"
        description="Berlaku otomatis untuk listing baru. Semuanya bisa kamu ubah per barang saat membuat atau mengedit listing."
        href="/bantuan#jaminan"
        linkLabel="Pelajari"
      />
      <div className="grid gap-x-8 gap-y-6 rounded-card border border-border-gray p-4 sm:p-6 md:grid-cols-2">
        <Rule icon={<ShieldCheck className="size-5" />} title="Jaminan: titip kartu identitas">
          <p>Default-nya KTM atau SIM, bukan e-KTP. Untuk barang mahal, sistem menyarankan jaminan yang sepadan:</p>
          <ul className="mt-2 space-y-1 text-caption text-graphite">
            <li>• Di bawah {rupiah(r.lowMax)}: cukup titip identitas</li>
            <li>
              • {rupiah(r.lowMax)}–{rupiah(r.midMax)}: identitas + deposit {r.midDepositPercent}%
            </li>
            <li>
              • Di atas {rupiah(r.midMax)}: deposit {r.highDepositPercent}% atau jaminan senilai
            </li>
            <li>• Kendaraan: identitas + deposit {r.vehicleDepositPercent}% atau BPKB</li>
          </ul>
          <p className="mt-2 text-caption">Kalau kamu pasang di bawah saran, muncul peringatan, tapi keputusan tetap di kamu.</p>
        </Rule>
        <Rule icon={<Clock className="size-5" />} title="Denda telat = tarif harian">
          Dihitung per hari keterlambatan, paling banyak 100% nilai barang. Angka dan batasnya bisa kamu ubah.
        </Rule>
        <Rule icon={<CalendarX className="size-5" />} title="Batal gratis lebih dari 24 jam sebelumnya">
          Penyewa bebas membatalkan kalau masih lebih dari 24 jam sebelum serah terima. Kamu bisa menulis kebijakan sendiri.
        </Rule>
        <Rule icon={<Hourglass className="size-5" />} title="Request berlaku 24 jam">
          Request yang tidak kamu respons dalam 24 jam otomatis kadaluarsa, supaya penyewa bisa cari barang lain.
        </Rule>
      </div>
      <p className="mt-3 text-caption text-smoke">
        Atur jaminan, denda, pembatalan, dan syarat khusus di langkah 4–5 saat{" "}
        <Link href="/penyedia/barang/baru" className="font-medium text-ink underline underline-offset-2">
          membuat listing
        </Link>
        .
      </p>
    </section>
  );
}

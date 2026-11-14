import { ArrowRight } from "lucide-react";
import Link from "next/link";

const PRINCIPLES = [
  { title: "Mediator, bukan hakim", body: "Sewain menilai bukti dan memberi rekomendasi tertulis. Sewain bukan pengadilan dan bukan penjamin kerugian." },
  { title: "Bukti dulu, opini belakangan", body: "Yang dipakai: foto berstempel waktu, chat di Sewain, jaminan yang tercatat, dan kesepakatan sewa." },
  { title: "Selesaikan serendah mungkin", body: "Sebagian besar masalah beres di negosiasi antar pengguna, tanpa perlu admin." },
  { title: "Jujur soal batas", body: "Saat pilot, daya paksa Sewain adalah jaminan yang dipegang penyedia, reputasi, strike, suspend, dan blacklist NIK." },
];

/** PRD 11.1 platform principles. */
export function Principles() {
  return (
    <section className="rounded-card bg-soft-gray p-4 sm:p-5">
      <h2 className="text-body-lg font-semibold text-ink">Cara Sewain menengahi</h2>
      <ul className="mt-3 space-y-3">
        {PRINCIPLES.map((p) => (
          <li key={p.title}>
            <p className="text-body-sm font-semibold text-ink">{p.title}</p>
            <p className="mt-0.5 text-caption text-graphite">{p.body}</p>
          </li>
        ))}
      </ul>
      <Link href="/bantuan#sengketa" className="mt-2 inline-flex min-h-9 items-center gap-1 text-nav font-medium text-ink underline-offset-4 hover:underline">
        Alur sengketa lengkap <ArrowRight className="size-3.5" />
      </Link>
    </section>
  );
}

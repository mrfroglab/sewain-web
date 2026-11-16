import { FileWarning } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container, Notice } from "@/components/ui/Layout";

// Shared frame for /syarat and /privasi: version + date on top, an unmistakable "draft" banner, a short table of
// contents and numbered sections. The copy is a skeleton for the legal consultant (PRD §12.4), not final text.

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

export function LegalDoc({ title, version, date, intro, sections, other }: { title: string; version: string; date: string; intro: ReactNode; sections: LegalSection[]; other: { href: string; label: string } }) {
  return (
    <Container narrow className="pb-10 pt-5 lg:pt-10">
      <p className="text-caption text-smoke">
        Versi <span className="font-semibold text-ink tabular-nums">{version}</span> · Diperbarui {date}
      </p>
      <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink lg:text-[32px]">{title}</h1>

      <Notice tone="ink" icon={<FileWarning className="size-5" />} title="Draf, menunggu review konsultan hukum" className="mt-5">
        Ini kerangka isi, bukan dokumen hukum yang berlaku. Isinya masih bisa berubah total setelah ditinjau konsultan hukum, dan belum
        mengikat siapa pun. Versi final akan diumumkan sebelum Sewain dibuka untuk umum, dan kamu akan diminta menyetujuinya lagi.
      </Notice>

      <div className="mt-6 text-body text-graphite">{intro}</div>

      <nav aria-label="Daftar isi" className="mt-6 rounded-[12px] bg-soft-gray p-4">
        <p className="text-caption font-semibold uppercase tracking-[0.08em] text-ink">Daftar isi</p>
        <ol className="mt-2 space-y-1.5 text-body-sm">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-graphite hover:text-ink">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((s, i) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-judul`} className="scroll-mt-[80px] border-t border-border-gray py-7 first-of-type:border-t-0">
          <h2 id={`${s.id}-judul`} className="text-[20px] font-semibold leading-tight tracking-[-0.5px] text-ink">
            {i + 1}. {s.title}
          </h2>
          <div className="mt-3 space-y-3 text-body text-graphite">{s.body}</div>
        </section>
      ))}

      <p className="border-t border-border-gray pt-6 text-body-sm text-smoke">
        Lihat juga{" "}
        <Link href={other.href} className="font-medium text-ink underline underline-offset-2">
          {other.label}
        </Link>{" "}
        dan{" "}
        <Link href="/bantuan" className="font-medium text-ink underline underline-offset-2">
          Cara kerja & bantuan
        </Link>
        . Pertanyaan: <a href="mailto:halo@sewain.me" className="font-medium text-ink underline underline-offset-2">halo@sewain.me</a>.
      </p>
    </Container>
  );
}

/** Bulleted list in the help-page style. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-ink" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Open question for the legal review, visible in the draft so nobody mistakes it for a decision. */
export function ToReview({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[10px] border border-dashed border-border-gray px-3 py-2 text-body-sm text-smoke">
      <span className="font-semibold text-ink">Perlu dicek konsultan: </span>
      {children}
    </p>
  );
}

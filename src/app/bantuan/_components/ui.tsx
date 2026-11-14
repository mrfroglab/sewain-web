import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { Notice } from "@/components/ui/Layout";
import { cn } from "@/components/ui/cn";
import { HELP_SECTIONS, type HelpSectionId } from "./toc";

// Small typographic building blocks for the help page. Calm and readable: whitespace and hairlines, no boxes.

/** Longer titles than the short nav labels. */
const SECTION_TITLES: Partial<Record<HelpSectionId, string>> = {
  "foto-bukti": "Foto bukti kondisi",
  sengketa: "Penyelesaian sengketa",
  aman: "Tips aman bertransaksi",
  verifikasi: "Verifikasi identitas",
  larangan: "Barang yang dilarang",
  kendaraan: "Kendaraan & barang berisiko tinggi",
  syarat: "Syarat & ketentuan (ringkas)",
};

export function HelpSection({ id, lead, children }: { id: HelpSectionId; lead?: ReactNode; children: ReactNode }) {
  const title = SECTION_TITLES[id] ?? HELP_SECTIONS.find((s) => s.id === id)?.label ?? id;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-[124px] border-t border-border-gray py-8 first:border-t-0 first:pt-2 lg:py-10">
      <h2 id={`${id}-title`} className="text-[20px] font-semibold leading-tight tracking-[-0.5px] text-ink sm:text-section-heading">
        {title}
      </h2>
      {lead && <p className="mt-2 max-w-2xl text-body text-smoke">{lead}</p>}
      <div className="mt-5 space-y-6 text-body text-graphite">{children}</div>
    </section>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-2.5 text-body-lg font-semibold text-ink">{children}</h3>;
}

/** Bulleted list with small ink dots. */
export function Bullets({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-ink" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps with outlined number circles (same language as the home "Cara kerja" row). */
export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border border-ink text-micro font-semibold text-ink">
            {i + 1}
          </span>
          <span className="min-w-0 pt-px">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** Term → explanation rows separated by hairlines (used for collateral types, dispute layers, cases). */
export function Rows({ rows, termWidth = "sm:grid-cols-[200px_minmax(0,1fr)]" }: { rows: { term: ReactNode; detail: ReactNode; tag?: ReactNode }[]; termWidth?: string }) {
  return (
    <dl className="divide-y divide-border-gray border-y border-border-gray">
      {rows.map((r, i) => (
        <div key={i} className={cn("grid gap-1 py-3 sm:gap-6", termWidth)}>
          <dt className="flex items-start gap-2 font-semibold text-ink">
            {r.tag}
            <span className="min-w-0">{r.term}</span>
          </dt>
          <dd className="min-w-0 text-graphite">{r.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Marks text that the real product will replace with reviewed legal copy. */
export function LegalDraftNote({ children }: { children?: ReactNode }) {
  return (
    <Notice tone="outline" icon={<FileText className="size-4" />} title="Teks prototipe, bukan dokumen hukum">
      {children ?? "Versi resminya akan disusun bersama konsultan hukum sebelum Sewain dibuka untuk umum."}
    </Notice>
  );
}

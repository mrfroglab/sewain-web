import { SectionHeading } from "@/components/ui/Layout";

const STEPS = [
  {
    title: "Cari dalam radius",
    text: "Atur titik kos atau kampus dan radiusnya. Yang muncul hanya barang yang penyedianya juga mau menjangkau kamu.",
  },
  {
    title: "Ajukan & sepakati",
    text: "Pilih tanggal, cara serah terima, dan jaminan. Ringkasan kesepakatan disetujui kedua pihak sebelum barang berpindah tangan.",
  },
  {
    title: "Serah terima dengan foto",
    text: "Barang dan jaminan difoto saat diambil dan saat kembali, lengkap dengan waktunya. Jadi nggak ada saling tuduh.",
  },
];

/** Compact 3-step row. Deliberately unboxed: whitespace and a hairline rule, nothing more. */
export function HowItWorks() {
  return (
    <section aria-labelledby="cara-kerja-title">
      <SectionHeading title={<span id="cara-kerja-title">Cara kerja</span>} href="/bantuan#cara-kerja" linkLabel="Selengkapnya" />
      <ol className="grid gap-6 border-t border-border-gray pt-5 sm:grid-cols-3 sm:gap-8">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3.5">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border border-ink text-nav font-semibold text-ink">
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-body font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 text-body-sm text-smoke">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/Layout";
import { CaraKerja, FotoBukti, Jaminan, Sengketa } from "./_components/GuideSections";
import { HelpNav } from "./_components/HelpNav";
import { Aman, Kendaraan, Komisi, Larangan, Privasi, Syarat, Verifikasi, Kontak } from "./_components/PolicySections";

export const metadata: Metadata = {
  title: "Cara kerja & bantuan",
  description: "Cara sewa dan menyewakan di Sewain: jaminan, foto bukti kondisi, penyelesaian sengketa, tips aman, komisi, dan barang terlarang.",
};

/**
 * /bantuan — calm, readable help page. Every section has a stable anchor (see _components/toc.ts).
 * Mostly static; the admin-configurable numbers (commission, collateral thresholds) are read live from the store.
 */
export default function BantuanPage() {
  return (
    <Container>
      <PageHeader title="Cara kerja & bantuan" subtitle="Semua yang perlu kamu tahu soal sewa-menyewa di Sewain, dari jaminan sampai sengketa." />
      <div className="mt-2 lg:mt-6 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
        <HelpNav />
        <div className="mt-6 min-w-0 max-w-3xl lg:mt-0">
          <CaraKerja />
          <Jaminan />
          <FotoBukti />
          <Sengketa />
          <Aman />
          <Verifikasi />
          <Komisi />
          <Larangan />
          <Kendaraan />
          <Syarat />
          <Privasi />
          <Kontak />
        </div>
      </div>
    </Container>
  );
}

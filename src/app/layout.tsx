import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { DemoDock } from "@/components/shell/DemoDock";
import { Footer } from "@/components/shell/Footer";
import { Header } from "@/components/shell/Header";
import { StoreBoot } from "@/components/shell/StoreBoot";
import { TabBar } from "@/components/shell/TabBar";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sewain.hallojanu.me"),
  title: { default: "Sewain — sewa barang dekat kos, tanpa beli", template: "%s · Sewain" },
  description: "Platform sewa-menyewa barang antar warga, mulai dari kampus UGM. Identitas terverifikasi, jaminan tercatat, foto bukti kondisi, dan mediasi sengketa.",
  applicationName: "Sewain",
  appleWebApp: { capable: true, title: "Sewain", statusBarStyle: "default" },
  openGraph: { title: "Sewain", description: "Sewa barang dekat kos, tanpa beli.", locale: "id_ID", type: "website" },
  // Prototype: keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="flex min-h-dvh flex-col bg-white">
        <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:rounded-control focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          Lewati ke konten
        </a>
        <StoreBoot />
        <Header />
        <main id="konten" className="pb-tabbar flex-1">
          {children}
        </main>
        <Footer />
        <TabBar />
        <DemoDock />
        <Toaster />
      </body>
    </html>
  );
}

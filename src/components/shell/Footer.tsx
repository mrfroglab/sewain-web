import { Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "../ui/Logo";

const COLS = [
  { title: "Sewain", links: [["Cara kerja", "/bantuan#cara-kerja"], ["Cari barang", "/cari"], ["Papan permintaan", "/papan"], ["Sewakan barang", "/penyedia"]] },
  { title: "Bantuan", links: [["Jaminan & deposit", "/bantuan#jaminan"], ["Foto bukti kondisi", "/bantuan#foto-bukti"], ["Penyelesaian sengketa", "/bantuan#sengketa"], ["Tips anti-penipuan", "/bantuan#aman"]] },
  { title: "FAQ", links: [["Kenapa verifikasi KTP?", "/bantuan#verifikasi"], ["Berapa komisinya?", "/bantuan#komisi"], ["Barang yang dilarang", "/bantuan#larangan"], ["Sewa kendaraan", "/bantuan#kendaraan"]] },
  { title: "Sumber", links: [["Syarat & ketentuan", "/bantuan#syarat"], ["Kebijakan privasi", "/bantuan#privasi"], ["Akun demo", "/masuk"], ["Panel admin", "/admin"]] },
] as const;

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

/** Footer (DESIGN.md › Footer): brand block + 4 compact link columns, payment marks bottom-right. */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-border-gray bg-white">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.3fr_2fr] lg:px-8">
        <div className="max-w-xs">
          <span className="flex items-center gap-2 text-[17px] font-bold tracking-[-0.03em]">
            <LogoMark size={26} /> Sewain
          </span>
          <p className="mt-3 text-body-sm text-smoke">
            Sewa-menyewa barang antar warga, mulai dari kampus. Identitas terverifikasi, jaminan tercatat, dan foto bukti kondisi di setiap transaksi.
          </p>
          <div className="mt-4 flex gap-2 text-ink">
            <a href="/bantuan#kontak" aria-label="Instagram Sewain" className="grid size-8 place-items-center rounded-full border border-border-gray hover:border-ink">
              <InstagramMark />
            </a>
            <a href="/bantuan#kontak" aria-label="WhatsApp Sewain" className="grid size-8 place-items-center rounded-full border border-border-gray hover:border-ink">
              <MessageCircle className="size-4" />
            </a>
            <a href="mailto:halo@sewain.me" aria-label="Email Sewain" className="grid size-8 place-items-center rounded-full border border-border-gray hover:border-ink">
              <Mail className="size-4" />
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="text-caption font-semibold uppercase tracking-[0.08em] text-ink">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-caption text-smoke hover:text-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 border-t border-border-gray px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-caption text-ash">© 2026 Sewain · Tim Kurakuraninja UGM · Prototipe untuk Dinamik 21. Pembayaran, OTP, dan eKYC disimulasikan.</p>
        <div className="flex flex-wrap gap-1.5" aria-label="Metode pembayaran (simulasi)">
          {["QRIS", "Virtual Account", "E-wallet", "Tunai"].map((m) => (
            <span key={m} className="rounded-[6px] border border-border-gray px-2 py-1 text-micro font-semibold text-graphite">
              {m}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}

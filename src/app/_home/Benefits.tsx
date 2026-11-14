import { Camera, ClipboardCheck, IdCard, Scale, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/ui/cn";

type Benefit = { icon: LucideIcon; title: string; text: string; href: string };

const BENEFITS: Benefit[] = [
  { icon: IdCard, title: "Identitas terverifikasi", text: "Penyewa & penyedia wajib cek KTP + selfie.", href: "/bantuan#verifikasi" },
  { icon: ClipboardCheck, title: "Jaminan tercatat", text: "Titip KTM atau deposit, difoto saat serah terima.", href: "/bantuan#jaminan" },
  { icon: Camera, title: "Foto bukti kondisi", text: "Difoto saat diambil & dikembalikan, lengkap dengan waktunya.", href: "/bantuan#foto-bukti" },
  { icon: Scale, title: "Mediasi sengketa", text: "Ada masalah? Admin bantu menengahi.", href: "/bantuan#sengketa" },
];

/**
 * Benefits strip (DESIGN.md › Benefits Strip): one white panel, thin border, 12px radius,
 * four groups with vertical dividers on desktop and a 2×2 grid on phones/tablets.
 */
export function Benefits() {
  return (
    <section aria-label="Kenapa aman sewa di Sewain" className="overflow-hidden rounded-benefit border border-border-gray bg-white">
      <ul className="grid grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, title, text, href }, i) => (
          <li
            key={title}
            className={cn(
              "border-border-gray",
              i < 2 && "border-b lg:border-b-0", // top row on the 2×2 grid
              i % 2 === 0 && "border-r", // left column on the 2×2 grid
              i === 1 && "lg:border-r", // keep the divider between groups 2 and 3 on desktop
            )}
          >
            <Link href={href} className="flex h-full flex-col gap-2.5 p-4 transition-colors hover:bg-soft-gray/60 sm:flex-row sm:items-start sm:gap-3 sm:p-5">
              <Icon className="size-6 shrink-0 text-ink" strokeWidth={1.5} aria-hidden />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-snug text-ink">{title}</span>
                <span className="mt-0.5 block text-caption text-smoke">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

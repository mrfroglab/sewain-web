import Link from "next/link";
import { cn } from "./cn";

/** Black circular "S" mark + "Sewain" wordmark (DESIGN.md › Header: circular mark followed by the wordmark). */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full bg-ink font-bold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.52, letterSpacing: "-0.04em" }}
    >
      S
    </span>
  );
}

export function Logo({ className, href = "/", size = 28 }: { className?: string; href?: string; size?: number }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 text-ink", className)} aria-label="Sewain — beranda">
      <LogoMark size={size} />
      <span className="text-[19px] font-bold tracking-[-0.03em]">Sewain</span>
    </Link>
  );
}

import { initials } from "@/lib/format";
import { cn } from "./cn";

/** Circular avatar. No customer photos in the prototype: soft-gray circle with initials. */
export function Avatar({ name, size = 36, className, dark }: { name: string; size?: number; className?: string; dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold", dark ? "bg-ink text-white" : "bg-soft-gray text-graphite", className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}

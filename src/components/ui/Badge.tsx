import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "white" | "soft" | "ink" | "outline" | "sale";

const tones: Record<Tone, string> = {
  // Best-seller style: small white pill with dark text (DESIGN.md › Best Seller Badge)
  white: "bg-white text-ink shadow-hairline",
  soft: "bg-soft-gray text-graphite",
  ink: "bg-ink text-white",
  outline: "border border-border-gray bg-white text-graphite",
  // Sale/discount only (DESIGN.md › rose reserved for discount metadata)
  sale: "bg-sale-rose text-sale-text",
};

export function Badge({ tone = "soft", icon, className, children }: { tone?: Tone; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-control px-2 text-micro font-medium", tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

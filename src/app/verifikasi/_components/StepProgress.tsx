import { cn } from "@/components/ui/cn";

export type VerifyStep = "intro" | "ktp" | "selfie" | "done";

const STEPS: { key: VerifyStep; label: string }[] = [
  { key: "intro", label: "Info" },
  { key: "ktp", label: "Foto KTP" },
  { key: "selfie", label: "Selfie" },
  { key: "done", label: "Selesai" },
];

/** Four-segment progress bar with labels. Monochrome: done/current = ink, upcoming = gray. */
export function StepProgress({ current }: { current: VerifyStep }) {
  const index = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label={`Langkah ${index + 1} dari ${STEPS.length}`}>
      {STEPS.map((s, i) => (
        <li key={s.key} aria-current={i === index ? "step" : undefined}>
          <span className={cn("block h-1 rounded-full transition-colors", i <= index ? "bg-ink" : "bg-image-gray")} />
          <span className={cn("mt-1.5 block truncate text-caption", i === index ? "font-semibold text-ink" : i < index ? "text-graphite" : "text-ash")}>
            {i + 1}. {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

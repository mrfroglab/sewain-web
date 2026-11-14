"use client";

import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** "Lewati (demo)" — present on every step (PRD 7.2). */
export function SkipDemoButton({ onSkip, disabled }: { onSkip: () => void; disabled?: boolean }) {
  return (
    <div>
      <Button variant="secondary" size="lg" block onClick={onSkip} disabled={disabled}>
        <FlaskConical className="size-4" /> Lewati (demo)
      </Button>
      <p className="mt-1.5 text-center text-caption text-ash">Langsung terverifikasi dengan NIK contoh. Hanya ada di mode demo.</p>
    </div>
  );
}

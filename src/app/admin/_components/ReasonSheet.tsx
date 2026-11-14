"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { chipClass } from "./AdminUi";

export const MIN_REASON = 5;

/** Preset reason chips + free text. Picking a chip fills the textarea (still editable). */
export function ReasonFields({
  value,
  onChange,
  presets,
  label = "Alasan",
  placeholder = "Tulis alasan singkat…",
  help,
}: {
  value: string;
  onChange: (v: string) => void;
  presets?: string[];
  label?: string;
  placeholder?: string;
  help?: ReactNode;
}) {
  return (
    <div>
      {presets && presets.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-caption font-medium text-smoke">Pilih cepat</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button key={p} type="button" aria-pressed={value === p} onClick={() => onChange(p)} className={chipClass(value === p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
      <TextArea label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} help={help} />
    </div>
  );
}

interface ReasonSheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  presets?: string[];
  initial?: string;
  label?: string;
  placeholder?: string;
  help?: ReactNode;
  confirmLabel: string;
  /** Extra content above the reason (summary of what will happen, a severity picker…). */
  children?: ReactNode;
  /** Return true to close the sheet (e.g. when the store action succeeded). */
  onConfirm: (reason: string) => boolean;
}

/** Bottom sheet asking for a reason before an admin action. State resets every time it opens. */
export function ReasonSheet(props: ReasonSheetProps) {
  return props.open ? <ReasonSheetBody {...props} /> : null;
}

function ReasonSheetBody({ onClose, title, description, presets, initial, label, placeholder, help, confirmLabel, children, onConfirm }: ReasonSheetProps) {
  const [reason, setReason] = useState(initial ?? "");
  const valid = reason.trim().length >= MIN_REASON;
  const submit = () => {
    if (valid && onConfirm(reason.trim())) onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button className="flex-1" disabled={!valid} onClick={submit}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {children}
        <ReasonFields value={reason} onChange={setReason} presets={presets} label={label} placeholder={placeholder} help={help ?? (valid ? undefined : `Minimal ${MIN_REASON} karakter. Alasan ini dicatat di log audit.`)} />
      </div>
    </Sheet>
  );
}

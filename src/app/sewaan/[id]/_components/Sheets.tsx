"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import type { Result } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import { Chip } from "./ActionBits";

interface ReasonSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** quick-pick reasons that fill the text box */
  reasons: string[];
  placeholder?: string;
  confirmLabel: string;
  note?: ReactNode;
  successMessage: string;
  onConfirm: (reason: string) => Result;
}

/** Bottom sheet asking for a reason (decline / cancel). Mounted only while open so the form resets. */
export function ReasonSheet(props: ReasonSheetProps) {
  if (!props.open) return null;
  return <ReasonSheetInner {...props} />;
}

function ReasonSheetInner({ onClose, title, description, reasons, placeholder, confirmLabel, note, successMessage, onConfirm }: ReasonSheetProps) {
  const [text, setText] = useState("");
  const reason = text.trim();
  const submit = () => {
    if (toastResult(onConfirm(reason), successMessage)) onClose();
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
            Kembali
          </Button>
          <Button className="flex-1" disabled={!reason} onClick={submit}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="mb-2 text-body-sm font-semibold text-ink">Pilih alasan</p>
      <div className="flex flex-wrap gap-2">
        {reasons.map((r) => (
          <Chip key={r} active={text === r} onClick={() => setText(r)}>
            {r}
          </Chip>
        ))}
      </div>
      <TextArea
        className="mt-4"
        label="Alasan"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder ?? "Tulis alasan singkat. Pihak lain akan melihatnya."}
        maxLength={240}
        help="Alasan tercatat di riwayat sewa dan chat."
      />
      {note && <div className="mt-4">{note}</div>}
    </Sheet>
  );
}

interface ConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  successMessage: string;
  onConfirm: () => Result;
}

/** Simple "are you sure" bottom sheet for irreversible steps (collateral returned / received). */
export function ConfirmSheet({ open, onClose, title, description, children, confirmLabel, successMessage, onConfirm }: ConfirmSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Belum
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (toastResult(onConfirm(), successMessage)) onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {children}
    </Sheet>
  );
}

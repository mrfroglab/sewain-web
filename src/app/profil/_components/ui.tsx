"use client";

import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** Section title row for the profile list ("Data diri", "Akun Toko", …). */
export function SectionTitle({ id, title, description, action }: { id?: string; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-body-lg font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-body-sm text-smoke">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Quiet "Ubah" text button with a ≥36px tap target. */
export function EditButton({ onClick, label = "Ubah" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="-mr-2 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-3 text-body-sm font-semibold text-ink hover:bg-soft-gray">
      <Pencil className="size-3.5" /> {label}
    </button>
  );
}

/** Bordered list container with hairline dividers (mobile settings-list style). */
export function ListBox({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-border-gray overflow-hidden rounded-card border border-border-gray", className)}>{children}</div>;
}

/** Label/value row. `stack` puts long values (bio) under the label. */
export function Row({ label, value, note, stack }: { label: ReactNode; value: ReactNode; note?: ReactNode; stack?: boolean }) {
  return (
    <div className={cn("px-4 py-3", stack ? "" : "flex items-start justify-between gap-4")}>
      <span className="shrink-0 text-body-sm text-smoke">{label}</span>
      <span className={cn("min-w-0 break-words text-body-sm text-ink", stack ? "mt-1 block" : "text-right")}>
        {value}
        {note && <span className="mt-0.5 block text-caption text-ash">{note}</span>}
      </span>
    </div>
  );
}

export const Empty = ({ children = "Belum diisi" }: { children?: ReactNode }) => <span className="text-ash">{children}</span>;

"use client";

// Large, thumb-friendly inputs for the listing wizard (persona Bu Tini: simple and clear).
// 16px text so phones don't zoom in on focus.

import { Minus, Plus } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { Help, Label } from "@/components/ui/Field";
import { number } from "@/lib/format";

const box =
  "flex h-12 w-full items-center rounded-[12px] border bg-white transition-colors focus-within:border-ink hover:border-ash";

/** Label + control + help/error, with an anchor id so the wizard can scroll to the first error. */
export function FieldShell({
  label,
  htmlFor,
  optional,
  help,
  error,
  anchor,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  optional?: boolean;
  help?: ReactNode;
  error?: string;
  anchor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} data-field={anchor} data-error={error ? "true" : undefined}>
      {label && (
        <Label htmlFor={htmlFor} optional={optional}>
          {label}
        </Label>
      )}
      {children}
      {error ? <Help error>{error}</Help> : help ? <Help>{help}</Help> : null}
    </div>
  );
}

/** Rupiah input with thousand separators ("25.000"). Value is a number or null (empty). */
export function MoneyInput({
  label,
  value,
  onChange,
  suffix,
  placeholder = "0",
  help,
  error,
  optional,
  anchor,
  className,
}: {
  label?: ReactNode;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  suffix?: string;
  placeholder?: string;
  help?: ReactNode;
  error?: string;
  optional?: boolean;
  anchor?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} optional={optional} help={help} error={error} anchor={anchor} className={className}>
      <div className={cn(box, error ? "border-sale-text" : "border-border-gray")}>
        <span className="pl-4 pr-1.5 text-body-lg font-medium text-smoke">Rp</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={!!error || undefined}
          placeholder={placeholder}
          value={value ? number(value) : ""}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
            onChange(digits ? Number(digits) : null);
          }}
          className="h-full min-w-0 flex-1 bg-transparent pr-3 text-body-lg font-semibold text-ink placeholder:font-normal placeholder:text-ash focus:outline-none"
        />
        {suffix && <span className="shrink-0 pr-4 text-body-sm text-smoke">{suffix}</span>}
      </div>
    </FieldShell>
  );
}

/** − value + stepper for small integers (days, stock, percent). Empty allowed when `optional`. */
export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  emptyLabel = "Bebas",
  help,
  error,
  optional,
  anchor,
  className,
}: {
  label?: ReactNode;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  /** shown as placeholder when optional and empty */
  emptyLabel?: string;
  help?: ReactNode;
  error?: string;
  optional?: boolean;
  anchor?: string;
  className?: string;
}) {
  const id = useId();
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const dec = () => {
    if (value == null) return;
    const n = value - step;
    onChange(optional && n < min ? null : clamp(n));
  };
  const inc = () => onChange(value == null ? min : clamp(value + step));
  return (
    <FieldShell label={label} htmlFor={id} optional={optional} help={help} error={error} anchor={anchor} className={className}>
      <div className={cn(box, "justify-between px-1.5", error ? "border-sale-text" : "border-border-gray")}>
        <button
          type="button"
          onClick={dec}
          disabled={value == null || (!optional && value <= min)}
          aria-label="Kurangi"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-soft-gray text-ink hover:bg-image-gray disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
          <input
            id={id}
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={!!error || undefined}
            placeholder={optional ? emptyLabel : String(min)}
            value={value ?? ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
              onChange(digits ? Math.min(max, Number(digits)) : optional ? null : min);
            }}
            className={cn(
              value == null ? "w-16" : "w-10",
              "min-w-0 bg-transparent text-center text-body-lg font-semibold text-ink placeholder:text-body placeholder:font-normal placeholder:text-ash focus:outline-none",
            )}
          />
          {suffix && value != null && <span className="text-body-sm text-smoke">{suffix}</span>}
        </div>
        <button
          type="button"
          onClick={inc}
          disabled={value != null && value >= max}
          aria-label="Tambah"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-soft-gray text-ink hover:bg-image-gray disabled:opacity-30"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </FieldShell>
  );
}

/** Big single-line text input (16px). */
export function BigText({
  label,
  value,
  onChange,
  placeholder,
  help,
  error,
  optional,
  anchor,
  maxLength,
  className,
  counter,
}: {
  label?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  help?: ReactNode;
  error?: string;
  optional?: boolean;
  anchor?: string;
  maxLength?: number;
  className?: string;
  counter?: boolean;
}) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} optional={optional} help={help} error={error} anchor={anchor} className={className}>
      <div className={cn(box, error ? "border-sale-text" : "border-border-gray")}>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={!!error || undefined}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-body-lg text-ink placeholder:text-ash focus:outline-none"
        />
        {counter && maxLength && (
          <span className="shrink-0 pr-4 text-caption text-ash">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

/** Big multi-line text input (16px). */
export function BigTextArea({
  label,
  value,
  onChange,
  placeholder,
  help,
  error,
  optional,
  anchor,
  maxLength,
  rows = 4,
  className,
}: {
  label?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  help?: ReactNode;
  error?: string;
  optional?: boolean;
  anchor?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
}) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} optional={optional} help={help} error={error} anchor={anchor} className={className}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error || undefined}
        className={cn(
          "block w-full resize-y rounded-[12px] border bg-white px-4 py-3 text-body-lg text-ink placeholder:text-ash transition-colors hover:border-ash focus:border-ink focus:outline-none",
          error ? "border-sale-text" : "border-border-gray",
        )}
      />
    </FieldShell>
  );
}

/** Row of quick-fill pills under a text field. */
export function QuickPicks({ items, active, onPick, className = "mt-2" }: { items: string[]; active?: string; onPick: (v: string) => void; className?: string }) {
  return (
    <div className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0", className)}>
      {items.map((it) => (
        <button
          key={it}
          type="button"
          onClick={() => onPick(it)}
          aria-pressed={active === it}
          className={cn(
            "inline-flex h-9 shrink-0 items-center rounded-control border px-3.5 text-nav font-medium transition-colors",
            active === it ? "border-ink bg-ink text-white" : "border-border-gray bg-white text-ink hover:border-ink",
          )}
        >
          {it}
        </button>
      ))}
    </div>
  );
}

/** Section block inside a step: small heading + content, separated by whitespace. */
export function Block({ title, description, children, className }: { title?: ReactNode; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("border-t border-border-gray pt-6 first:border-t-0 first:pt-0", className)}>
      {title && <h3 className="text-body-lg font-semibold text-ink">{title}</h3>}
      {description && <p className="mt-1 text-body-sm text-smoke">{description}</p>}
      <div className={cn(title || description ? "mt-4" : "", "space-y-5")}>{children}</div>
    </section>
  );
}

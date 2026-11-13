"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "./cn";

const control =
  "w-full rounded-[10px] border border-border-gray bg-white px-3.5 text-body text-ink placeholder:text-ash transition-colors hover:border-ash focus:border-ink focus:outline-none disabled:bg-soft-gray disabled:text-ash";

export function Label({ children, htmlFor, optional, className }: { children: ReactNode; htmlFor?: string; optional?: boolean; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-body-sm font-semibold text-ink", className)}>
      {children}
      {optional && <span className="ml-1 font-normal text-ash">(opsional)</span>}
    </label>
  );
}

export function Help({ children, error }: { children: ReactNode; error?: boolean }) {
  return <p className={cn("mt-1.5 text-caption", error ? "text-sale-text" : "text-smoke")}>{children}</p>;
}

interface FieldChrome {
  label?: ReactNode;
  help?: ReactNode;
  error?: string | false | null;
  optional?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function TextField({ label, help, error, optional, prefix, suffix, className, id, ...rest }: FieldChrome & ComponentProps<"input">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={fid} optional={optional}>
          {label}
        </Label>
      )}
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-3.5 text-body text-smoke">{prefix}</span>}
        <input id={fid} aria-invalid={!!error || undefined} className={cn(control, "h-11", prefix ? "pl-10" : "", suffix ? "pr-12" : "", error && "border-sale-text")} {...rest} />
        {suffix && <span className="pointer-events-none absolute right-3.5 text-body-sm text-smoke">{suffix}</span>}
      </div>
      {error ? <Help error>{error}</Help> : help ? <Help>{help}</Help> : null}
    </div>
  );
}

export function TextArea({ label, help, error, optional, className, id, ...rest }: FieldChrome & ComponentProps<"textarea">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={fid} optional={optional}>
          {label}
        </Label>
      )}
      <textarea id={fid} aria-invalid={!!error || undefined} className={cn(control, "min-h-24 py-2.5", error && "border-sale-text")} {...rest} />
      {error ? <Help error>{error}</Help> : help ? <Help>{help}</Help> : null}
    </div>
  );
}

export function Select({ label, help, error, optional, className, id, children, ...rest }: FieldChrome & ComponentProps<"select">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={fid} optional={optional}>
          {label}
        </Label>
      )}
      <select id={fid} className={cn(control, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23777%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_14px_center] bg-no-repeat pr-9")} {...rest}>
        {children}
      </select>
      {error ? <Help error>{error}</Help> : help ? <Help>{help}</Help> : null}
    </div>
  );
}

/** Pill-style toggle switch. */
export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", disabled && "cursor-not-allowed opacity-50")}>
      <span>
        <span className="block text-body-sm font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-caption text-smoke">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-10 shrink-0 rounded-control transition-colors", checked ? "bg-ink" : "bg-image-gray")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-soft transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

/** Selectable card (radio/checkbox look) used for collateral, handover, account type… */
export function ChoiceCard({
  selected,
  onClick,
  title,
  description,
  icon,
  disabled,
  multi,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  multi?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-[12px] border bg-white p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        selected ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-border-gray hover:border-ash",
        className,
      )}
    >
      {icon && <span className="mt-0.5 shrink-0 text-ink">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-caption text-smoke">{description}</span>}
      </span>
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center border", multi ? "rounded-[4px]" : "rounded-full", selected ? "border-ink bg-ink" : "border-ash")}>
        {selected && <span className={cn("bg-white", multi ? "h-1.5 w-1.5 rounded-[1px]" : "size-1.5 rounded-full")} />}
      </span>
    </button>
  );
}

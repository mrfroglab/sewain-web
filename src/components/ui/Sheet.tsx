"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

/**
 * Modal that is a bottom sheet on phones and a centered dialog on desktop.
 * Closes on Escape / backdrop click. Locks body scroll while open.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  dismissible?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissible && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, dismissible]);

  if (!open || typeof document === "undefined") return null;
  const widths = { sm: "lg:max-w-sm", md: "lg:max-w-lg", lg: "lg:max-w-2xl", full: "lg:max-w-4xl" } as const;
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center lg:items-center lg:p-6" role="presentation">
      <div className="absolute inset-0 bg-black/40" onClick={() => dismissible && onClose()} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn(
          "animate-fade-up relative flex max-h-[92dvh] w-full flex-col rounded-t-[20px] bg-white shadow-floating outline-none lg:rounded-[16px]",
          widths[size],
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-image-gray lg:hidden" aria-hidden />
        {(title || dismissible) && (
          <div className="flex items-start gap-3 px-5 pb-2 pt-3 lg:pt-5">
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-[17px] font-semibold tracking-[-0.2px] text-ink">{title}</h2>}
              {description && <p className="mt-1 text-body-sm text-smoke">{description}</p>}
            </div>
            {dismissible && (
              <button type="button" onClick={onClose} aria-label="Tutup" className="-mr-1 grid size-8 place-items-center rounded-full text-graphite hover:bg-soft-gray">
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-border-gray px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

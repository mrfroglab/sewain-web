"use client";

import { create } from "zustand";

export type ToastKind = "info" | "success" | "error";
export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (message, kind = "info") => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-2), { id, message, kind }] });
    window.setTimeout(() => get().dismiss(id), kind === "error" ? 5000 : 3200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Fire-and-forget toast from anywhere in client code. */
export const toast = (message: string, kind: ToastKind = "info") => useToasts.getState().push(message, kind);

/** Show a store Result as a toast; returns true when ok. */
export function toastResult(result: { ok: true } | { ok: false; error: string }, successMessage?: string): boolean {
  if (result.ok) {
    if (successMessage) toast(successMessage, "success");
    return true;
  }
  toast(result.error, "error");
  return false;
}

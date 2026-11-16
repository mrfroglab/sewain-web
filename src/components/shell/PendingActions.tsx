"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { useSyncExternalStore } from "react";
import { retryOutboxNow, useOutbox } from "@/lib/outbox";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Small pill under the header while actions wait for the connection (F6.9). Hidden when sending goes fine. */
export function PendingActions() {
  const { count, waiting } = useOutbox();
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (count === 0 || (online && !waiting)) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+64px)] z-[550] flex justify-center px-4">
      <button
        type="button"
        onClick={retryOutboxNow}
        data-testid="pending-actions"
        className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-caption font-medium text-white shadow-floating"
      >
        {online ? <RefreshCw className="size-3.5 shrink-0" aria-hidden /> : <CloudOff className="size-3.5 shrink-0" aria-hidden />}
        <span role="status" className="truncate">
          {count} aksi menunggu dikirim{online ? " · coba lagi" : " · lagi offline"}
        </span>
      </button>
    </div>
  );
}

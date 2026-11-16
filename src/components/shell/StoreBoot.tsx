"use client";

import { useEffect } from "react";
import { bootSession } from "@/lib/session";
import { bootStore } from "@/lib/store";

/** Loads demo data + tab session from the browser, then registers the service worker (PWA). */
export function StoreBoot() {
  useEffect(() => {
    // Session first: the (v2, per-viewer) snapshot is fetched with the signed-in account's token.
    void bootSession().then(bootStore);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import { usePhotoSrc } from "@/lib/photos";
import { cn } from "../ui/cn";

/** Image that understands "idb:" sources and degrades to a soft-gray placeholder. Fills its parent. */
export function ListingImage({ src, alt, className, priority, fit = "cover" }: { src?: string; alt: string; className?: string; priority?: boolean; fit?: "cover" | "contain" }) {
  const url = usePhotoSrc(src);
  const [failed, setFailed] = useState(false);
  if (url === undefined) return <div className={cn("absolute inset-0 animate-pulse bg-soft-gray", className)} aria-hidden />;
  if (url === null || failed)
    return (
      <div className={cn("absolute inset-0 grid place-items-center bg-soft-gray text-ash", className)} role="img" aria-label={alt}>
        <ImageOff className="size-6" />
      </div>
    );
  return (
    <img
      src={url}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      onError={() => setFailed(true)}
      className={cn("absolute inset-0 size-full", fit === "cover" ? "object-cover" : "object-contain", className)}
    />
  );
}

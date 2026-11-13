"use client";

import dynamic from "next/dynamic";
import type { GeoPoint } from "@/lib/types";
import { cn } from "../ui/cn";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  /** short pin text, e.g. "Rp25rb" */
  label: string;
  active?: boolean;
}

export interface MapViewProps {
  center: GeoPoint;
  /** search radius circle around center (renter radius) */
  radiusKm?: number;
  markers?: MapMarker[];
  onMarkerClick?: (id: string) => void;
  /** enables click/drag to choose a point (listing location picker) */
  onPick?: (p: GeoPoint) => void;
  pickPoint?: GeoPoint;
  /** provider reach circle around pickPoint */
  pickRadiusKm?: number;
  zoom?: number;
  className?: string;
  /** fit the view to radiusKm (default true) */
  fit?: boolean;
}

const Inner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-soft-gray" />,
});

/**
 * Leaflet + OpenStreetMap (CARTO light tiles for a neutral look). Client-only.
 * Give it a sized parent: <div className="h-80"><MapView …/></div>.
 * Listing pins are approximate (area centroid + jitter) — never precise addresses (FR-S6).
 */
export function MapView(props: MapViewProps) {
  return (
    <div className={cn("relative isolate size-full overflow-hidden rounded-card bg-soft-gray", props.className)}>
      <Inner {...props} className="size-full" />
    </div>
  );
}

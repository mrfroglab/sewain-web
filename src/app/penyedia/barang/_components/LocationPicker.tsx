"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";
import { MapView } from "@/components/map/MapView";
import { Select } from "@/components/ui/Field";
import { AREAS, AREA_BY_ID } from "@/lib/data/areas";
import { distanceKm } from "@/lib/geo";
import type { AreaId, GeoPoint } from "@/lib/types";

const nearestArea = (p: GeoPoint): AreaId => AREAS.reduce((best, a) => (distanceKm(p, a) < distanceKm(p, AREA_BY_ID[best]) ? a.id : best), AREAS[0].id);

/**
 * Item location (FR-S2): area select + tap/drag on the map, with the provider's reach circle.
 * The map only re-centers when the area changes, so picking a point never makes it jump.
 */
export function LocationPicker({
  areaId,
  point,
  radiusKm,
  onArea,
  onPoint,
}: {
  areaId: AreaId;
  point: GeoPoint;
  radiusKm: number;
  onArea: (a: AreaId) => void;
  onPoint: (p: GeoPoint, area: AreaId) => void;
}) {
  const [center, setCenter] = useState<GeoPoint>(point);
  return (
    <div className="space-y-3">
      <Select
        label="Area barang"
        value={areaId}
        onChange={(e) => {
          const id = e.target.value as AreaId;
          const a = AREA_BY_ID[id];
          setCenter({ lat: a.lat, lng: a.lng });
          onArea(id);
        }}
        help="Penyewa hanya melihat nama area dan perkiraan jarak, bukan titik persisnya."
      >
        {AREAS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </Select>
      <div className="h-64 sm:h-72">
        <MapView center={center} zoom={radiusKm > 6 ? 12 : 14} onPick={(p) => onPoint(p, nearestArea(p))} pickPoint={point} pickRadiusKm={radiusKm} />
      </div>
      <p className="flex items-start gap-1.5 text-caption text-smoke">
        <MapPin className="mt-px size-3.5 shrink-0" />
        Ketuk peta atau geser titik hitam ke lokasi barang. Lingkaran = jangkauan maksimalmu.
      </p>
      <button
        type="button"
        onClick={() => {
          const a = AREA_BY_ID[areaId];
          const p = { lat: a.lat, lng: a.lng };
          setCenter(p);
          onPoint(p, areaId);
        }}
        className="inline-flex items-center gap-1.5 text-caption font-medium text-ink underline-offset-4 hover:underline"
      >
        <LocateFixed className="size-3.5" /> Kembalikan ke tengah area {AREA_BY_ID[areaId]?.name}
      </button>
    </div>
  );
}

"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";
import { AREAS, AREA_BY_ID } from "@/lib/data/areas";
import { RADIUS_OPTIONS } from "@/lib/geo";
import { useAppStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";
import { Pill } from "../ui/Pill";
import { Sheet } from "../ui/Sheet";

/** Search point + radius picker (FR-S1, FR-S7). Shared by the header and /cari. */
export function LocationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast("Browser tidak mendukung lokasi. Pilih area kampus/kos di bawah.", "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setSearch({ origin: "lokasi-saya", point: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
        toast("Memakai lokasimu saat ini.", "success");
        onClose();
      },
      () => {
        setLocating(false);
        // FR-S7: permission denied → fall back to choosing an area manually.
        toast("Izin lokasi ditolak. Pilih area kampus/kos secara manual.", "error");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Cari di sekitar" description="Barang tampil kalau masuk radiusmu dan juga radius jangkauan penyedia.">
      <Button variant="secondary" block onClick={useMyLocation} loading={locating} className="mb-4">
        <LocateFixed className="size-4" /> Pakai lokasi saat ini
      </Button>
      <p className="mb-2 text-body-sm font-semibold">Atau pilih area</p>
      <div className="grid grid-cols-2 gap-2">
        {AREAS.map((a) => {
          const active = search.origin === "area" && search.areaId === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setSearch({ origin: "area", areaId: a.id, point: { lat: a.lat, lng: a.lng } })}
              className={cn("flex items-start gap-2 rounded-[12px] border p-3 text-left", active ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-border-gray hover:border-ash")}
            >
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block text-body-sm font-semibold">{a.name}</span>
                <span className="block text-caption text-smoke">{a.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mb-2 mt-5 text-body-sm font-semibold">Radius pencarian</p>
      <div className="flex flex-wrap gap-2">
        {RADIUS_OPTIONS.map((r) => (
          <Pill key={r} active={search.radiusKm === r} onClick={() => setSearch({ radiusKm: r })}>
            {r} km
          </Pill>
        ))}
      </div>
      <Button block className="mt-6" onClick={onClose}>
        Terapkan
      </Button>
    </Sheet>
  );
}

export function useSearchLabel(): string {
  const search = useAppStore((s) => s.search);
  const place = search.origin === "lokasi-saya" ? "Lokasi saya" : AREA_BY_ID[search.areaId]?.name ?? "UGM";
  return `${place} · ${search.radiusKm} km`;
}

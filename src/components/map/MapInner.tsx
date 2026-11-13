"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { MapViewProps } from "./MapView";

const pinIcon = (label: string, active?: boolean) =>
  L.divIcon({ className: "", html: `<div class="sw-pin" data-active="${active ? "true" : "false"}">${label}</div>`, iconSize: [0, 0] });
const dotIcon = L.divIcon({ className: "", html: `<div class="sw-dot"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] });

function FitRadius({ center, radiusKm }: { center: [number, number]; radiusKm?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!radiusKm) {
      map.setView(center, map.getZoom());
      return;
    }
    const bounds = L.latLng(center).toBounds(radiusKm * 2000);
    map.fitBounds(bounds, { padding: [16, 16] });
  }, [map, center, radiusKm]);
  return null;
}

function ClickToPick({ onPick }: { onPick?: MapViewProps["onPick"] }) {
  useMapEvents({ click: (e) => onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function MapInner({ center, radiusKm, markers = [], onMarkerClick, onPick, pickPoint, pickRadiusKm, zoom = 14, className, fit = true }: MapViewProps) {
  const c = useMemo(() => [center.lat, center.lng] as [number, number], [center.lat, center.lng]);
  return (
    <MapContainer center={c} zoom={zoom} scrollWheelZoom={false} className={className} style={{ height: "100%", width: "100%" }} attributionControl>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      {fit && <FitRadius center={c} radiusKm={radiusKm} />}
      {radiusKm ? <Circle center={c} radius={radiusKm * 1000} pathOptions={{ color: "#171717", weight: 1, fillColor: "#171717", fillOpacity: 0.04, dashArray: "4 4" }} /> : null}
      {!pickPoint && <Marker position={c} icon={dotIcon} interactive={false} />}
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon(m.label, m.active)} eventHandlers={{ click: () => onMarkerClick?.(m.id) }} />
      ))}
      {pickPoint && (
        <>
          <Marker
            position={[pickPoint.lat, pickPoint.lng]}
            icon={dotIcon}
            draggable
            eventHandlers={{ dragend: (e) => onPick?.({ lat: (e.target as L.Marker).getLatLng().lat, lng: (e.target as L.Marker).getLatLng().lng }) }}
          />
          {pickRadiusKm ? <Circle center={[pickPoint.lat, pickPoint.lng]} radius={pickRadiusKm * 1000} pathOptions={{ color: "#171717", weight: 1, fillOpacity: 0.05 }} /> : null}
        </>
      )}
      {onPick && <ClickToPick onPick={onPick} />}
    </MapContainer>
  );
}

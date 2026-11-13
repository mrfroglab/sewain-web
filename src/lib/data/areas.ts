import type { Area, AreaId } from "../types";

// Pilot area: kampus UGM, Yogyakarta, and the dense kos clusters around it (PRD 18.1).
// Coordinates are approximate area centroids — the public UI never shows precise points (FR-S6).
export const AREAS: Area[] = [
  { id: "ugm", name: "Kampus UGM", label: "Bulaksumur, UGM", lat: -7.7713, lng: 110.3776 },
  { id: "pogung", name: "Pogung", label: "Pogung, Sinduadi", lat: -7.7596, lng: 110.3727 },
  { id: "sendowo", name: "Sendowo", label: "Sendowo, Sinduadi", lat: -7.7652, lng: 110.3752 },
  { id: "karangmalang", name: "Karangmalang", label: "Karangmalang, Caturtunggal", lat: -7.7738, lng: 110.3858 },
  { id: "karangwuni", name: "Karangwuni", label: "Karangwuni, Caturtunggal", lat: -7.7662, lng: 110.3812 },
  { id: "klebengan", name: "Klebengan", label: "Klebengan, Caturtunggal", lat: -7.7684, lng: 110.3853 },
  { id: "terban", name: "Terban", label: "Terban, Gondokusuman", lat: -7.7779, lng: 110.3731 },
  { id: "condongcatur", name: "Condongcatur", label: "Condongcatur, Depok", lat: -7.7571, lng: 110.3949 },
];

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, Area>;

export const areaName = (id: AreaId) => AREA_BY_ID[id]?.name ?? id;

/** Public meeting points suggested for COD (FR-S6: sarankan titik temu publik). */
export const PUBLIC_MEETING_POINTS = [
  "Lobi Perpustakaan Pusat UGM",
  "Depan Masjid Kampus UGM",
  "Halaman Gelanggang Inovasi & Kreativitas (GIK) UGM",
  "Minimarket Jl. Pogung Raya",
  "Depan Gerbang Fakultas Teknik UGM",
  "Bundaran UGM (sisi utara)",
];

import type { GeoPoint } from "./types";

/** Great-circle distance in km (haversine). The real product uses PostGIS ST_DWithin. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Two-way radius rule (FR-S3): a listing is shown only when the distance is within the renter's
 * search radius AND within the provider's reach radius — i.e. ST_DWithin(loc, point, LEAST(r_renter, r_provider)).
 */
export const withinTwoWayRadius = (distance: number, renterRadiusKm: number, providerRadiusKm: number) =>
  distance <= Math.min(renterRadiusKm, providerRadiusKm);

export const RADIUS_OPTIONS = [1, 3, 5, 10, 25] as const;

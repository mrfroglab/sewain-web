"use client";

// Evidence helpers shared by the check-out, check-in and dispute pages (PRD 10, 11).

import { useMemo } from "react";
import { CATEGORY_BY_ID } from "@/lib/data/categories";
import { useAppStore } from "@/lib/store";
import type { Booking, ID, Listing } from "@/lib/types";

/** Suggested angles for check-out (PRD 10.1: min. 3 sudut + close-up). */
export const CHECKOUT_ANGLES = ["Depan", "Samping", "Belakang", "Close-up kondisi"];

export const FUEL_LEVELS = ["Penuh", "3/4", "1/2", "1/4", "Hampir habis"];

export const isVehicle = (listing: Pick<Listing, "category">) => CATEGORY_BY_ID[listing.category]?.risk === "kendaraan";

/** "Foto contoh (demo)" sources: bundled listing photos only (idb: photos can't be re-fetched). */
export const demoSourcesFor = (listing: Listing) => listing.photos.filter((src) => src.startsWith("/"));

/** Demo collateral image: a cash-deposit receipt when no identity card is held, otherwise a (masked) KTM. */
export const collateralDemoSource = (b: Booking) =>
  b.collateral.kind === "deposit" && !b.collateral.withIdentity ? "/img/demo/jaminan-deposit.svg" : "/img/demo/jaminan-ktm.svg";

/** Identity cards / documents are handed over → FR-J6 reminder applies. */
export const collateralIsDocument = (b: Booking) =>
  b.collateral.kind === "identitas" || b.collateral.kind === "custom" || (b.collateral.kind === "deposit" && !!b.collateral.withIdentity);

/** Reference photos as agreed in the snapshot (falls back to the live listing). */
export const referencePhotos = (b: Booking, listing: Listing) => (b.agreement.referencePhotos?.length ? b.agreement.referencePhotos : listing.photos);

export interface BookingEvidence {
  checkout: ID[];
  /** check-in condition photos (problem photos are stored in the same list, split out here) */
  checkin: ID[];
  problem: ID[];
  collateral: ID[];
  /** angle label per check-out photo, used to pair check-in photos */
  angles: string[];
}

export function useBookingEvidence(booking: Booking, extraProblemIds: ID[] = []): BookingEvidence {
  const photos = useAppStore((s) => s.photos);
  const extraKey = extraProblemIds.join(",");
  return useMemo(() => {
    const byId = new Map(photos.map((p) => [p.id, p]));
    const checkout = booking.checkout?.photoIds ?? [];
    const checkinAll = booking.checkin?.photoIds ?? [];
    const checkin = checkinAll.filter((id) => byId.get(id)?.stage !== "masalah");
    const problem = Array.from(new Set([...checkinAll.filter((id) => byId.get(id)?.stage === "masalah"), ...(extraKey ? extraKey.split(",") : [])]));
    const angles = checkout.map((id, i) => byId.get(id)?.angle ?? CHECKOUT_ANGLES[i] ?? `Sudut ${i + 1}`);
    return { checkout, checkin, problem, collateral: booking.checkout?.collateralPhotoIds ?? [], angles };
  }, [photos, booking, extraKey]);
}

"use client";

import { PackageX } from "lucide-react";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { RequireAuth, RequireVerified } from "@/components/ui/Gate";
import { Container, EmptyState, PageHeader } from "@/components/ui/Layout";
import { useAppStore } from "@/lib/store";
import type { ID, Listing, User } from "@/lib/types";
import { ListingWizard } from "./ListingWizard";
import { planReferencePhotos } from "./photoSources";

/** /penyedia/barang/baru — FR-A6: only verified, active accounts can list. */
export function CreateListing() {
  return (
    <RequireAuth>
      {(user) => (
        <Container className="pb-6">
          <PageHeader back="/penyedia" title="Sewakan barang" subtitle="5 langkah singkat. Bisa diubah lagi kapan saja." />
          <RequireVerified user={user}>
            <ListingWizard user={user} />
          </RequireVerified>
        </Container>
      )}
    </RequireAuth>
  );
}

/** /penyedia/barang/[id] — edit, owner only, prefilled. */
export function EditListing({ id }: { id: ID }) {
  return <RequireAuth>{(user) => <EditGate user={user} id={id} />}</RequireAuth>;
}

function EditGate({ user, id }: { user: User; id: ID }) {
  const listing = useAppStore((s) => s.listings.find((l) => l.id === id));
  if (!listing || listing.ownerId !== user.id)
    return (
      <Container className="py-10">
        <EmptyState
          icon={<PackageX className="size-5" />}
          title={listing ? "Ini bukan listing milikmu" : "Listing tidak ditemukan"}
          description={listing ? "Hanya pemilik barang yang bisa mengubah listing ini." : "Mungkin sudah dihapus, atau tautannya salah."}
          action={
            <>
              {listing && (
                <ButtonLink href={`/barang/${listing.id}`} variant="secondary">
                  Lihat barang
                </ButtonLink>
              )}
              <ButtonLink href="/penyedia">Ke dashboard penyedia</ButtonLink>
            </>
          }
        />
      </Container>
    );
  return (
    <Container className="pb-6">
      <PageHeader back="/penyedia" title="Edit listing" subtitle={listing.title} />
      <RequireVerified user={user}>
        <EditLoader listing={listing} user={user} />
      </RequireVerified>
    </Container>
  );
}

/** Mounts the prefilled wizard once, registering reference-photo records for seeded photos. */
function EditLoader({ listing, user }: { listing: Listing; user: User }) {
  const [plan] = useState(() => planReferencePhotos(listing, useAppStore.getState().photos));
  const addPhotos = useAppStore((s) => s.addPhotos);
  useEffect(() => {
    if (plan.missing.length) addPhotos(plan.missing);
  }, [plan, addPhotos]);
  return <ListingWizard user={user} listing={listing} initialPhotoIds={plan.ids} />;
}

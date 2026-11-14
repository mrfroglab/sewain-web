"use client";

import { PackageSearch, PauseCircle, Settings2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { RequireAuth, RequireVerified } from "@/components/ui/Gate";
import { Container, EmptyState, PageHeader } from "@/components/ui/Layout";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { RequestForm } from "./RequestForm";

/** /barang/[id]/ajukan — request + agreement (PRD 9.5, FR-R1..R4, FR-J2, FR-J7, FR-K*). Signed-in + verified only (FR-A6). */
export function RequestFlow({ id }: { id: string }) {
  return <RequireAuth>{(user) => <RequestGate id={id} user={user} />}</RequireAuth>;
}

function RequestGate({ id, user }: { id: string; user: User }) {
  const listing = useAppStore((s) => s.listings.find((l) => l.id === id));
  const owner = useAppStore((s) => (listing ? s.users.find((u) => u.id === listing.ownerId) : undefined));

  if (!listing) {
    return (
      <Container className="py-10">
        <EmptyState
          icon={<PackageSearch className="size-5" />}
          title="Barang tidak ditemukan"
          description="Mungkin listing ini sudah dihapus penyedia, atau tautannya salah."
          action={<ButtonLink href="/cari">Cari barang lain</ButtonLink>}
        />
      </Container>
    );
  }

  const back = `/barang/${listing.id}`;
  const header = <PageHeader back={back} title="Ajukan sewa" subtitle="Isi detail sewa, cek ringkasan kesepakatan, lalu kirim ke penyedia." />;

  if (listing.ownerId === user.id) {
    return (
      <Container>
        {header}
        <EmptyState
          icon={<Settings2 className="size-5" />}
          title="Ini barangmu sendiri"
          description="Kamu tidak bisa menyewa listing milikmu. Ubah harga, jaminan, atau aturannya lewat halaman kelola."
          action={<ButtonLink href={`/penyedia/barang/${listing.id}`}>Kelola listing</ButtonLink>}
        />
      </Container>
    );
  }

  if (listing.status !== "aktif" || owner?.status !== "aktif") {
    return (
      <Container>
        {header}
        <EmptyState
          icon={<PauseCircle className="size-5" />}
          title="Barang ini belum bisa disewa"
          description={listing.status === "jeda" ? "Penyedia sedang menjeda listing ini. Coba lagi nanti atau cari barang serupa." : "Listing ini sedang tidak tersedia."}
          action={
            <ButtonLink href={`/cari?kategori=${listing.category}`} variant="secondary">
              Cari barang serupa
            </ButtonLink>
          }
        />
      </Container>
    );
  }

  return (
    <Container>
      {header}
      <RequireVerified user={user}>
        <RequestForm listing={listing} owner={owner} user={user} />
      </RequireVerified>
    </Container>
  );
}

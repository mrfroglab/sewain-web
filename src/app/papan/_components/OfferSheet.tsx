"use client";

import { MessageSquareText, PackagePlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, Label, TextArea } from "@/components/ui/Field";
import { RequireVerified } from "@/components/ui/Gate";
import { Notice } from "@/components/ui/Layout";
import { Sheet } from "@/components/ui/Sheet";
import { areaName } from "@/lib/data/areas";
import { formatDistance, rupiah } from "@/lib/format";
import { distanceKm } from "@/lib/geo";
import { findUser, isVerified, publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Listing, User, WantedPost } from "@/lib/types";

const FORM_ID = "offer-form";

/** Provider answers a wanted post with one of their active listings, or just a message (PRD 7.3). */
export function OfferSheet({ post, user, onClose }: { post: WantedPost | null; user: User | null; onClose: () => void }) {
  const requester = useAppStore((s) => (post ? findUser(s, post.requesterId) : undefined));
  const canOffer = isVerified(user) && user?.status === "aktif";
  return (
    <Sheet
      open={!!post}
      onClose={onClose}
      title="Tawarkan barang"
      description={post ? `Untuk “${post.title}” dari ${publicName(requester)}.` : undefined}
      footer={
        canOffer ? (
          <Button type="submit" form={FORM_ID} block>
            Kirim penawaran
          </Button>
        ) : undefined
      }
    >
      <RequireVerified user={user}>{post && user && <OfferForm post={post} user={user} requesterName={publicName(requester)} onDone={onClose} />}</RequireVerified>
    </Sheet>
  );
}

function OfferForm({ post, user, requesterName, onDone }: { post: WantedPost; user: User; requesterName: string; onDone: () => void }) {
  const listings = useAppStore((s) => s.listings);
  const offerWanted = useAppStore((s) => s.offerWanted);

  // Own active listings; same category first, then nearest to the requester's area.
  const mine = useMemo(() => {
    const own = listings.filter((l) => l.ownerId === user.id && l.status === "aktif");
    const score = (l: Listing) => (l.category === post.category ? 0 : 1);
    return own.map((l) => ({ listing: l, d: distanceKm(post.location, l.location) })).sort((a, b) => score(a.listing) - score(b.listing) || a.d - b.d);
  }, [listings, user.id, post.category, post.location]);

  const defaultMessage = (l?: Listing) => `Halo ${requesterName}, aku punya ${l ? l.title.toLowerCase() : "barang yang kamu cari"}. Bisa dicek dulu, ya!`;
  const [selected, setSelected] = useState<string>(mine[0]?.listing.id ?? "");
  const [message, setMessage] = useState(() => defaultMessage(mine[0]?.listing));
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (id: string) => {
    setSelected(id);
    if (!touched) setMessage(defaultMessage(mine.find((m) => m.listing.id === id)?.listing));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 3) return setError("Tulis pesan singkat untuk peminta.");
    const res = offerWanted(user.id, post.id, { listingId: selected || undefined, message: message.trim() });
    if (toastResult(res, `Penawaran terkirim. ${requesterName} dapat notifikasi.`)) onDone();
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <Label>Pilih barangmu</Label>
        {mine.length === 0 && (
          <Notice icon={<PackagePlus className="size-4" />} className="mb-2">
            Kamu belum punya barang aktif. Kirim pesan dulu, atau{" "}
            <Link href="/penyedia/barang/baru" className="font-semibold text-ink underline underline-offset-2">
              pasang barangnya sekarang
            </Link>
            .
          </Notice>
        )}
        <div className="space-y-2" role="radiogroup" aria-label="Pilih barangmu">
          {mine.map(({ listing: l, d }) => (
            <ChoiceCard
              key={l.id}
              selected={selected === l.id}
              onClick={() => pick(l.id)}
              icon={
                <span className="relative block h-12 w-10 overflow-hidden rounded-[8px] bg-soft-gray">
                  <ListingImage src={l.photos[0]} alt="" />
                </span>
              }
              title={l.title}
              description={`${rupiah(l.pricePerDay)}/hari · ${formatDistance(d)} dari ${areaName(post.areaId)}${l.category === post.category ? " · kategori sama" : ""}`}
            />
          ))}
          <ChoiceCard
            selected={selected === ""}
            onClick={() => pick("")}
            icon={<MessageSquareText className="size-4" />}
            title="Kirim pesan saja"
            description="Belum dipasang di Sewain, atau mau tanya detail dulu."
          />
        </div>
      </div>
      <TextArea
        label="Pesan untuk peminta"
        value={message}
        onChange={(e) => {
          setTouched(true);
          setError(null);
          setMessage(e.target.value);
        }}
        maxLength={300}
        error={error}
        help="Tidak perlu cantumkan nomor HP. Peminta bisa langsung mengajukan sewa dari listingmu."
      />
    </form>
  );
}

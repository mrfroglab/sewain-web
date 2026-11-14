"use client";

import { Ban, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TextArea } from "@/components/ui/Field";
import { bannedWordsIn } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import { useAdmin } from "../../_components/AdminContext";
import { AdminSection } from "../../_components/AdminUi";

const SAMPLE = "Sewa airsoft gun replika buat properti film, bisa COD di sekitar UGM.";

const STATUS_LABEL = { aktif: "Tampil", jeda: "Dijeda", diturunkan: "Diturunkan" } as const;

function Hits({ words }: { words: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {words.map((w) => (
        <span key={w} className="rounded-control bg-ink px-2 py-0.5 text-micro font-semibold text-white">
          {w}
        </span>
      ))}
    </span>
  );
}

/** Live tester for the (unsaved) keyword list + which existing listings it would catch. */
export function KeywordTester({ keywords }: { keywords: string[] }) {
  const admin = useAdmin();
  const listings = useAppStore((s) => s.listings);
  const setListingStatus = useAppStore((s) => s.setListingStatus);
  const [text, setText] = useState(SAMPLE);
  const found = bannedWordsIn(text, keywords);

  const caught = useMemo(
    () =>
      listings
        .map((l) => ({ listing: l, words: bannedWordsIn(`${l.title} ${l.description}`, keywords) }))
        .filter((x) => x.words.length > 0),
    [listings, keywords],
  );

  return (
    <div className="space-y-8">
      <AdminSection title="Coba filter" description="Ketik judul atau deskripsi listing. Hasilnya memakai daftar di samping, termasuk perubahan yang belum disimpan.">
        <TextArea value={text} onChange={(e) => setText(e.target.value)} rows={4} aria-label="Teks yang dites" placeholder="Contoh: Sewa tenda dome 4 orang…" />
        <div className="mt-3 rounded-[12px] bg-soft-gray p-3.5 text-body-sm" aria-live="polite">
          {!text.trim() ? (
            <p className="text-smoke">Ketik sesuatu untuk dites.</p>
          ) : found.length ? (
            <div className="flex flex-wrap items-center gap-2 text-ink">
              <Ban className="size-4 shrink-0" />
              <span className="font-semibold">Tertahan filter:</span>
              <Hits words={found} />
            </div>
          ) : (
            <p className="flex items-center gap-2 text-ink">
              <CircleCheck className="size-4 shrink-0" />
              <span className="font-semibold">Lolos filter.</span>
              <span className="text-smoke">Tidak ada kata terlarang.</span>
            </p>
          )}
        </div>
      </AdminSection>

      <AdminSection title="Listing yang akan tertahan" description="Listing yang judul atau deskripsinya mengandung kata di daftar ini.">
        {caught.length ? (
          <ul className="divide-y divide-border-gray rounded-[12px] border border-border-gray">
            {caught.map(({ listing, words }) => (
              <li key={listing.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-3">
                <Link href={`/barang/${listing.id}`} className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink underline-offset-2 hover:underline">
                  {listing.title}
                </Link>
                <Hits words={words} />
                {listing.status === "diturunkan" ? (
                  <span className="text-caption text-smoke">{STATUS_LABEL[listing.status]}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toastResult(setListingStatus(admin.id, listing.id, "diturunkan"), "Listing diturunkan dan tidak tampil lagi di pencarian.")}
                    className="inline-flex h-9 items-center rounded-control border border-border-gray bg-white px-3.5 text-nav font-medium text-ink hover:border-ink"
                  >
                    Turunkan
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[12px] bg-soft-gray p-3.5 text-body-sm text-graphite">Tidak ada listing yang kena. Aman.</p>
        )}
        <p className="mt-2 text-caption text-smoke">Cocokkan per kata utuh, huruf besar-kecil tidak berpengaruh. Cek dulu sebelum menurunkan: bisa saja kata itu dipakai wajar.</p>
      </AdminSection>
    </div>
  );
}

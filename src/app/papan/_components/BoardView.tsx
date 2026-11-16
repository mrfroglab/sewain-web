"use client";

import { BellRing, ChevronDown, ClipboardList, MapPin, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { chipClass } from "@/app/cari/_components/Chip";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Ready } from "@/components/ui/Gate";
import { Container, EmptyState, PageHeader } from "@/components/ui/Layout";
import { Tabs } from "@/components/ui/Tabs";
import { LocationSheet, useSearchLabel } from "@/components/shell/LocationSheet";
import { distanceKm } from "@/lib/geo";
import { useCurrentUser } from "@/lib/session";
import { useAppStore, useNow } from "@/lib/store";
import type { WantedPost } from "@/lib/types";
import { CreateWantedSheet } from "./CreateWantedSheet";
import { OfferSheet } from "./OfferSheet";
import { WantedCard } from "./WantedCard";

type Tab = "terbuka" | "semua" | "punyaku";
interface Row {
  post: WantedPost;
  distanceKm: number;
}

const newestFirst = (a: Row, b: Row) => b.post.createdAt - a.post.createdAt;
const openFirst = (a: Row, b: Row) => Number(a.post.status !== "terbuka") - Number(b.post.status !== "terbuka") || newestFirst(a, b);

/** /papan — wanted board (PRD 7.3). Reads ?buat=1&q= (from an empty search), so it must sit under <Suspense>. */
export function BoardView() {
  return (
    <Ready>
      <Board />
    </Ready>
  );
}

function Board() {
  const sp = useSearchParams();
  const router = useRouter();
  const user = useCurrentUser();
  const wanted = useAppStore((s) => s.wanted);
  const search = useAppStore((s) => s.search);
  const now = useNow();
  const locLabel = useSearchLabel();

  const [tab, setTab] = useState<Tab>("terbuka");
  const [createOpen, setCreateOpen] = useState(() => sp.get("buat") === "1");
  const [offerId, setOfferId] = useState<string | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const prefill = sp.get("q")?.trim() ?? "";

  const rows = useMemo<Row[]>(() => wanted.map((post) => ({ post, distanceKm: distanceKm(search.point, post.location) })), [wanted, search.point]);
  const open = rows.filter((r) => r.post.status === "terbuka");
  const nearby = open.filter((r) => r.distanceKm <= search.radiusKm).sort((a, b) => a.distanceKm - b.distanceKm);
  const farther = open.length - nearby.length;
  const mine = user ? rows.filter((r) => r.post.requesterId === user.id).sort(openFirst) : [];
  const shown = tab === "terbuka" ? nearby : tab === "punyaku" ? mine : [...rows].sort(openFirst);
  const offerPost = offerId ? wanted.find((w) => w.id === offerId) ?? null : null;

  const closeCreate = () => {
    setCreateOpen(false);
    // Drop ?buat=1&q= so a reload does not reopen the form.
    if (sp.has("buat") || sp.has("q")) router.replace("/papan", { scroll: false });
  };

  return (
    <Container className="pb-10">
      <PageHeader
        title="Papan permintaan"
        subtitle="Belum nemu barang yang kamu cari? Tulis di sini. Penyedia di sekitar yang punya barang sejenis langsung dapat notifikasi."
      />

      <div className="flex items-center justify-between gap-3">
        {/* min-w-0 wrapper: on 360 px the location chip truncates instead of pushing the button off-screen */}
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setLocOpen(true)} className={chipClass(false, "max-w-full")} aria-label={`Ubah lokasi dan radius: ${locLabel}`}>
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{locLabel}</span>
            <ChevronDown className="size-3.5 shrink-0 text-smoke" />
          </button>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="size-4" /> Buat permintaan
        </Button>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-[12px] bg-soft-gray p-3.5 text-body-sm text-graphite">
        <BellRing className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
        <span>
          <span className="font-semibold text-ink">Permintaan jadi sinyal buat penyedia.</span> Tiap permintaan baru dikirim sebagai notifikasi ke penyedia sekitar, jadi
          barang yang belum ada di Sewain bisa ikut dipasang.
        </span>
      </p>

      <Tabs<Tab>
        className="mt-6"
        value={tab}
        onChange={setTab}
        items={[
          { value: "terbuka", label: "Terbuka", count: nearby.length },
          { value: "semua", label: "Semua" },
          { value: "punyaku", label: "Punyaku", count: mine.filter((r) => r.post.status === "terbuka").length },
        ]}
      />

      <div className="mt-5">
        {tab === "punyaku" && !user ? (
          <EmptyState
            icon={<ClipboardList className="size-5" />}
            title="Masuk untuk melihat permintaanmu"
            action={<ButtonLink href={`/masuk?next=${encodeURIComponent("/papan")}`}>Masuk / daftar</ButtonLink>}
          />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-5" />}
            title={tab === "punyaku" ? "Kamu belum pernah membuat permintaan" : `Belum ada permintaan terbuka dalam ${search.radiusKm} km`}
            description={tab === "terbuka" && farther > 0 ? `Ada ${farther} permintaan terbuka yang lebih jauh. Perluas radius atau lihat tab Semua.` : "Butuh sesuatu? Tulis permintaanmu, penyedia sekitar akan dapat kabar."}
            action={<Button onClick={() => setCreateOpen(true)}>Buat permintaan</Button>}
          />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {shown.map((r) => (
                <WantedCard key={r.post.id} post={r.post} distanceKm={r.distanceKm} now={now} user={user} onOffer={() => setOfferId(r.post.id)} />
              ))}
            </div>
            {tab === "terbuka" && farther > 0 && (
              <p className="mt-4 text-caption text-smoke">
                {farther} permintaan terbuka lain ada di luar radius {search.radiusKm} km.{" "}
                <button type="button" onClick={() => setTab("semua")} className="font-medium text-ink underline underline-offset-2">
                  Lihat semua
                </button>
              </p>
            )}
          </>
        )}
      </div>

      <CreateWantedSheet
        open={createOpen}
        onClose={closeCreate}
        user={user}
        prefillTitle={prefill}
        onCreated={() => {
          closeCreate();
          setTab("punyaku");
        }}
      />
      <OfferSheet post={offerPost} user={user} onClose={() => setOfferId(null)} />
      <LocationSheet open={locOpen} onClose={() => setLocOpen(false)} />
    </Container>
  );
}

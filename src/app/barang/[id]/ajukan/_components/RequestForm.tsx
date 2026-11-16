"use client";

import { AlertCircle, FileText, Handshake, House, IdCard, Package, Truck, Wallet } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { collateralLine, durationText } from "@/app/barang/[id]/_components/DetailSections";
import { ListingImage } from "@/components/listing/ListingImage";
import { cn } from "@/components/ui/cn";
import { ChoiceCard, Help, TextArea, TextField } from "@/components/ui/Field";
import { pillClass } from "@/components/ui/Pill";
import { CATEGORY_BY_ID, HANDOVER_LABEL } from "@/lib/data/categories";
import { addDays, diffDays, formatDateRange, isoDate, parseIsoDate, rupiah } from "@/lib/format";
import { collateralValue, quoteRent } from "@/lib/pricing";
import { areaLabel, busyRanges, isAvailable, providerLabel } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { CollateralOption, HandoverMethod, Listing, User } from "@/lib/types";
import { AgreementSummary } from "./AgreementSummary";

const HANDOVER_ICON: Record<HandoverMethod, ReactNode> = {
  cod: <Handshake className="size-4" />,
  jemput: <House className="size-4" />,
  kurir: <Truck className="size-4" />,
};

function handoverHint(method: HandoverMethod, listing: Listing): string {
  switch (method) {
    case "cod":
      return "Ketemuan di tempat umum (mis. area kampus). Titik temu detail dibagikan setelah disetujui.";
    case "jemput":
      return `Ambil di tempat penyedia, area ${areaLabel(listing)}. Alamat lengkap dibagikan setelah disetujui.`;
    case "kurir":
      return "Kamu pesan dan bayar kurir sendiri (mis. ojek online). Tetap foto kondisi saat barang tiba.";
  }
}

const COLLATERAL_ICON: Record<CollateralOption["kind"], ReactNode> = {
  identitas: <IdCard className="size-4" />,
  deposit: <Wallet className="size-4" />,
  barang: <Package className="size-4" />,
  custom: <FileText className="size-4" />,
};

function collateralHint(opt: CollateralOption, itemValue: number): string {
  const value = collateralValue(opt, itemValue);
  switch (opt.kind) {
    case "identitas":
      return "Kartu dititipkan ke penyedia selama sewa dan dikembalikan saat barang kembali. Tidak ada uang yang ditahan.";
    case "deposit":
      return `Deposit ${rupiah(value)} dikembalikan utuh kalau barang kembali sesuai kondisi.${opt.withIdentity ? " Ditambah titip kartu identitas." : ""}`;
    case "barang":
      return `Barangmu dititipkan (± ${rupiah(value)}) dan dikembalikan saat barang sewaan kembali.`;
    case "custom":
      return `Dokumen/barang asli dititipkan${value ? ` (senilai ± ${rupiah(value)})` : ""}. Selama dititipkan jadi tanggung jawab penyedia.`;
  }
}

/** First free window of the same length within 60 days, offered as a one-tap fix when the dates clash. */
function findNextFree(busy: Parameters<typeof isAvailable>[0], listing: Listing, start: string, end: string, today: string): { start: string; end: string } | null {
  const span = Math.round((parseIsoDate(end) - parseIsoDate(start)) / 86_400_000);
  const from = start < today ? today : start;
  for (let i = 1; i <= 60; i++) {
    const s = addDays(from, i);
    const e = addDays(s, span);
    if (isAvailable(busy, listing, s, e)) return { start: s, end: e };
  }
  return null;
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-border-gray py-6 first:border-t-0 first:pt-0" aria-labelledby={`langkah-${n}`}>
      <h2 id={`langkah-${n}`} className="flex items-center gap-2.5 text-body-lg font-semibold tracking-[-0.2px] text-ink">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-caption font-semibold text-white">{n}</span>
        {title}
      </h2>
      {hint && <p className="mt-1 pl-[34px] text-body-sm text-smoke">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function RequestForm({ listing, owner, user }: { listing: Listing; owner: User; user: User }) {
  const router = useRouter();
  const now = useNow();
  const today = isoDate(now);
  const busyInput = useAppStore(useShallow((s) => ({ bookings: s.bookings, listingBusy: s.listingBusy, users: s.users, scope: s.scope, viewerId: s.viewerId })));
  const highValueBadge = useAppStore((s) => s.collateralRules.highValueBadge);
  const createBooking = useAppStore((s) => s.createBooking);

  const minDays = Math.max(1, listing.minDays ?? 1);
  const [start, setStart] = useState(() => addDays(today, 1));
  const [end, setEnd] = useState(() => addDays(addDays(today, 1), minDays));
  const [handover, setHandover] = useState<HandoverMethod>(listing.handover[0] ?? "cod");
  const [collateralId, setCollateralId] = useState(listing.collateralOptions[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collateral = listing.collateralOptions.find((o) => o.id === collateralId);
  const datesSet = !!start && !!end;
  const days = datesSet && end >= start ? diffDays(start, end) : 0;
  const quote = useMemo(() => (datesSet && end >= start ? quoteRent(listing, start, end) : null), [listing, start, end, datesSet]);

  const clash = datesSet && end >= start && !isAvailable(busyInput, listing, start, end);
  const nextFree = clash ? findNextFree(busyInput, listing, start, end, today) : null;

  // Blocking problems, in the order the renter should fix them (mirrors createBooking's checks, FR-R4).
  const dateProblem = !datesSet
    ? "Pilih tanggal ambil dan tanggal kembali."
    : start < today
      ? "Tanggal ambil sudah lewat. Pilih hari ini atau setelahnya."
      : end < start
        ? "Tanggal kembali harus sama atau setelah tanggal ambil."
        : listing.minDays && days < listing.minDays
          ? `Minimal sewa ${listing.minDays} hari.`
          : listing.maxDays && days > listing.maxDays
            ? `Maksimal sewa ${listing.maxDays} hari.`
            : clash
              ? listing.stock > 1
                ? "Semua unit sudah dipesan di tanggal itu. Coba geser tanggalnya."
                : "Barang sudah dipesan di tanggal itu. Coba geser tanggalnya."
              : null;
  const problem = dateProblem ?? (!listing.handover.includes(handover) ? "Pilih metode serah terima." : !collateral ? "Pilih bentuk jaminan." : null);

  // Unknown in a scoped snapshot without server data: then nothing is listed and the server checks clashes.
  const busy = useMemo(
    () =>
      listing.stock > 1
        ? []
        : (busyRanges(busyInput, listing) ?? []).filter((r) => r.end >= today).map((r) => formatDateRange(r.start, r.end)),
    [busyInput, listing, today],
  );

  const durationPresets = [1, 2, 3, 7].filter((d) => d >= minDays && (!listing.maxDays || d <= listing.maxDays));
  const highValue = listing.itemValue > highValueBadge || CATEGORY_BY_ID[listing.category]?.risk === "kendaraan";
  const autoApprove = listing.approval === "otomatis" && !highValue && (user.baseRating ?? 0) >= (listing.autoApproveMinRating ?? 4.5);

  const changeStart = (v: string) => {
    setError(null);
    // Keep the chosen duration when the pick-up date moves past the return date.
    if (v && end && v > end) setEnd(addDays(v, Math.max(days, minDays)));
    setStart(v);
  };

  const submit = () => {
    if (problem || !collateral || !agreed || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = createBooking(user.id, {
      listingId: listing.id,
      startDate: start,
      endDate: end,
      handover,
      collateralOptionId: collateral.id,
      note: note.trim() || undefined,
    });
    if (!res.ok) {
      setError(res.error);
      toast(res.error, "error");
      setSubmitting(false);
      return;
    }
    const accepted = useAppStore.getState().bookings.find((b) => b.id === res.value)?.status === "ACCEPTED";
    toast(accepted ? "Request langsung disetujui otomatis! Atur serah terima lewat chat." : "Request terkirim. Penyedia punya 24 jam untuk merespons.", "success");
    router.push(`/sewaan/${res.value}`);
  };

  return (
    <div className="pb-6">
      <div className="mb-6 flex items-center gap-3 rounded-card bg-soft-gray p-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-[10px] bg-image-gray">
          <ListingImage src={listing.photos[0]} alt={listing.title} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-body-sm font-semibold text-ink">{listing.title}</p>
          <p className="mt-0.5 text-caption text-smoke">
            {rupiah(listing.pricePerDay)}/hari · {providerLabel(owner)}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
        <div className="min-w-0">
          <Step n={1} title="Tanggal sewa" hint={`${durationText(listing)}.${listing.handoverHours ? ` Jam serah terima penyedia: ${listing.handoverHours}.` : ""}`}>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Tanggal ambil" type="date" value={start} min={today} onChange={(e) => changeStart(e.target.value)} required />
              <TextField
                label="Tanggal kembali"
                type="date"
                value={end}
                min={start || today}
                max={listing.maxDays && start ? addDays(start, listing.maxDays) : undefined}
                onChange={(e) => {
                  setError(null);
                  setEnd(e.target.value);
                }}
                required
              />
            </div>
            {durationPresets.length > 0 && start && (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="group" aria-label="Pilih durasi cepat">
                {durationPresets.map((d) => (
                  <button key={d} type="button" className={pillClass(days === d && end > start)} onClick={() => setEnd(addDays(start, d))}>
                    {d === 7 ? "1 minggu" : `${d} hari`}
                  </button>
                ))}
              </div>
            )}
            <div className={cn("mt-4 rounded-[12px] p-3.5", dateProblem ? "border border-ink bg-white" : "bg-soft-gray")} aria-live="polite">
              {dateProblem ? (
                <>
                  <p className="flex items-start gap-2 text-body-sm font-medium text-ink">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" /> {dateProblem}
                  </p>
                  {nextFree && (
                    <button
                      type="button"
                      className="mt-2 pl-6 text-body-sm font-semibold text-ink underline underline-offset-4"
                      onClick={() => {
                        setStart(nextFree.start);
                        setEnd(nextFree.end);
                      }}
                    >
                      Geser ke tanggal kosong terdekat: {formatDateRange(nextFree.start, nextFree.end)}
                    </button>
                  )}
                </>
              ) : quote ? (
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-ink">{quote.days} hari sewa</p>
                    <p className="mt-0.5 text-caption text-smoke">{quote.breakdown}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {quote.discount > 0 && <p className="text-caption text-ash line-through">{rupiah(quote.base)}</p>}
                    <p className="text-body font-bold text-ink">{rupiah(quote.total)}</p>
                  </div>
                </div>
              ) : null}
            </div>
            {busy.length > 0 && <Help>Sudah terisi: {busy.join(", ")}.</Help>}
            {listing.durationDiscount && !dateProblem && quote && quote.discount === 0 && (
              <p className="mt-2 text-caption text-sale-text">
                Sewa ≥ {listing.durationDiscount.minDays} hari dapat diskon {listing.durationDiscount.percent}%.
              </p>
            )}
          </Step>

          <Step n={2} title="Metode serah terima" hint="Pilih satu dari yang dibuka penyedia.">
            <div className="grid gap-2" role="radiogroup" aria-label="Metode serah terima">
              {listing.handover.map((h) => (
                <ChoiceCard key={h} selected={handover === h} onClick={() => setHandover(h)} icon={HANDOVER_ICON[h]} title={HANDOVER_LABEL[h]} description={handoverHint(h, listing)} />
              ))}
            </div>
          </Step>

          <Step n={3} title="Pilih jaminan" hint={`Penyedia membuka ${listing.collateralOptions.length} pilihan. Nilai barang (estimasi): ${rupiah(listing.itemValue)}.`}>
            <div className="grid gap-2" role="radiogroup" aria-label="Bentuk jaminan">
              {listing.collateralOptions.map((o) => (
                <ChoiceCard
                  key={o.id}
                  selected={collateralId === o.id}
                  onClick={() => setCollateralId(o.id)}
                  icon={COLLATERAL_ICON[o.kind]}
                  title={collateralLine(o, listing.itemValue)}
                  description={collateralHint(o, listing.itemValue)}
                />
              ))}
            </div>
            <Help>Jaminan difoto saat serah terima. Kalau titip kartu, tutup sebagian nomor penting (mis. NIK) saat difoto. KTM/SIM lebih disarankan daripada e-KTP.</Help>
          </Step>

          <Step n={4} title="Catatan untuk penyedia" hint="Opsional. Ceritakan keperluan dan jam ambil yang kamu mau.">
            <TextArea
              aria-label="Catatan untuk penyedia"
              placeholder="Mis. buat naik Merbabu hari Sabtu. Boleh ambil Jumat sore?"
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              help={`${note.length}/300 · jangan tulis nomor HP atau data pribadi, chat tersedia setelah request dikirim.`}
            />
          </Step>
        </div>

        <div className="min-w-0">
          <AgreementSummary
            listing={listing}
            owner={owner}
            user={user}
            start={start}
            end={end}
            quote={dateProblem ? null : quote}
            handover={handover}
            collateral={collateral}
            problem={problem}
            agreed={agreed}
            onAgree={setAgreed}
            autoApprove={autoApprove}
            submitting={submitting}
            error={error}
            onSubmit={submit}
          />
        </div>
      </div>
    </div>
  );
}

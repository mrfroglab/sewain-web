"use client";

import { ArrowRight, Eye, PauseCircle, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Notice } from "@/components/ui/Layout";
import { isoDate } from "@/lib/format";
import { useAppStore, useNow } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { ID, Listing, User } from "@/lib/types";
import { PREVIEW, STEPS, bannedIn, draftFromListing, emptyDraft, toListingInput } from "./draft";
import { demoPhotosFor } from "./photoSources";
import { PreviewListingCard, PreviewSummary } from "./Preview";
import { StepCollateral } from "./StepCollateral";
import { StepInfo } from "./StepInfo";
import { StepPhotos } from "./StepPhotos";
import { StepPrice } from "./StepPrice";
import { StepRules } from "./StepRules";
import { Stepper } from "./Stepper";
import { useListingForm } from "./useListingForm";
import { WizardNav } from "./WizardNav";

/** Scroll the first inline error into view once React has rendered it. */
const scrollToFirstError = () =>
  window.setTimeout(() => document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);

/**
 * Step-by-step listing form (PRD 8.2 / 9.2 / 9.3). Create when `listing` is absent, edit otherwise.
 * Everything validates per step with inline errors; nothing is saved until "Terbitkan".
 */
export function ListingWizard({ user, listing, initialPhotoIds = [] }: { user: User; listing?: Listing; initialPhotoIds?: ID[] }) {
  const router = useRouter();
  const rules = useAppStore((s) => s.collateralRules);
  const bannedKeywords = useAppStore((s) => s.bannedKeywords);
  const photos = useAppStore((s) => s.photos);
  const listings = useAppStore((s) => s.listings);
  const createListing = useAppStore((s) => s.createListing);
  const updateListing = useAppStore((s) => s.updateListing);
  const today = isoDate(useNow(60_000));
  const isToko = user.accountType === "toko";
  const [busy, setBusy] = useState(false);

  const ctx = useMemo(() => ({ bannedKeywords, today, isToko }), [bannedKeywords, today, isToko]);
  const [initial] = useState(() => (listing ? draftFromListing(listing, initialPhotoIds) : emptyDraft(user)));
  const form = useListingForm(initial, { editing: !!listing, ctx });
  const { draft, step } = form;

  const photoSrcs = useMemo(
    () => draft.photoIds.map((id) => photos.find((p) => p.id === id)?.src).filter((s): s is string => !!s),
    [draft.photoIds, photos],
  );
  const demoSources = useMemo(() => demoPhotosFor(draft.category, listings, user.id), [draft.category, listings, user.id]);
  const banned = useMemo(() => bannedIn({ title: draft.title, description: draft.description }, bannedKeywords), [draft.title, draft.description, bannedKeywords]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  /** Every step valid? Otherwise jump to the first incomplete one and show its errors. */
  const allValid = () => {
    const bad = form.firstInvalid();
    if (bad < 0) return true;
    form.goto(bad);
    form.markAttempted(bad);
    toast(`Masih ada yang perlu dilengkapi di langkah ${bad + 1} (${STEPS[bad].label}).`, "error");
    scrollToFirstError();
    return false;
  };

  const submit = () => {
    if (busy || !allValid()) return;
    const input = toListingInput(draft, { photos, isToko, rules });
    const res = listing ? updateListing(user.id, listing.id, input) : createListing(user.id, input);
    if (!res.ok) return void toast(res.error, "error");
    // Stay busy until the route changes so a double tap can't publish twice.
    setBusy(true);
    toast(listing ? "Perubahan disimpan." : "Listing terbit! Barangmu sudah bisa dicari penyewa di sekitar.", "success");
    router.push(`/barang/${listing ? listing.id : (res.value as string)}`);
  };

  const onNext = () => {
    if (step === PREVIEW) return submit();
    const errors = form.next();
    if (Object.keys(errors).length) scrollToFirstError();
  };

  const nextLabel = step === PREVIEW ? (listing ? "Simpan" : "Terbitkan") : step === PREVIEW - 1 ? "Pratinjau" : "Lanjut";
  const heading = step === PREVIEW ? { title: "Pratinjau", hint: "Begini listingmu tampil ke penyewa. Cek sekali lagi, lalu terbitkan." } : STEPS[step];

  return (
    <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-12">
      <div className="min-w-0">
        {listing?.status === "jeda" && (
          <Notice className="mb-5" icon={<PauseCircle className="size-4" />} title="Listing sedang dijeda">
            Penyewa belum bisa melihatnya. Aktifkan lagi dari dashboard setelah selesai mengedit.
          </Notice>
        )}
        {listing?.status === "diturunkan" && (
          <Notice className="mb-5" icon={<ShieldAlert className="size-4" />} title="Listing diturunkan admin" tone="outline">
            Listing ini tidak tampil karena melanggar aturan. Perbaiki isinya lalu hubungi admin lewat Bantuan untuk peninjauan ulang.
          </Notice>
        )}

        <Stepper step={step} maxStep={form.maxStep} onGo={form.goto} />

        <div className="mt-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.4px] text-ink">{heading.title}</h2>
            <p className="mt-1 text-body-sm text-smoke">{heading.hint}</p>
          </div>
          {step < PREVIEW - 1 && form.maxStep === PREVIEW && (
            <button
              type="button"
              onClick={() => allValid() && form.goto(PREVIEW)}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-control border border-border-gray px-3 text-nav font-medium text-ink hover:border-ink"
            >
              Pratinjau <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>

        <div className="mt-6">
          {step === 0 && <StepPhotos form={form} userId={user.id} demoSources={demoSources} />}
          {step === 1 && <StepInfo form={form} banned={banned} />}
          {step === 2 && <StepPrice form={form} isToko={isToko} storeName={user.store?.name} />}
          {step === 3 && <StepCollateral form={form} rules={rules} />}
          {step === 4 && <StepRules form={form} rules={rules} />}
          {step === PREVIEW && <PreviewSummary draft={draft} photoSrcs={photoSrcs} owner={user} rules={rules} isToko={isToko} onEdit={form.goto} />}
        </div>

        <WizardNav canBack={step > 0} onBack={form.back} onNext={onNext} nextLabel={nextLabel} final={step === PREVIEW} busy={busy} />
      </div>

      <aside className="hidden lg:block" aria-label="Pratinjau langsung">
        <div className="sticky top-24">
          <p className="mb-3 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-smoke">
            <Eye className="size-3.5" /> Pratinjau langsung
          </p>
          <PreviewListingCard draft={draft} photoSrcs={photoSrcs} owner={user} rules={rules} compact />
          <p className="mt-4 text-caption text-smoke">Kartu ini yang dilihat penyewa di hasil pencarian. Lokasi tampil sebagai area dan perkiraan jarak saja.</p>
        </div>
      </aside>
    </div>
  );
}

"use client";

// Pengaturan saran jaminan (FR-J3): thresholds and percentages behind the automatic suggestion that
// providers see when they list an item. Saving goes through updateCollateralRules (audit logged).

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { collateralWarnings } from "@/lib/pricing";
import { liveListings, publicName } from "@/lib/selectors";
import { useCurrentUser } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { CollateralRules, Listing } from "@/lib/types";
import { AdminSection, AdminTitle } from "../../_components/AdminUi";
import { AuditList } from "../../audit/_components/AuditList";
import { fromDraft, isSame, patchOf, toDraft, validate, type RulesDraft } from "./draft";
import { RulesForm } from "./RulesForm";
import { SuggestionPreview } from "./SuggestionPreview";

const belowSuggestion = (listings: Listing[], rules: CollateralRules) =>
  listings.filter((l) => collateralWarnings(l.collateralOptions, l.itemValue, l.category, rules).length > 0).length;

export function JaminanView() {
  const admin = useCurrentUser();
  const saved = useAppStore((s) => s.collateralRules);
  const users = useAppStore((s) => s.users);
  const listings = useAppStore((s) => s.listings);
  const audit = useAppStore((s) => s.audit);
  const updateCollateralRules = useAppStore((s) => s.updateCollateralRules);
  const [draft, setDraft] = useState<RulesDraft>(() => toDraft(saved));

  const errors = validate(draft);
  const valid = Object.keys(errors).length === 0;
  const rules = useMemo(() => fromDraft(draft, saved), [draft, saved]);
  const dirty = !isSame(rules, saved);
  const history = useMemo(() => audit.filter((e) => e.action === "jaminan.ubah"), [audit]);

  const live = useMemo(() => liveListings({ listings, users }), [listings, users]);
  const warnNow = useMemo(() => belowSuggestion(live, saved), [live, saved]);
  const warnDraft = useMemo(() => belowSuggestion(live, rules), [live, rules]);

  const save = () => {
    if (!valid || !dirty) return;
    toastResult(updateCollateralRules(admin?.id ?? "", patchOf(rules)), "Saran jaminan disimpan. Langsung dipakai saat penyedia membuat atau mengubah listing.");
  };

  return (
    <div>
      <AdminTitle
        title="Saran jaminan"
        subtitle="Ambang nilai dan persentase di balik saran jaminan otomatis untuk penyedia. Saran tidak memblokir: kalau jaminan di bawah saran, penyedia hanya diberi peringatan (FR-J4)."
      />

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <AdminSection title="Aturan" description={`Terakhir diubah ${formatDateTime(saved.updatedAt)} oleh ${publicName(users.find((u) => u.id === saved.updatedBy))}.`}>
          <RulesForm draft={draft} errors={errors} rules={rules} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={!dirty || !valid}>
              Simpan perubahan
            </Button>
            <Button variant="secondary" onClick={() => setDraft(toDraft(saved))} disabled={!dirty}>
              Batalkan
            </Button>
            <span className="text-caption text-smoke">{dirty ? (valid ? "Ada perubahan yang belum disimpan." : "Periksa isian yang ditandai.") : "Belum ada perubahan."}</span>
          </div>
        </AdminSection>

        <aside className="space-y-4 xl:pt-9">
          <div className="rounded-card border border-border-gray p-4">
            <p className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">Dampak ke listing aktif</p>
            <p className="mt-1.5 text-[24px] font-semibold leading-none tracking-[-0.6px] text-ink tabular-nums">
              {warnDraft}
              <span className="text-body font-normal text-smoke"> / {live.length}</span>
            </p>
            <p className="mt-1.5 text-caption text-graphite">
              listing punya opsi jaminan di bawah saran{dirty && warnDraft !== warnNow ? ` (sekarang ${warnNow})` : ""}. Penyedianya melihat peringatan saat mengubah listing; tidak ada yang diblokir.
            </p>
          </div>
          <ul className="space-y-3 text-caption text-graphite">
            <li>Saran dihitung dari nilai barang dan kategori yang diisi penyedia.</li>
            <li>Penyewa tetap memilih satu dari opsi jaminan yang dibuka penyedia (FR-J2).</li>
            <li>Setiap perubahan tercatat di log audit (nilai lama → baru).</li>
          </ul>
        </aside>
      </div>

      <AdminSection className="mt-12" title="Pratinjau saran" description="Yang akan dilihat penyedia untuk barang-barang ini, mengikuti isian di atas sebelum disimpan.">
        <SuggestionPreview rules={rules} saved={saved} />
      </AdminSection>

      <AdminSection className="mt-12" title="Riwayat perubahan">
        <AuditList entries={history} limit={5} moreHref="/admin/audit" empty="Belum ada perubahan saran jaminan." />
      </AdminSection>
    </div>
  );
}

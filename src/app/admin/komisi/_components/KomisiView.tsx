"use client";

// Pengaturan komisi (FR-K1–K8, PRD 14). Edits stay a draft (with a live preview) until saved;
// saving goes through updateCommission, which writes the audit log (FR-K7).

import { Layers } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { computeCommission, describeCommission } from "@/lib/pricing";
import { isOpenBooking, publicName } from "@/lib/selectors";
import { useCurrentUser } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import { AdminSection, AdminTitle } from "../../_components/AdminUi";
import { AuditList } from "../../audit/_components/AuditList";
import { CommissionForm } from "./CommissionForm";
import { CommissionPreview } from "./CommissionPreview";
import { fromDraft, isSame, patchOf, toDraft, validate, type CommissionDraft } from "./draft";

export function KomisiView() {
  const admin = useCurrentUser();
  const saved = useAppStore((s) => s.commission);
  const users = useAppStore((s) => s.users);
  const bookings = useAppStore((s) => s.bookings);
  const audit = useAppStore((s) => s.audit);
  const updateCommission = useAppStore((s) => s.updateCommission);
  const [draft, setDraft] = useState<CommissionDraft>(() => toDraft(saved));

  const errors = validate(draft);
  const valid = Object.keys(errors).length === 0;
  const cfg = useMemo(() => fromDraft(draft, saved), [draft, saved]);
  const dirty = !isSame(cfg, saved);
  const history = useMemo(() => audit.filter((e) => e.action === "komisi.ubah"), [audit]);
  const running = useMemo(() => bookings.filter(isOpenBooking).length, [bookings]);

  const save = () => {
    if (!valid || !dirty) return;
    // The draft already equals the new config, so it reads as "no changes" once the store updates.
    toastResult(updateCommission(admin?.id ?? "", patchOf(cfg)), "Komisi disimpan. Berlaku untuk booking baru.");
  };

  return (
    <div>
      <AdminTitle
        title="Komisi"
        subtitle="Satu-satunya sumber pendapatan Sewain. Atur bentuk, batas, dan siapa yang menanggung; perubahan hanya berlaku untuk booking baru."
        actions={<Badge tone={saved.active ? "ink" : "outline"}>{saved.active ? "Aktif" : "Nonaktif · pilot 0%"}</Badge>}
      />

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <AdminSection title="Pengaturan">
          <CommissionForm draft={draft} errors={errors} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border-gray pt-5">
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
            <p className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">Berlaku sekarang</p>
            <p className="mt-1.5 text-body-sm font-semibold text-ink">{describeCommission(computeCommission(0, saved))}</p>
            <p className="mt-1 text-caption text-smoke">
              {saved.active ? "Aktif" : "Nonaktif (pilot)"} · diubah {formatDateTime(saved.updatedAt)} oleh {publicName(users.find((u) => u.id === saved.updatedBy))}
            </p>
            {dirty && (
              <div className="mt-3 border-t border-border-gray pt-3">
                <p className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">Draf</p>
                <p className="mt-1.5 text-body-sm text-ink">
                  {describeCommission(computeCommission(0, cfg))} · {cfg.active ? "aktif" : "nonaktif"}
                </p>
              </div>
            )}
          </div>
          <ul className="space-y-3 text-caption text-graphite">
            <Rule id="FR-K4">Dihitung dari nilai sewa saja, bukan dari jaminan atau deposit.</Rule>
            <Rule id="FR-K5">
              Hanya berlaku untuk booking baru. {running} booking yang sedang berjalan tetap memakai nilai di snapshot kesepakatannya.
            </Rule>
            <Rule id="FR-K6">Saat nonaktif, nilai “komisi seandainya aktif” tetap dicatat di setiap kesepakatan.</Rule>
            <Rule id="FR-K7">Setiap perubahan tercatat di log audit: siapa, kapan, nilai lama → baru.</Rule>
          </ul>
        </aside>
      </div>

      <AdminSection className="mt-12" title="Pratinjau per transaksi" description="Berubah langsung mengikuti isian di atas, sebelum disimpan.">
        <CommissionPreview cfg={cfg} />
      </AdminSection>

      <AdminSection className="mt-12" title="Riwayat perubahan">
        <AuditList entries={history} limit={5} moreHref="/admin/audit" empty="Belum ada perubahan komisi." />
      </AdminSection>

      <section className="mt-12 flex gap-4 rounded-card bg-soft-gray p-4 sm:p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink shadow-hairline">
          <Layers className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-body-sm font-semibold text-ink">
            Komisi per kategori / tipe akun <Badge tone="outline">Segera · P1</Badge>
          </p>
          <p className="mt-1 text-body-sm text-graphite">
            Nanti komisi bisa dibedakan per kategori atau tipe akun (FR-K8), mis. akun Toko lebih rendah tapi volumenya tinggi. Untuk sekarang satu aturan berlaku untuk semua.
          </p>
        </div>
      </section>
    </div>
  );
}

function Rule({ id, children }: { id: string; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-px shrink-0 font-mono text-micro text-ash">{id}</span>
      <span>{children}</span>
    </li>
  );
}

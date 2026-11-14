"use client";

import { ScrollText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/Layout";
import { publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { AdminTitle, chipClass } from "../../_components/AdminUi";
import { AuditList } from "./AuditList";
import { AUDIT_GROUPS, auditGroup, auditLabel, type AuditGroup } from "./labels";

/** Log audit (FR-K7): every admin action and settings change, newest first, filterable by area. */
export function AuditView() {
  const audit = useAppStore((s) => s.audit);
  const users = useAppStore((s) => s.users);
  const [group, setGroup] = useState<AuditGroup | "semua">("semua");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of audit) c[auditGroup(e.action)] = (c[auditGroup(e.action)] ?? 0) + 1;
    return c;
  }, [audit]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return audit.filter((e) => {
      if (group !== "semua" && auditGroup(e.action) !== group) return false;
      if (!term) return true;
      const actor = publicName(users.find((u) => u.id === e.actorId));
      return [e.target, e.oldValue, e.newValue, e.action, auditLabel(e.action), actor].some((v) => v?.toLowerCase().includes(term));
    });
  }, [audit, users, group, q]);

  const pill = (key: AuditGroup | "semua", label: string, n: number) => (
    <button key={key} type="button" aria-pressed={group === key} onClick={() => setGroup(key)} className={chipClass(group === key, "shrink-0 whitespace-nowrap")}>
      {label}
      <span className={group === key ? "text-white/70" : "text-smoke"}>{n}</span>
    </button>
  );

  return (
    <div>
      <AdminTitle title="Log audit" subtitle="Siapa, kapan, mengubah apa: nilai lama → baru. Catatan hanya bisa bertambah, tidak bisa diubah atau dihapus." />

      <div className="space-y-3">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Saring menurut jenis">
          {pill("semua", "Semua", audit.length)}
          {AUDIT_GROUPS.map((g) => pill(g.key, g.label, counts[g.key] ?? 0))}
        </div>
        <label className="relative flex items-center sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 size-4 text-smoke" aria-hidden />
          <input
            type="search"
            aria-label="Cari di log audit"
            placeholder="Cari nama, target, atau nilai…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 w-full rounded-control border border-border-gray bg-white pl-10 pr-4 text-body text-ink placeholder:text-ash hover:border-ash focus:border-ink focus:outline-none"
          />
        </label>
      </div>

      <p className="mb-2 mt-6 text-caption text-smoke">
        {filtered.length} catatan{group !== "semua" ? ` · ${AUDIT_GROUPS.find((g) => g.key === group)?.label}` : ""}
      </p>
      {filtered.length === 0 ? (
        <EmptyState icon={<ScrollText className="size-5" />} title="Tidak ada catatan" description="Coba jenis lain atau kosongkan pencarian." />
      ) : (
        <AuditList entries={filtered} />
      )}
    </div>
  );
}

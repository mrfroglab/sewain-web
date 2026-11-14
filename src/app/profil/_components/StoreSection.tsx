"use client";

import { Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Select, TextField } from "@/components/ui/Field";
import { AREAS, AREA_BY_ID } from "@/lib/data/areas";
import { useAppStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { AreaId, StoreInfo, User } from "@/lib/types";
import { EditButton, Empty, ListBox, Row, SectionTitle } from "./ui";

/** FR-A7: akun Toko (nama usaha, area, jam operasional, stok > 1). Individu can upgrade here. */
export function StoreSection({ user }: { user: User }) {
  const [editing, setEditing] = useState(false);
  const isToko = user.accountType === "toko" && !!user.store;

  return (
    <section className="mt-10" aria-labelledby="akun-toko">
      <SectionTitle
        id="akun-toko"
        title="Akun Toko"
        description={isToko ? "Nama usaha tampil di listing dan profil publikmu." : undefined}
        action={isToko && !editing ? <EditButton onClick={() => setEditing(true)} /> : undefined}
      />

      {editing ? (
        <StoreForm user={user} upgrade={!isToko} onDone={() => setEditing(false)} />
      ) : isToko ? (
        <ListBox>
          <Row label="Nama usaha" value={user.store!.name} />
          <Row label="Area toko" value={AREA_BY_ID[user.store!.areaId]?.label ?? user.store!.areaId} note="Tampil sebagai area, bukan alamat lengkap" />
          <Row label="Jam operasional" value={user.store!.hours} />
          <Row label="NIB" value={user.store!.nib || <Empty>Opsional</Empty>} />
        </ListBox>
      ) : (
        <div className="flex flex-col gap-4 rounded-card bg-soft-gray p-4 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink shadow-hairline">
            <Store className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-semibold text-ink">Punya usaha rental kecil?</p>
            <p className="mt-0.5 text-caption text-smoke">Ubah jadi akun Toko: nama usaha tampil di listing, ada jam operasional, dan satu barang bisa punya stok lebih dari 1.</p>
          </div>
          <Button variant="secondary" onClick={() => setEditing(true)} className="shrink-0">
            Ubah jadi akun Toko
          </Button>
        </div>
      )}
    </section>
  );
}

function StoreForm({ user, upgrade, onDone }: { user: User; upgrade: boolean; onDone: () => void }) {
  const updateUser = useAppStore((s) => s.updateUser);
  const [name, setName] = useState(user.store?.name ?? "");
  const [areaId, setAreaId] = useState<AreaId>(user.store?.areaId ?? user.areaId);
  const [hours, setHours] = useState(user.store?.hours ?? "08.00–21.00");
  const [nib, setNib] = useState(user.store?.nib ?? "");
  const [errors, setErrors] = useState<{ name?: string; hours?: string }>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = { name: name.trim().length < 3 ? "Tulis nama usahamu (min. 3 huruf)." : undefined, hours: hours.trim() ? undefined : "Isi jam operasional." };
    setErrors(next);
    if (next.name || next.hours) return;
    const store: StoreInfo = { name: name.trim(), areaId, hours: hours.trim(), nib: nib.trim() || undefined };
    updateUser(user.id, { accountType: "toko", store });
    toast(upgrade ? "Akun Toko aktif. Nama usahamu tampil di listing." : "Info toko disimpan.", "success");
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-card border border-border-gray p-4" noValidate>
      {upgrade && <p className="text-body-sm text-graphite">Isi info usahamu. Bisa diubah kapan saja.</p>}
      <TextField label="Nama usaha" placeholder="mis. Bayu Outdoor & Kamera" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <Select label="Area toko" value={areaId} onChange={(e) => setAreaId(e.target.value as AreaId)} help="Yang tampil ke penyewa hanya nama area.">
        {AREAS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </Select>
      <TextField label="Jam operasional" placeholder="08.00–21.00" value={hours} onChange={(e) => setHours(e.target.value)} error={errors.hours} />
      <TextField label="NIB" optional placeholder="Nomor Induk Berusaha" inputMode="numeric" value={nib} onChange={(e) => setNib(e.target.value)} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit">{upgrade ? "Simpan & jadikan Toko" : "Simpan"}</Button>
      </div>
    </form>
  );
}

"use client";

import { Megaphone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Chip } from "@/app/cari/_components/Chip";
import { Button } from "@/components/ui/Button";
import { Label, Select, TextArea, TextField } from "@/components/ui/Field";
import { RequireVerified } from "@/components/ui/Gate";
import { Sheet } from "@/components/ui/Sheet";
import { AREAS } from "@/lib/data/areas";
import { CATEGORIES } from "@/lib/data/categories";
import { isoDate } from "@/lib/format";
import { RADIUS_OPTIONS } from "@/lib/geo";
import { bannedWordsIn, isVerified } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { AreaId, CategoryId, ID, User } from "@/lib/types";

const FORM_ID = "wanted-form";

/** "Buat permintaan" (PRD 7.3). Verified users only; guests/unverified see the gate inside the sheet. */
export function CreateWantedSheet({ open, onClose, user, prefillTitle, onCreated }: { open: boolean; onClose: () => void; user: User | null; prefillTitle: string; onCreated: (id: ID) => void }) {
  const canPost = isVerified(user) && user?.status === "aktif";
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Buat permintaan"
      description="Tulis barang yang kamu cari. Penyedia di sekitar yang punya barang sejenis langsung dapat notifikasi."
      footer={
        canPost ? (
          <Button type="submit" form={FORM_ID} block>
            <Megaphone className="size-4" /> Kirim permintaan
          </Button>
        ) : undefined
      }
    >
      <RequireVerified user={user}>{user && <WantedForm user={user} prefillTitle={prefillTitle} onCreated={onCreated} />}</RequireVerified>
    </Sheet>
  );
}

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 9);

function WantedForm({ user, prefillTitle, onCreated }: { user: User; prefillTitle: string; onCreated: (id: ID) => void }) {
  const search = useAppStore((s) => s.search);
  const createWanted = useAppStore((s) => s.createWanted);
  const today = isoDate(useAppStore.getState().now());

  const [title, setTitle] = useState(prefillTitle);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryId | "">("");
  const [areaId, setAreaId] = useState<AreaId>(search.origin === "area" ? search.areaId : user.areaId);
  const [radiusKm, setRadiusKm] = useState<number>(search.radiusKm);
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [budget, setBudget] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"title" | "until", string>>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const t = title.trim();
    if (t.length < 3) next.title = "Tulis nama barangnya dulu, minimal 3 huruf.";
    const banned = bannedWordsIn(`${t} ${description}`, useAppStore.getState().bannedKeywords);
    if (banned.length) next.title = `Barang ini termasuk yang dilarang di Sewain (${banned.join(", ")}).`;
    if (from && until && until < from) next.until = "Tanggal selesai harus setelah tanggal mulai.";
    setErrors(next);
    if (Object.keys(next).length) return;

    // Same audience the store notifies: providers with an active listing in this category (PRD 7.3).
    const s = useAppStore.getState();
    const notified = new Set(s.listings.filter((l) => l.status === "aktif" && (!category || l.category === category) && l.ownerId !== user.id).map((l) => l.ownerId)).size;

    const res = createWanted(user.id, {
      title: t,
      description: description.trim(),
      category: category || undefined,
      areaId,
      radiusKm,
      neededFrom: from || undefined,
      neededUntil: until || from || undefined,
      budgetPerDay: budget ? Number(budget) : undefined,
    });
    if (toastResult(res, `Permintaan terkirim. ${notified} penyedia di sekitar dapat notifikasi.`) && res.ok) onCreated(res.value);
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-4" noValidate>
      <TextField label="Barang yang dicari" placeholder="Mis. Toga wisuda ukuran M" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={80} />
      <TextArea label="Ceritakan kebutuhannya" optional placeholder="Buat acara apa, ukuran/spesifikasi, perlu diantar atau tidak…" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Kategori" value={category} onChange={(e) => setCategory(e.target.value as CategoryId | "")}>
          <option value="">Pilih kategori</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select label="Area kamu" value={areaId} onChange={(e) => setAreaId(e.target.value as AreaId)}>
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Cari penyedia dalam radius</Label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <Chip key={r} active={radiusKm === r} onClick={() => setRadiusKm(r)}>
              {r} km
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Butuh mulai" optional type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="Sampai" optional type="date" min={from || today} value={until} onChange={(e) => setUntil(e.target.value)} error={errors.until} />
      </div>
      <TextField
        label="Budget per hari"
        optional
        prefix="Rp"
        inputMode="numeric"
        placeholder="Mis. 40000"
        value={budget}
        onChange={(e) => setBudget(digits(e.target.value))}
        help="Lokasi tepatmu tidak ditampilkan, hanya area dan perkiraan jarak."
      />
    </form>
  );
}

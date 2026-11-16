"use client";

import { Ban, Plus, RotateCcw, Save, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { DEFAULT_BANNED_KEYWORDS, FORBIDDEN_CATEGORIES } from "@/lib/data/categories";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import { useAdmin } from "../../_components/AdminContext";
import { AdminSection, AdminTitle } from "../../_components/AdminUi";
import { KeywordTester } from "./KeywordTester";

const clean = (w: string) => w.trim().toLowerCase().replace(/\s+/g, " ");
const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

/** FR-L4: editable banned keyword list (saved with setBannedKeywords) + live tester. */
export function KeywordEditor() {
  const admin = useAdmin();
  const saved = useAppStore((s) => s.bannedKeywords);
  const setBannedKeywords = useAppStore((s) => s.setBannedKeywords);
  const [draft, setDraft] = useState<string[]>(saved);
  const [base, setBase] = useState(saved);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const dirty = !same(draft, saved);
  // Follow changes saved elsewhere (another tab) while there are no local edits.
  if (saved !== base) {
    setBase(saved);
    if (same(draft, base)) setDraft(saved);
  }

  const added = draft.filter((w) => !saved.includes(w));
  const removed = saved.filter((w) => !draft.includes(w));

  const add = (e: FormEvent) => {
    e.preventDefault();
    const words = input.split(",").map(clean).filter(Boolean);
    if (!words.length) return;
    const fresh = words.filter((w, i) => !draft.includes(w) && words.indexOf(w) === i);
    if (!fresh.length) {
      setError(`"${words[0]}" sudah ada di daftar.`);
      return;
    }
    setDraft([...draft, ...fresh]);
    setInput("");
    setError(null);
  };

  const save = () => {
    if (toastResult(setBannedKeywords(admin.id, draft), `Daftar disimpan: ${draft.length} kata terlarang.`)) setError(null);
  };

  return (
    <>
      <AdminTitle
        title="Kata terlarang"
        subtitle="Listing yang judul atau deskripsinya mengandung kata ini tertahan filter dan ditandai untuk ditinjau. Perubahan berlaku setelah disimpan dan tercatat di log audit."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <AdminSection title={`Daftar kata (${draft.length})`} description="Ketuk silang untuk menghapus. Bisa tambah beberapa sekaligus, pisahkan dengan koma.">
          <form onSubmit={add} className="flex gap-2">
            <label htmlFor="kata-baru" className="sr-only">
              Kata baru
            </label>
            <input
              id="kata-baru"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
              placeholder="mis. replika senjata, obat tidur"
              className="h-10 min-w-0 flex-1 rounded-control border border-border-gray bg-white px-4 text-body text-ink placeholder:text-ash focus:border-ink focus:outline-none"
            />
            <Button type="submit" disabled={!input.trim()}>
              <Plus className="size-4" /> Tambah
            </Button>
          </form>
          {error && <p className="mt-1.5 text-caption text-graphite">{error}</p>}

          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Kata terlarang">
            {draft.map((w) => {
              const isNew = !saved.includes(w);
              return (
                <li key={w} className={cn("inline-flex h-9 items-center gap-0.5 rounded-control border pl-3.5 pr-1 text-nav font-medium", isNew ? "border-ink bg-white text-ink" : "border-border-gray bg-soft-gray text-graphite")}>
                  {w}
                  {isNew && <span className="ml-1 text-micro font-normal text-smoke">baru</span>}
                  <button type="button" onClick={() => setDraft(draft.filter((x) => x !== w))} aria-label={`Hapus ${w}`} className="grid size-7 place-items-center rounded-full text-smoke hover:bg-white hover:text-ink">
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
            {draft.length === 0 && <li className="text-body-sm text-smoke">Daftar kosong. Semua listing lolos filter.</li>}
          </ul>

          <div className="mt-5 rounded-[12px] border border-border-gray p-3.5">
            <p className="text-body-sm text-graphite" aria-live="polite">
              {dirty ? (
                <>
                  <span className="font-semibold text-ink">Belum disimpan.</span> {added.length > 0 && `${added.length} ditambah`}
                  {added.length > 0 && removed.length > 0 && ", "}
                  {removed.length > 0 && `${removed.length} dihapus (${removed.join(", ")})`}.
                </>
              ) : (
                "Semua perubahan sudah tersimpan."
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={save} disabled={!dirty}>
                <Save className="size-4" /> Simpan
              </Button>
              <Button variant="secondary" onClick={() => setDraft(saved)} disabled={!dirty}>
                Batalkan perubahan
              </Button>
              <Button variant="ghost" onClick={() => setDraft(DEFAULT_BANNED_KEYWORDS)} disabled={same(draft, DEFAULT_BANNED_KEYWORDS)}>
                <RotateCcw className="size-4" /> Pakai daftar bawaan
              </Button>
            </div>
          </div>

          <AdminSection className="mt-10" title="Kategori terlarang" description="Tidak bisa dipilih saat membuat listing. Kata kunci di atas menangkap yang lolos lewat kategori lain.">
            <ul className="divide-y divide-border-gray rounded-[12px] border border-border-gray">
              {FORBIDDEN_CATEGORIES.map((c) => (
                <li key={c} className="flex items-start gap-3 px-3.5 py-2.5 text-body-sm text-graphite">
                  <Ban className="mt-0.5 size-4 shrink-0 text-ink" />
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-caption text-smoke">Kendaraan bermotor boleh disewakan dengan syarat tambahan (SIM, STNK, foto odometer).</p>
          </AdminSection>
        </AdminSection>

        <KeywordTester keywords={draft} />
      </div>
    </>
  );
}

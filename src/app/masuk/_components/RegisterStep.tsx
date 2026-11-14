"use client";

import { ArrowLeft, ArrowRight, Store, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, Select, TextField } from "@/components/ui/Field";
import { AREAS } from "@/lib/data/areas";
import { useAppStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { AccountType, AreaId } from "@/lib/types";
import { formatPhone } from "./helpers";

type Errors = Partial<Record<"name" | "storeName" | "hours" | "email", string>>;

/** Step 3 (new number only): profile basics + account type (FR-A1, FR-A7). */
export function RegisterStep({ phone, onBack, onRegistered }: { phone: string; onBack: () => void; onRegistered: (userId: string) => void }) {
  const registerUser = useAppStore((s) => s.registerUser);
  const defaultArea = useAppStore((s) => s.search.areaId);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("individu");
  const [areaId, setAreaId] = useState<AreaId>(defaultArea);
  const [email, setEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeArea, setStoreArea] = useState<AreaId>(defaultArea);
  const [hours, setHours] = useState("08.00–21.00");
  const [errors, setErrors] = useState<Errors>({});

  const validate = (): Errors => {
    const e: Errors = {};
    if (name.trim().length < 3) e.name = "Tulis nama lengkap sesuai KTP.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Format email belum benar.";
    if (accountType === "toko") {
      if (storeName.trim().length < 3) e.storeName = "Tulis nama usahamu.";
      if (!hours.trim()) e.hours = "Isi jam operasional, mis. 08.00–21.00.";
    }
    return e;
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const res = registerUser({
      name: name.trim().replace(/\s+/g, " "),
      phone,
      email: email.trim() || undefined,
      accountType,
      areaId,
      store: accountType === "toko" ? { name: storeName.trim(), areaId: storeArea, hours: hours.trim() } : undefined,
    });
    if (!res.ok) return toast(res.error, "error");
    onRegistered(res.value);
  };

  const clear = (key: keyof Errors) => errors[key] && setErrors((e) => ({ ...e, [key]: undefined }));

  return (
    <section aria-labelledby="daftar-title">
      <button type="button" onClick={onBack} className="-ml-1 mb-4 inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-body-sm font-medium text-ink hover:bg-soft-gray">
        <ArrowLeft className="size-4" /> Pakai nomor lain
      </button>
      <h1 id="daftar-title" className="text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">
        Lengkapi akunmu
      </h1>
      <p className="mt-2 text-body text-smoke">
        Nomor <b className="font-semibold text-ink">{formatPhone(phone)}</b> sudah terverifikasi dan belum terdaftar. Tinggal sedikit lagi.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <TextField
          label="Nama lengkap"
          placeholder="Sesuai KTP"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clear("name");
          }}
          error={errors.name}
          help="Harus sama dengan KTP. Orang lain hanya melihat nama depanmu."
        />

        <div>
          <p className="mb-1.5 text-body-sm font-semibold text-ink">Tipe akun</p>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipe akun">
            <ChoiceCard
              selected={accountType === "individu"}
              onClick={() => setAccountType("individu")}
              icon={<UserRound className="size-4" />}
              title="Individu"
              description="Sewa dan sewakan barang pribadi."
            />
            <ChoiceCard
              selected={accountType === "toko"}
              onClick={() => setAccountType("toko")}
              icon={<Store className="size-4" />}
              title="Toko"
              description="Rental kecil: nama usaha, jam buka, stok lebih dari 1."
            />
          </div>
        </div>

        {accountType === "toko" && (
          <div className="animate-fade-up space-y-4 rounded-card bg-soft-gray p-4">
            <TextField
              label="Nama usaha"
              placeholder="mis. Bayu Outdoor & Kamera"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value);
                clear("storeName");
              }}
              error={errors.storeName}
            />
            <Select label="Area toko" value={storeArea} onChange={(e) => setStoreArea(e.target.value as AreaId)} help="Yang tampil ke penyewa hanya nama area, bukan alamat lengkap.">
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
            <TextField
              label="Jam operasional"
              placeholder="08.00–21.00"
              value={hours}
              onChange={(e) => {
                setHours(e.target.value);
                clear("hours");
              }}
              error={errors.hours}
            />
          </div>
        )}

        <Select label="Area tinggal / kos" value={areaId} onChange={(e) => setAreaId(e.target.value as AreaId)} help="Dipakai sebagai titik awal pencarian barang di sekitarmu.">
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </Select>

        <TextField
          label="Email"
          optional
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nama@mail.ugm.ac.id"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clear("email");
          }}
          error={errors.email}
          help="Untuk tanda terima kesepakatan sewa. Email kampus bisa jadi tanda mahasiswa."
        />

        <Button type="submit" size="lg" block>
          Buat akun <ArrowRight className="size-4" />
        </Button>
        <p className="text-center text-caption text-smoke">Setelah ini: verifikasi KTP + selfie (±1 menit) supaya bisa menyewa dan menyewakan.</p>
      </form>
    </section>
  );
}

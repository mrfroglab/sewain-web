"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Select, TextArea, TextField } from "@/components/ui/Field";
import { AREAS, AREA_BY_ID } from "@/lib/data/areas";
import { firstName, maskPhone } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { AreaId, User } from "@/lib/types";
import { METHOD_LABEL } from "@/app/verifikasi/_components/kyc";
import { EditButton, Empty, ListBox, Row, SectionTitle } from "./ui";

const BIO_MAX = 160;

/** "Data diri": nickname, email, area, campus, bio (updateUser). Full name and NIK are read-only. */
export function PersonalSection({ user }: { user: User }) {
  const [editing, setEditing] = useState(false);
  const v = user.verification;

  return (
    <section className="mt-10" aria-labelledby="data-diri">
      <SectionTitle
        id="data-diri"
        title="Data diri"
        description="Nama lengkap, nomor HP, dan NIK hanya terlihat olehmu dan admin."
        action={!editing ? <EditButton onClick={() => setEditing(true)} /> : undefined}
      />
      {editing ? (
        <PersonalForm user={user} onDone={() => setEditing(false)} />
      ) : (
        <ListBox>
          <Row label="Nama lengkap" value={user.name} note="Sesuai KTP" />
          <Row label="Nama panggilan" value={user.nickname ?? firstName(user.name)} note={user.nickname ? "Tampil ke pengguna lain" : "Default: nama depan"} />
          <Row label="Nomor HP" value={maskPhone(user.phone)} />
          <Row label="Email" value={user.email || <Empty />} />
          <Row label="Area tinggal" value={AREA_BY_ID[user.areaId]?.label ?? user.areaId} />
          <Row label="Kampus" value={user.campus || <Empty />} />
          <Row
            label="Identitas"
            value={v.status === "terverifikasi" ? `Terverifikasi${v.method ? ` · ${METHOD_LABEL[v.method]}` : ""}` : v.status === "menunggu" ? "Sedang ditinjau" : "Belum terverifikasi"}
            note={v.nikMasked && v.nikMasked !== "-" ? `NIK ${v.nikMasked}` : undefined}
          />
          <Row label="Bio" value={user.bio || <Empty>Ceritakan sedikit tentang dirimu</Empty>} stack />
        </ListBox>
      )}
    </section>
  );
}

function PersonalForm({ user, onDone }: { user: User; onDone: () => void }) {
  const updateUser = useAppStore((s) => s.updateUser);
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [areaId, setAreaId] = useState<AreaId>(user.areaId);
  const [campus, setCampus] = useState(user.campus ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const mail = email.trim();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return setEmailError("Format email belum benar.");
    updateUser(user.id, {
      nickname: nickname.trim() || undefined,
      email: mail || undefined,
      areaId,
      campus: campus.trim() || undefined,
      bio: bio.trim() || undefined,
    });
    toast("Data diri disimpan.", "success");
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-card border border-border-gray p-4" noValidate>
      <TextField
        label="Nama panggilan"
        optional
        maxLength={24}
        placeholder={firstName(user.name)}
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        help="Nama yang dilihat pengguna lain, mis. “Bu Tini”. Kosongkan untuk memakai nama depan."
      />
      <TextField
        label="Email"
        optional
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setEmailError(null);
        }}
        error={emailError}
      />
      <Select label="Area tinggal / kos" value={areaId} onChange={(e) => setAreaId(e.target.value as AreaId)} help="Hanya nama area yang tampil ke orang lain.">
        {AREAS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </Select>
      <TextField label="Kampus" optional placeholder="mis. UGM" maxLength={40} value={campus} onChange={(e) => setCampus(e.target.value)} />
      <TextArea
        label="Bio"
        optional
        maxLength={BIO_MAX}
        rows={3}
        placeholder="mis. Mahasiswa Teknik, suka naik gunung. Barang selalu dirawat."
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        help={`${bio.length}/${BIO_MAX} karakter`}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit">Simpan</Button>
      </div>
    </form>
  );
}

"use client";

import { Handshake, Lock, MapPin, Store, Truck } from "lucide-react";
import { ChoiceCard, Select } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Layout";
import { PUBLIC_MEETING_POINTS } from "@/lib/data/areas";
import { HANDOVER_LABEL } from "@/lib/data/categories";
import { rupiah } from "@/lib/format";
import { isHighValue } from "@/lib/pricing";
import type { CollateralRules, HandoverMethod } from "@/lib/types";
import { DEFAULT_CANCELLATION, HOUR_OPTIONS, isVehicle, lateFeeOf } from "./draft";
import { BigText, BigTextArea, Block, FieldShell, MoneyInput, NumberStepper, QuickPicks } from "./fields";
import { LocationPicker } from "./LocationPicker";
import type { ListingForm } from "./useListingForm";

const HANDOVER: { id: HandoverMethod; Icon: typeof Handshake; desc: string }[] = [
  { id: "cod", Icon: Handshake, desc: "Ketemuan di titik temu, sebaiknya tempat ramai" },
  { id: "jemput", Icon: Store, desc: "Penyewa datang mengambil ke tempatmu" },
  { id: "kurir", Icon: Truck, desc: "Penyewa pesan ojek/kurir sendiri" },
];

const HOUR_PRESETS: { label: string; from: string; to: string }[] = [
  { label: "Pagi 08.00–12.00", from: "08.00", to: "12.00" },
  { label: "Siang 12.00–16.00", from: "12.00", to: "16.00" },
  { label: "Sore 16.00–21.00", from: "16.00", to: "21.00" },
  { label: "Seharian 08.00–21.00", from: "08.00", to: "21.00" },
];

const SPECIAL_PICKS = ["Dikembalikan dalam keadaan bersih", "Tidak untuk disewakan lagi ke orang lain", "Jangan dipakai saat hujan"];
const RATING_PICKS = [4, 4.5, 4.8];

/** Step 5 — serah terima, lokasi + radius (FR-S2), denda, pembatalan, syarat, persetujuan (PRD 9.3). */
export function StepRules({ form, rules }: { form: ListingForm; rules: CollateralRules }) {
  const { draft, set, dispatch, visibleErrors: e } = form;
  const itemValue = draft.itemValue ?? 0;
  const lateFee = lateFeeOf(draft);
  const cap = Math.round((itemValue * (draft.lateFeeCapPercent ?? 0)) / 100);
  const vehicle = isVehicle(draft.category);
  const highValue = isHighValue(itemValue, rules);
  const autoBlocked = vehicle || highValue;
  const preset = HOUR_PRESETS.find((p) => p.from === draft.hoursFrom && p.to === draft.hoursTo);

  const toggleHandover = (id: HandoverMethod) =>
    set({ handover: draft.handover.includes(id) ? draft.handover.filter((h) => h !== id) : [...draft.handover, id] });

  return (
    <div className="space-y-8">
      <Block title="Cara serah terima" description="Boleh pilih lebih dari satu.">
        <div data-field="handover" data-error={e.handover ? "true" : undefined} className="space-y-2" role="group" aria-label="Cara serah terima">
          {HANDOVER.map(({ id, Icon, desc }) => (
            <ChoiceCard key={id} multi selected={draft.handover.includes(id)} onClick={() => toggleHandover(id)} icon={<Icon className="size-5" />} title={HANDOVER_LABEL[id]} description={desc} />
          ))}
          {e.handover && <p className="text-caption text-sale-text">{e.handover}</p>}
        </div>

        <div>
          <BigText
            label="Titik temu favorit"
            optional
            value={draft.meetingPoint}
            onChange={(v) => set({ meetingPoint: v })}
            placeholder={draft.handover.includes("jemput") && !draft.handover.includes("cod") ? "Mis. Warung Bu Tini, Klebengan" : "Mis. Lobi Perpustakaan Pusat UGM"}
            maxLength={120}
            help="Disarankan tempat publik yang ramai. Detailnya baru terlihat penyewa setelah request kamu setujui."
          />
          <p className="mt-3 flex items-center gap-1.5 text-caption font-medium text-graphite">
            <MapPin className="size-3.5" /> Saran tempat publik
          </p>
          <QuickPicks items={PUBLIC_MEETING_POINTS} active={draft.meetingPoint} onPick={(v) => set({ meetingPoint: v })} className="mt-1.5" />
        </div>

        <FieldShell label="Jam serah terima" optional anchor="hours" error={e.hours} help="Kosongkan kalau jamnya diatur lewat chat.">
          <QuickPicks
            items={HOUR_PRESETS.map((p) => p.label)}
            active={preset?.label}
            onPick={(label) => {
              const p = HOUR_PRESETS.find((x) => x.label === label)!;
              set({ hoursFrom: p.from, hoursTo: p.to });
            }}
            className="mb-3"
          />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Select aria-label="Jam mulai" value={draft.hoursFrom} onChange={(ev) => set({ hoursFrom: ev.target.value })}>
              <option value="">Mulai</option>
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </Select>
            <span className="text-smoke">–</span>
            <Select aria-label="Jam selesai" value={draft.hoursTo} onChange={(ev) => set({ hoursTo: ev.target.value })}>
              <option value="">Selesai</option>
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </Select>
          </div>
        </FieldShell>
      </Block>

      <Block title="Lokasi & jangkauan" description="Listing hanya muncul untuk penyewa yang jaraknya masuk radius jangkauanmu.">
        <LocationPicker
          areaId={draft.areaId}
          point={draft.point}
          radiusKm={draft.radiusKm}
          onArea={(areaId) => dispatch({ type: "area", areaId })}
          onPoint={(point, areaId) => dispatch({ type: "point", point, areaId })}
        />
        <FieldShell label="Radius jangkauan" htmlFor="radius">
          <div className="flex items-center gap-4">
            <input
              id="radius"
              type="range"
              min={1}
              max={25}
              step={0.5}
              value={draft.radiusKm}
              onChange={(ev) => set({ radiusKm: Number(ev.target.value) })}
              className="h-10 min-w-0 flex-1 cursor-pointer accent-ink"
            />
            <span className="w-16 shrink-0 text-right text-body-lg font-semibold text-ink">{draft.radiusKm.toLocaleString("id-ID")} km</span>
          </div>
          <div className="flex justify-between text-micro text-ash">
            <span>1 km</span>
            <span>25 km</span>
          </div>
        </FieldShell>
      </Block>

      <Block title="Denda telat" description="Default Sewain: sama dengan harga harian, maksimal 100% nilai barang.">
        <MoneyInput
          label="Denda per hari telat"
          anchor="lateFee"
          value={lateFee}
          onChange={(v) => set({ lateFeePerDay: v ?? 0 })}
          suffix="/hari"
          error={e.lateFee}
          help={
            draft.lateFeePerDay == null ? (
              "Mengikuti harga harian."
            ) : (
              <button type="button" className="font-medium text-ink underline underline-offset-2" onClick={() => set({ lateFeePerDay: null })}>
                Samakan lagi dengan harga harian
              </button>
            )
          }
        />
        <NumberStepper
          label="Batas maksimal denda"
          anchor="lateFeeCap"
          value={draft.lateFeeCapPercent}
          onChange={(v) => set({ lateFeeCapPercent: v })}
          min={10}
          max={100}
          step={10}
          suffix="% nilai barang"
          error={e.lateFeeCap}
          help={itemValue ? `Total denda paling banyak ${rupiah(cap)}.` : undefined}
        />
      </Block>

      <Block title="Pembatalan & syarat">
        <div>
          <BigTextArea label="Kebijakan pembatalan" anchor="cancellation" value={draft.cancellation} onChange={(v) => set({ cancellation: v })} rows={2} maxLength={200} error={e.cancellation} />
          {draft.cancellation !== DEFAULT_CANCELLATION && (
            <button type="button" className="mt-1.5 text-caption font-medium text-ink underline underline-offset-2" onClick={() => set({ cancellation: DEFAULT_CANCELLATION })}>
              Pakai default: gratis jika batal &gt; 24 jam sebelumnya
            </button>
          )}
        </div>
        <div>
          <BigTextArea label="Syarat khusus" optional value={draft.special} onChange={(v) => set({ special: v })} rows={2} maxLength={200} placeholder="Mis. dikembalikan dalam keadaan bersih" />
          <QuickPicks items={SPECIAL_PICKS} active={draft.special} onPick={(v) => set({ special: v })} />
        </div>
      </Block>

      <Block title="Persetujuan request">
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Cara persetujuan">
          <ChoiceCard selected={draft.approval === "manual" || autoBlocked} onClick={() => set({ approval: "manual" })} title="Manual" description="Kamu cek profil & rating penyewa, lalu setujui atau tolak." />
          <ChoiceCard
            selected={draft.approval === "otomatis" && !autoBlocked}
            onClick={() => set({ approval: "otomatis" })}
            disabled={autoBlocked}
            icon={autoBlocked ? <Lock className="size-4" /> : undefined}
            title="Otomatis"
            description="Langsung disetujui untuk penyewa dengan rating tinggi."
          />
        </div>
        {autoBlocked ? (
          <Notice>
            Persetujuan otomatis tidak tersedia untuk {vehicle ? "kendaraan" : `barang bernilai di atas ${rupiah(rules.highValueBadge)}`}. Kamu selalu cek penyewanya dulu.
          </Notice>
        ) : (
          draft.approval === "otomatis" && (
            <FieldShell label="Hanya untuk penyewa dengan rating minimal" help="Penyewa di bawah ambang ini tetap perlu persetujuan manual.">
              <div className="flex flex-wrap gap-2">
                {RATING_PICKS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={draft.autoApproveMinRating === r}
                    onClick={() => set({ autoApproveMinRating: r })}
                    className={
                      draft.autoApproveMinRating === r
                        ? "h-10 rounded-control border border-ink bg-ink px-4 text-body-sm font-semibold text-white"
                        : "h-10 rounded-control border border-border-gray bg-white px-4 text-body-sm font-semibold text-ink hover:border-ink"
                    }
                  >
                    ≥ {r.toLocaleString("id-ID", { minimumFractionDigits: 1 })}
                  </button>
                ))}
              </div>
            </FieldShell>
          )
        )}
      </Block>
    </div>
  );
}

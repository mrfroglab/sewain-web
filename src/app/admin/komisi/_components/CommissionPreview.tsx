"use client";

import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { rupiah } from "@/lib/format";
import { computeCommission } from "@/lib/pricing";
import type { CommissionConfig } from "@/lib/types";

/** Sample rents for the live preview (PRD 14.3 uses Rp50rb / Rp75rb / Rp100rb). */
const SAMPLE_RENTS = [15_000, 50_000, 75_000, 100_000, 500_000];
/** PRD 14.3: QRIS MDR 0,7% of everything paid (rent + an average cash deposit of Rp100rb). */
export const QRIS_MDR = 0.007;
export const AVG_DEPOSIT = 100_000;

interface PreviewRow {
  rent: number;
  amount: number;
  limit?: "min" | "maks";
  renter: number;
  provider: number;
  qris: number;
  net: number;
}

function rowFor(rent: number, cfg: CommissionConfig): PreviewRow {
  // Always preview "seandainya aktif" so the split is visible while the pilot is at 0% (FR-K6).
  const c = computeCommission(rent, { ...cfg, active: true });
  const raw = cfg.mode === "persen" ? Math.round((rent * cfg.percent) / 100) : cfg.flat;
  const limit = cfg.min != null && raw < cfg.min ? "min" : cfg.max != null && raw > cfg.max ? "maks" : undefined;
  const qris = Math.round(QRIS_MDR * (rent + AVG_DEPOSIT));
  return { rent, amount: c.amount, limit, renter: c.renterPays, provider: c.providerPays, qris, net: c.amount - qris };
}

const signed = (n: number) => (n < 0 ? `−${rupiah(-n)}` : rupiah(n));

/** Live table: commission, who pays, QRIS cost and net contribution per transaction (PRD 14.3). */
export function CommissionPreview({ cfg }: { cfg: CommissionConfig }) {
  const rows = SAMPLE_RENTS.map((r) => rowFor(r, cfg));
  const suffix = cfg.active ? "" : " (seandainya)";

  return (
    <div>
      {!cfg.active && (
        <p className="mb-3 rounded-[12px] bg-soft-gray p-3 text-body-sm text-graphite">
          <span className="font-semibold text-ink">Komisi nonaktif:</span> penyewa dan penyedia membayar Rp0. Angka di bawah adalah nilai “seandainya aktif” yang tetap dicatat untuk analisis.
        </p>
      )}

      {/* Phones: one block per sample rent. */}
      <ul className="divide-y divide-border-gray border-y border-border-gray sm:hidden">
        {rows.map((r) => (
          <li key={r.rent} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-body font-semibold text-ink">Sewa {rupiah(r.rent)}</p>
              <p className="text-body-sm font-semibold text-ink">
                Komisi {rupiah(r.amount)}
                {r.limit && <span className="ml-1 font-normal text-smoke">({r.limit})</span>}
              </p>
            </div>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-caption">
              <Cell k="Penyewa" v={rupiah(r.renter)} />
              <Cell k="Penyedia" v={rupiah(r.provider)} />
              <Cell k="Biaya QRIS" v={`−${rupiah(r.qris)}`} />
              <Cell k={`Kontribusi${suffix}`} v={signed(r.net)} strong />
            </dl>
          </li>
        ))}
      </ul>

      {/* Tablet & desktop: table. */}
      <div className="hidden sm:block">
        <table className="w-full text-left text-body-sm tabular-nums">
          <thead>
            <tr className="border-b border-ink text-caption text-smoke">
              <Th>Nilai sewa</Th>
              <Th right>Komisi{suffix}</Th>
              <Th right>Penyewa</Th>
              <Th right>Penyedia</Th>
              <Th right>Biaya QRIS 0,7%</Th>
              <Th right>Kontribusi bersih</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-gray">
            {rows.map((r) => (
              <tr key={r.rent}>
                <td className="py-2.5 pr-3 font-semibold text-ink">{rupiah(r.rent)}</td>
                <td className="py-2.5 pl-3 text-right text-ink">
                  {rupiah(r.amount)}
                  {r.limit && <span className="block text-micro text-smoke">kena {r.limit === "min" ? "minimum" : "maksimum"}</span>}
                </td>
                <td className="py-2.5 pl-3 text-right text-graphite">{rupiah(r.renter)}</td>
                <td className="py-2.5 pl-3 text-right text-graphite">{rupiah(r.provider)}</td>
                <td className="py-2.5 pl-3 text-right text-graphite">−{rupiah(r.qris)}</td>
                <td className={cn("py-2.5 pl-3 text-right font-semibold", r.net < 0 ? "text-smoke" : "text-ink")}>{signed(r.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-caption text-smoke">
        Biaya QRIS = MDR 0,7% × (sewa + deposit uang rata-rata {rupiah(AVG_DEPOSIT)}), sesuai ilustrasi PRD 14.3. Saat pilot pembayaran masih di luar platform, jadi biaya ini belum terjadi. Biaya
        pengembalian deposit belum dihitung.
      </p>
    </div>
  );
}

function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return <th className={cn("py-2 font-medium", right ? "pl-3 text-right" : "pr-3")}>{children}</th>;
}

function Cell({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-smoke">{k}</dt>
      <dd className={strong ? "font-semibold text-ink" : "text-graphite"}>{v}</dd>
    </div>
  );
}

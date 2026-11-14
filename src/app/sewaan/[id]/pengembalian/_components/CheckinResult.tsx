"use client";

import { CircleCheck, Flag, HandCoins, Scale, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EvidenceGrid } from "@/components/photo/EvidencePhoto";
import { ButtonLink } from "@/components/ui/Button";
import { formatDateTime, relativeTime } from "@/lib/format";
import { describeCollateral } from "@/lib/pricing";
import { publicName } from "@/lib/selectors";
import { useNow } from "@/lib/store";
import type { BookingCtx } from "../../serah-terima/_shared/BookingFrame";
import { ComparisonRows } from "../../serah-terima/_shared/Comparison";
import { useBookingEvidence } from "../../serah-terima/_shared/evidence";
import { SectionTitle, StateHero, VehicleReadout } from "../../serah-terima/_shared/ui";

/** Check-in recorded: result, next step (collateral / dispute), and the side-by-side record. */
export function CheckinResult({ ctx }: { ctx: BookingCtx }) {
  const { booking } = ctx;
  const ev = useBookingEvidence(booking);
  const checkin = booking.checkin!;
  const ok = checkin.result === "sesuai";

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <StateHero icon={ok ? <CircleCheck className="size-7" /> : <TriangleAlert className="size-6" />} title={ok ? "Barang kembali, kondisi sesuai" : `Ada masalah: ${checkin.problemType ?? "lainnya"}`}>
        Dicatat penyedia pada {formatDateTime(checkin.at)}.
        {!ok && checkin.problemNote && <span className="mt-2 block text-smoke">“{checkin.problemNote}”</span>}
      </StateHero>

      <NextStep ctx={ctx} />

      <section>
        <SectionTitle title="Serah terima vs pengembalian" description="Berdampingan per sudut. Ketuk foto untuk memperbesar." />
        <ComparisonRows
          rowLabels={ev.angles}
          bookingCode={booking.code}
          columns={[
            { label: "Check-out", cells: ev.checkout.map((id) => ({ kind: "photo" as const, id })) },
            { label: "Check-in", cells: ev.checkin.map((id) => ({ kind: "photo" as const, id })) },
          ]}
        />
      </section>

      {(booking.checkout?.odometer || checkin.odometer) && (
        <section>
          <SectionTitle title="Odometer & BBM" description="Saat serah terima → saat kembali." />
          <VehicleReadout out={{ odometer: booking.checkout?.odometer, fuel: booking.checkout?.fuel }} back={{ odometer: checkin.odometer, fuel: checkin.fuel }} />
        </section>
      )}

      {ev.problem.length > 0 && (
        <section>
          <SectionTitle title={`Foto masalah (${ev.problem.length})`} />
          <EvidenceGrid ids={ev.problem} bookingCode={booking.code} cols={3} />
        </section>
      )}
    </div>
  );
}

function NextStep({ ctx }: { ctx: BookingCtx }) {
  const { booking, role, renter, provider } = ctx;
  const now = useNow();
  const id = booking.id;
  const collateral = describeCollateral(booking.collateral, booking.agreement.itemValue);
  const ret = booking.collateralReturn;

  let title: string;
  let body: ReactNode;
  let action: ReactNode = (
    <ButtonLink href={`/sewaan/${id}`} size="lg">
      Ke detail sewaan
    </ButtonLink>
  );

  switch (booking.status) {
    case "DISPUTED":
      title = "Sengketa dibuka · negosiasi 48 jam";
      body = "Kedua pihak bisa mengajukan solusi berdasarkan bukti di bawah. Kalau buntu, naik ke mediasi admin.";
      action = (
        <ButtonLink href={`/sewaan/${id}/sengketa`} size="lg">
          <Scale className="size-4" /> Buka sengketa
        </ButtonLink>
      );
      break;
    case "RESOLVED":
      title = "Sengketa sudah selesai";
      body = ret?.providerReturnedAt ? "Jaminan sudah ditandai dikembalikan." : "Kembalikan jaminan atau sisa deposit sesuai hasil sengketa, lalu saling memberi rating.";
      action = (
        <>
          <ButtonLink href={`/sewaan/${id}`} size="lg">
            Ke detail sewaan
          </ButtonLink>
          <ButtonLink href={`/sewaan/${id}/sengketa`} size="lg" variant="secondary">
            Lihat hasil sengketa
          </ButtonLink>
        </>
      );
      break;
    case "COMPLETED":
      title = "Sewa selesai";
      body = "Jaminan sudah kembali. Jangan lupa saling memberi rating.";
      break;
    default:
      // RETURNED
      if (role === "penyedia" || role === "admin") {
        title = ret?.providerReturnedAt ? "Menunggu konfirmasi penyewa" : "Langkah berikutnya: kembalikan jaminan";
        body = ret?.providerReturnedAt
          ? `Jaminan sudah ditandai dikembalikan. ${publicName(renter)} tinggal konfirmasi${ret.autoCompleteAt ? `; otomatis selesai ${relativeTime(ret.autoCompleteAt, now)}` : ""}.`
          : `Serahkan kembali jaminan (${collateral}) ke ${publicName(renter)}, lalu tandai “Jaminan dikembalikan” di halaman sewaan.`;
        if (role === "penyedia" && !ret?.providerReturnedAt)
          action = (
            <ButtonLink href={`/sewaan/${id}`} size="lg">
              <HandCoins className="size-4" /> Kembalikan jaminan
            </ButtonLink>
          );
      } else {
        title = ret?.providerReturnedAt ? "Konfirmasi jaminan diterima" : `Tunggu ${publicName(provider)} mengembalikan jaminan`;
        body = ret?.providerReturnedAt
          ? `${publicName(provider)} menandai jaminan (${collateral}) sudah dikembalikan. Konfirmasi kalau sudah kamu terima.`
          : `Jaminanmu: ${collateral}. Setelah ditandai dikembalikan, konfirmasi di halaman sewaan.`;
      }
  }

  return (
    <section className="rounded-card border border-border-gray p-4 sm:p-5">
      <p className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">Langkah berikutnya</p>
      <h2 className="mt-1 text-body-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-body-sm text-graphite">{body}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">{action}</div>
      {booking.status === "RETURNED" && role !== "admin" && (
        <p className="mt-4 flex items-start gap-2 text-caption text-smoke">
          <Flag className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Ada yang tidak beres (mis. jaminan atau deposit ditahan)?{" "}
            <Link href={`/sewaan/${id}/sengketa`} className="font-medium text-ink underline underline-offset-4">
              Laporkan masalah
            </Link>
          </span>
        </p>
      )}
    </section>
  );
}

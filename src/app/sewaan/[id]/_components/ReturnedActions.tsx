"use client";

import { ClipboardCheck, Flag, Timer } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { formatDateTime, rupiah } from "@/lib/format";
import { ActionButtons, InfoLine } from "./ActionBits";
import { CollateralActions } from "./CollateralActions";
import { lateInfo, type BookingView } from "./shared";

/** RETURNED: check-in result + collateral return/confirm (48h auto-complete). Either side may still open a dispute. */
export function ReturnedActions({ view }: { view: BookingView }) {
  const { b, role, now } = view;
  const ci = b.checkin;
  const late = lateInfo(b, now);
  return (
    <>
      <CollateralActions view={view} />

      <div className="mt-4 space-y-3 rounded-[12px] bg-soft-gray p-3.5">
        <InfoLine icon={<ClipboardCheck className="size-4" />} label={`Hasil check-in${ci ? ` · ${formatDateTime(ci.at)}` : ""}`}>
          {ci?.result === "masalah" ? (
            <>
              <span className="font-semibold text-ink">Ada masalah: {ci.problemType}</span>
              {ci.problemNote && <span className="block">{ci.problemNote}</span>}
            </>
          ) : (
            <span className="font-semibold text-ink">Kondisi sesuai dengan saat serah terima</span>
          )}
        </InfoLine>
        {late && (
          <InfoLine icon={<Timer className="size-4" />} label="Telat dikembalikan">
            {late.days} hari · denda {rupiah(late.fee)} sesuai kesepakatan
          </InfoLine>
        )}
      </div>

      {role !== "admin" && (
        <ActionButtons>
          <ButtonLink href={`/sewaan/${b.id}/sengketa`} variant="secondary">
            <Flag className="size-4" /> Laporkan masalah
          </ButtonLink>
        </ActionButtons>
      )}
    </>
  );
}

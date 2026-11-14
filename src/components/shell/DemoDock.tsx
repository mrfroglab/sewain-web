"use client";

import { Clock, FastForward, FlaskConical, RotateCcw, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABEL, publicName } from "@/lib/selectors";
import { useCurrentUser, useReady, useSession } from "@/lib/session";
import { useAppStore, useNow } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { BookingStatus } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";
import { Sheet } from "../ui/Sheet";

const H = 3_600_000;

/** Jump straight to any stage of the rental cycle, as the right account (PRD 7.2 "lompat ke tahap mana pun"). */
const JUMPS: { status: BookingStatus | "OVERDUE"; bookingId: string; as: string; note: string }[] = [
  { status: "REQUESTED", bookingId: "b-requested", as: "u-bayu", note: "Mas Bayu menyetujui request Raka" },
  { status: "ACCEPTED", bookingId: "b-accepted", as: "u-dina", note: "Dina memotret serah terima" },
  { status: "ACTIVE", bookingId: "b-active", as: "u-bayu", note: "Mas Bayu menerima tenda kembali" },
  { status: "OVERDUE", bookingId: "b-overdue", as: "u-raka", note: "Raka telat mengembalikan panci" },
  { status: "RETURNED", bookingId: "b-returned", as: "u-dina", note: "Dina mengembalikan jaminan Sinta" },
  { status: "COMPLETED", bookingId: "b-completed", as: "u-raka", note: "Raka memberi rating" },
  { status: "DISPUTED", bookingId: "b-disputed", as: "u-admin", note: "Admin memediasi sengketa lensa" },
  { status: "RESOLVED", bookingId: "b-resolved", as: "u-sinta", note: "Hasil sengketa action cam" },
];

/** Open the demo panel from anywhere (the mobile header has a small flask button). */
export const openDemoPanel = () => window.dispatchEvent(new Event("sewain:demo"));

/** Floating "Mode demo" control: switch account, fast-forward the clock, jump to a status, reset data. */
export function DemoDock() {
  const ready = useReady();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const user = useCurrentUser();
  const signIn = useSession((s) => s.signIn);
  const users = useAppStore((s) => s.users);
  const offset = useAppStore((s) => s.clockOffset);
  const advanceClock = useAppStore((s) => s.advanceClock);
  const resetClock = useAppStore((s) => s.resetClock);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const bookings = useAppStore((s) => s.bookings);
  const now = useNow(10_000);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("sewain:demo", onOpen);
    return () => window.removeEventListener("sewain:demo", onOpen);
  }, []);
  if (!ready) return null;
  const demoUsers = users.filter((u) => u.demo);

  const switchTo = (id: string, href?: string) => {
    signIn(id);
    const u = users.find((x) => x.id === id);
    toast(`Sekarang sebagai ${publicName(u)}.`, "success");
    if (href) router.push(href);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-[550] hidden h-9 items-center gap-1.5 rounded-control bg-white px-3 text-caption font-semibold text-ink shadow-floating ring-1 ring-black/5 lg:inline-flex"
        aria-label="Buka panel mode demo"
      >
        <FlaskConical className="size-4" />
        Demo
        {user && <span className="max-w-20 truncate font-normal text-smoke">· {publicName(user)}</span>}
        {offset > 0 && <span className="rounded-control bg-ink px-1.5 py-0.5 text-[9px] text-white">+{Math.round(offset / H)}j</span>}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Mode demo" description="Alat bantu presentasi. OTP, eKYC, dan pembayaran disimulasikan; data tersimpan di browser ini." size="lg">
        <section>
          <p className="mb-2 flex items-center gap-2 text-body-sm font-semibold">
            <Users className="size-4" /> Ganti akun
          </p>
          <p className="mb-3 text-caption text-smoke">Tips: buka dua jendela, satu sebagai penyewa dan satu sebagai penyedia. Data tersinkron otomatis.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {demoUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => switchTo(u.id)}
                className={cn("flex items-center gap-3 rounded-[12px] border p-2.5 text-left", user?.id === u.id ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-border-gray hover:border-ash")}
              >
                <Avatar name={u.name} size={34} dark={u.role === "admin"} />
                <span className="min-w-0">
                  <span className="block text-body-sm font-semibold">{u.demo!.label}</span>
                  <span className="block truncate text-caption text-smoke">{u.demo!.persona}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <p className="mb-2 flex items-center gap-2 text-body-sm font-semibold">
            <FastForward className="size-4" /> Lompat ke tahap sewa
          </p>
          <div className="divide-y divide-border-gray rounded-[12px] border border-border-gray">
            {JUMPS.map((j) => {
              const b = bookings.find((x) => x.id === j.bookingId);
              if (!b) return null;
              const label = j.status === "OVERDUE" ? "Telat (OVERDUE)" : STATUS_LABEL[j.status];
              return (
                <button key={j.bookingId} type="button" onClick={() => switchTo(j.as, `/sewaan/${j.bookingId}`)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-soft-gray">
                  <span className="min-w-0">
                    <span className="block text-body-sm font-medium">{label}</span>
                    <span className="block truncate text-caption text-smoke">{j.note}</span>
                  </span>
                  <span className="shrink-0 text-caption text-graphite">{STATUS_LABEL[b.status]}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <p className="mb-1 flex items-center gap-2 text-body-sm font-semibold">
            <Clock className="size-4" /> Percepat waktu
          </p>
          <p className="mb-3 text-caption text-smoke">
            Jam demo: {formatDateTime(now)}
            {offset > 0 && ` (+${Math.round(offset / H)} jam)`}. Untuk menguji kadaluarsa 24 jam, telat kembali, dan selesai otomatis 48 jam.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => advanceClock(H)}>
              +1 jam
            </Button>
            <Button variant="secondary" size="sm" onClick={() => advanceClock(24 * H)}>
              +1 hari
            </Button>
            <Button variant="secondary" size="sm" onClick={() => advanceClock(48 * H)}>
              +2 hari
            </Button>
            <Button variant="ghost" size="sm" onClick={resetClock} disabled={!offset}>
              <RotateCcw className="size-3.5" /> Jam normal
            </Button>
          </div>
        </section>

        <section className="mt-6 rounded-[12px] bg-soft-gray p-3.5">
          <p className="text-body-sm font-semibold">Reset data demo</p>
          <p className="mt-0.5 text-caption text-smoke">Kembalikan semua listing, booking, chat, dan pengaturan ke kondisi awal.</p>
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            onClick={() => {
              if (!window.confirm("Reset semua data demo di browser ini?")) return;
              resetDemo();
              toast("Data demo direset.", "success");
              setOpen(false);
              router.push("/");
            }}
          >
            <RotateCcw className="size-3.5" /> Reset data
          </Button>
        </section>
      </Sheet>
    </>
  );
}

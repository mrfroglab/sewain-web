import { BadgeCheck, Clock, Plus, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { areaName } from "@/lib/data/areas";
import { isVerified, publicName } from "@/lib/selectors";
import type { User } from "@/lib/types";

/** Title, account type (Individu/Toko, FR-A7) and the main "Sewakan barang" action. */
export function DashboardHeader({ user }: { user: User }) {
  const toko = user.accountType === "toko" && user.store;
  return (
    <header className="flex flex-col gap-4 pb-6 pt-4 sm:flex-row sm:items-end sm:justify-between lg:pt-8">
      <div className="min-w-0">
        <p className="text-body-sm text-smoke">Halo, {publicName(user)}</p>
        <h1 className="mt-0.5 text-[24px] font-semibold leading-tight tracking-[-0.6px] text-ink lg:text-[28px]">Dashboard penyedia</h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-sm">
          {toko ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                <Store className="size-4" /> {user.store!.name}
              </span>
              <span className="inline-flex items-center gap-1.5 text-smoke">
                <Clock className="size-3.5" /> Buka {user.store!.hours} · {areaName(user.store!.areaId)}
              </span>
              <span className="rounded-control bg-soft-gray px-2 py-0.5 text-caption font-medium text-graphite">Akun Toko</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                <UserRound className="size-4" /> Akun Individu
              </span>
              <Link href="/profil#akun-toko" className="text-smoke underline underline-offset-2 hover:text-ink">
                Punya usaha rental? Upgrade ke akun Toko
              </Link>
            </>
          )}
          {isVerified(user) && (
            <span className="inline-flex items-center gap-1 text-caption font-medium text-graphite">
              <BadgeCheck className="size-3.5" /> Terverifikasi
            </span>
          )}
        </div>
      </div>
      {isVerified(user) && (
        <ButtonLink href="/penyedia/barang/baru" size="lg" className="w-full shrink-0 sm:w-auto">
          <Plus className="size-4" /> Sewakan barang
        </ButtonLink>
      )}
    </header>
  );
}

"use client";

import { RequireAuth, RequireVerified } from "@/components/ui/Gate";
import { Container } from "@/components/ui/Layout";
import type { User } from "@/lib/types";
import { DashboardHeader } from "./DashboardHeader";
import { IncomingRequests } from "./IncomingRequests";
import { MyListings } from "./MyListings";
import { OngoingList } from "./OngoingList";
import { RulesExplainer } from "./RulesExplainer";
import { StatsRow } from "./StatsRow";
import { useProviderData } from "./useProviderData";

/** /penyedia — PRD 8.2 / 9.3. Signed-in only; unverified accounts see the verification card (FR-A6). */
export function ProviderDashboard() {
  return (
    <RequireAuth>
      {(user) => (
        <Container className="pb-10">
          <DashboardHeader user={user} />
          {user.verification.status === "terverifikasi" && user.status === "aktif" ? (
            <Dashboard user={user} />
          ) : (
            <div className="space-y-10">
              <RequireVerified user={user}>{null}</RequireVerified>
              <RulesExplainer />
            </div>
          )}
        </Container>
      )}
    </RequireAuth>
  );
}

function Dashboard({ user }: { user: User }) {
  const data = useProviderData(user);
  return (
    <div className="space-y-12">
      <StatsRow data={data} />
      <IncomingRequests data={data} user={user} />
      <OngoingList rows={data.ongoing} />
      <MyListings listings={data.mine} user={user} />
      <RulesExplainer />
    </div>
  );
}

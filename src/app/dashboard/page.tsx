import { DashboardClient } from "@/app/dashboard/DashboardClient";
import { SignInCard } from "@/components/SignInCard";
import { listHouseCalls } from "@/lib/repository/calls";
import { listHousesByOwner } from "@/lib/repository/houses";
import { listMessagesByCall } from "@/lib/repository/messages";
import { getCurrentUserProfile } from "@/lib/repository/users";
import type { Message } from "@/types";

export default async function DashboardPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-slate-950 p-8">
        <SignInCard />
      </main>
    );
  }

  const houses = await listHousesByOwner(profile.id);

  const callsWithMessages = await Promise.all(
    houses.map(async (house) => {
      const houseCalls = await listHouseCalls(house.id);
      const recentCalls = houseCalls.slice(0, 10);

      const messageEntries = await Promise.all(
        recentCalls.map(async (call) => {
          const callMessages = await listMessagesByCall(call.id);
          return [call.id, callMessages as Message[]] as const;
        })
      );

      return {
        house,
        calls: recentCalls.map((call) => ({ ...call, house })),
        messages: Object.fromEntries(messageEntries)
      };
    })
  );

  const allCalls = callsWithMessages.flatMap((item) => item.calls);
  const messageMap = callsWithMessages.reduce<Record<string, Message[]>>(
    (acc, item) => {
      Object.assign(acc, item.messages);
      return acc;
    },
    {}
  );

  return (
    <main className="flex flex-1 flex-col gap-6 bg-slate-950 p-6">
      <DashboardClient
        profile={profile}
        houses={houses}
        calls={allCalls}
        messages={messageMap}
      />
    </main>
  );
}


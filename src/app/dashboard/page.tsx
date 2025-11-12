import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { DashboardClient } from "@/app/dashboard/DashboardClient";
import { SignInCard } from "@/components/SignInCard";
import { env } from "@/lib/env";
import { listHouseCalls } from "@/lib/repository/calls";
import { listHousesByOwner } from "@/lib/repository/houses";
import { listMessagesByCall } from "@/lib/repository/messages";
import { getUserProfileById, upsertUserProfile } from "@/lib/repository/users";
import type { Message } from "@/types";
import type { Database } from "@/types/database";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function createDashboardSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: any) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options?: any) {
        cookieStore.delete(name);
      }
    }
  });
}

export default async function DashboardPage() {
  const supabase = await createDashboardSupabase();
  
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[SmartBell] dashboard getUser error", userError);
  }

  if (!user) {
    console.log("[SmartBell] dashboard: no user, showing sign in");
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8">
        <SignInCard />
      </main>
    );
  }

  console.log("[SmartBell] dashboard: user authenticated", user.email);

  let profile = await getUserProfileById(user.id);

  if (!profile) {
    profile = {
      id: user.id,
      email: user.email ?? "",
      fcm_token: null,
      role: "morador"
    };

    await upsertUserProfile(profile);
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
    <main className="flex min-h-screen flex-col gap-6 bg-slate-950 p-6">
      <DashboardClient
        profile={profile}
        houses={houses}
        calls={allCalls}
        messages={messageMap}
      />
    </main>
  );
}


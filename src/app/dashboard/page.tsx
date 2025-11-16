import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { DashboardClient } from "@/app/dashboard/DashboardClient";
import { SignInCard } from "@/components/SignInCard";
import { env } from "@/lib/env";
import type { Call, House, Message, UserProfile } from "@/types";
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
        try {
          // O Supabase gerencia as opções dos cookies, apenas passamos o que ele pedir
          if (options) {
            cookieStore.set(name, value, options);
          } else {
            cookieStore.set(name, value);
          }
        } catch (err) {
          console.warn("[SmartBell] cookie set warning", err);
        }
      },
      remove(name: string) {
        try {
          cookieStore.delete(name);
        } catch (err) {
          console.warn("[SmartBell] cookie remove warning", err);
        }
      }
    }
  });
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createDashboardSupabase();
  const params = await searchParams;
  
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[SmartBell] dashboard getUser error", userError);
  }

  if (!user) {
    console.log("[SmartBell] dashboard: no user, showing sign in");
    const errorMessage = params.error === "code_invalid" 
      ? "O link de acesso expirou ou já foi usado. Solicite um novo link."
      : params.error === "auth_failed"
      ? "Falha na autenticação. Tente novamente."
      : null;
    
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8">
        <SignInCard errorMessage={errorMessage} />
      </main>
    );
  }

  console.log("[SmartBell] dashboard: user authenticated", user.email);

  const {
    data: profileRow,
    error: profileError
  } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[SmartBell] dashboard profile fetch error", profileError);
  }

  let profile = profileRow as UserProfile | null;

  if (!profile) {
    const upsertPayload =
      {
        id: user.id,
        email: user.email ?? "",
        fcm_token: null,
        role: "morador"
      } satisfies Database["public"]["Tables"]["users"]["Insert"];

    const supabaseUsers = supabase.from("users") as unknown as {
      upsert(
        values: Database["public"]["Tables"]["users"]["Insert"][],
        options?: { onConflict?: string }
      ): {
        select(): {
          single(): Promise<{
            data: Database["public"]["Tables"]["users"]["Row"] | null;
            error: unknown;
          }>;
        };
      };
    };

    const {
      data: insertedProfile,
      error: insertProfileError
    } = await supabaseUsers
      .upsert([upsertPayload], { onConflict: "id" })
      .select()
      .single();

    if (insertProfileError || !insertedProfile) {
      console.error("[SmartBell] dashboard profile upsert error", insertProfileError);
      throw new Error("Não foi possível carregar o perfil do usuário.");
    }

    profile = insertedProfile as UserProfile;
  }

  const {
    data: housesData,
    error: housesError
  } = await supabase
    .from("houses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (housesError) {
    console.error("[SmartBell] dashboard houses fetch error", housesError);
  }

  const houses = (housesData ?? []) as House[];

  const callsWithMessages = await Promise.all(
    houses.map(async (house) => {
      const {
        data: houseCallsData,
        error: houseCallsError
      } = await supabase
        .from("calls")
        .select("*")
        .eq("house_id", house.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (houseCallsError) {
        console.error("[SmartBell] dashboard calls fetch error", houseCallsError);
        return {
          house,
          calls: [] as (Call & { house: House })[],
          messages: {} as Record<string, Message[]>
        };
      }

      const recentCalls = ((houseCallsData ?? []) as Call[]).slice(0, 10);

      const messageEntries = await Promise.all(
        recentCalls.map(async (call) => {
          const {
            data: callMessagesData,
            error: callMessagesError
          } = await supabase
            .from("messages")
            .select("*")
            .eq("call_id", call.id)
            .order("created_at", { ascending: true });

          if (callMessagesError) {
            console.error("[SmartBell] dashboard messages fetch error", callMessagesError);
            return [call.id, [] as Message[]] as const;
          }

          return [call.id, (callMessagesData ?? []) as Message[]] as const;
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

  // Garantir que profile existe antes de renderizar
  if (!profile) {
    console.error("[SmartBell] dashboard: profile is null after all attempts");
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">Erro ao carregar perfil</h1>
          <p className="text-gray-400">Não foi possível carregar seu perfil. Por favor, tente novamente.</p>
        </div>
      </main>
    );
  }

  // Passar profile como não-null para evitar problemas de hidratação
  // O profile já foi validado acima, então podemos garantir que não é null
  return (
    <DashboardClient
      profile={profile as UserProfile}
      houses={houses}
      calls={allCalls}
      messages={messageMap}
    />
  );
}


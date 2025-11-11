"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";
import type { CallStatus } from "@/types";
import type { Database } from "@/types/database";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function createActionSupabaseClient() {
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

export async function requestMagicLink(email: string) {
  const supabase = await createActionSupabaseClient();
  const redirectTo =
    env.NEXT_PUBLIC_APP_URL?.concat("/dashboard") ?? "http://localhost:3000/dashboard";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo
    }
  });

  if (error) {
    console.error("[SmartBell] magic link error", error);
    throw new Error("Não foi possível enviar o link de acesso.");
  }
}

export async function signOut() {
  const supabase = await createActionSupabaseClient();
  await supabase.auth.signOut();
}

export async function updateCallStatus(callId: string, status: CallStatus) {
  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const { error } = await supabaseAdminClient
    .from("calls")
    .update(
      {
        status,
        ended_at:
          status === "missed" || status === "answered"
            ? new Date().toISOString()
            : null
      } as Database["public"]["Tables"]["calls"]["Update"]
    )
    .eq("id", callId);

  if (error) {
    console.error("[SmartBell] update call status error", error);
    throw new Error("Não foi possível atualizar a chamada.");
  }
}

export async function saveFcmToken(token: string) {
  const supabase = await createActionSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const { error } = await supabaseAdminClient
    .from("users")
    .upsert({
      id: user.id,
      email: user.email ?? "",
      fcm_token: token,
      role: "morador"
    })
    .eq("id", user.id);

  if (error) {
    console.error("[SmartBell] save FCM token error", error);
    throw new Error("Não foi possível salvar token de notificações.");
  }
}

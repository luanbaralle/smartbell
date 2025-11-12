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
  
  // Detectar URL base: usar VERCEL_URL em produção, NEXT_PUBLIC_APP_URL se definido, ou fallback
  const vercelUrl = process.env.VERCEL_URL;
  const baseUrl = 
    env.NEXT_PUBLIC_APP_URL || 
    (vercelUrl ? `https://${vercelUrl}` : null) ||
    "https://smartbell-nine.vercel.app";
  
  const redirectTo = baseUrl.endsWith("/dashboard")
    ? baseUrl
    : `${baseUrl}/dashboard`;

  console.log("[SmartBell] Magic link redirectTo:", redirectTo);

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

  const updatePayload: Database["public"]["Tables"]["calls"]["Update"] = {
    status,
    ended_at:
      status === "missed" || status === "answered"
        ? new Date().toISOString()
        : null
  };

  const admin = supabaseAdminClient as unknown as {
    from: (table: string) => {
      update: (values: Database["public"]["Tables"]["calls"]["Update"]) => {
        eq: (column: string, value: string) => Promise<{ error: Error | null }>;
      };
    };
  };

  const { error } = await admin
    .from("calls")
    .update(updatePayload)
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

  const adminUsers = supabaseAdminClient as unknown as {
    from: (table: "users") => {
      upsert: (
        values: Database["public"]["Tables"]["users"]["Insert"][],
        options: { onConflict: "id" }
      ) => Promise<{ error: Error | null }>;
    };
  };

  const { error } = await adminUsers.from("users").upsert(
    [
      {
        id: user.id,
        email: user.email ?? "",
        fcm_token: token,
        role: "morador"
      }
    ],
    { onConflict: "id" }
  );

  if (error) {
    console.error("[SmartBell] save FCM token error", error);
    throw new Error("Não foi possível salvar token de notificações.");
  }
}

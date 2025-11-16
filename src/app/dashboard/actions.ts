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

type CredentialsPayload = {
  email: string;
  password: string;
};

function resolveBaseUrl() {
  const vercelUrl = process.env.VERCEL_URL;
  return (
    env.NEXT_PUBLIC_APP_URL ||
    (vercelUrl ? `https://${vercelUrl}` : null) ||
    "http://localhost:3000"
  );
}

export async function registerWithPassword({ email, password }: CredentialsPayload) {
  const supabase = await createActionSupabaseClient();
  const baseUrl = resolveBaseUrl();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${baseUrl}/dashboard`
    }
  });

  if (error) {
    console.error("[SmartBell] register error", error);
    throw new Error(
      error.message || "Não foi possível criar sua conta. Tente novamente."
    );
  }

  return {
    requiresEmailConfirmation: !data.session,
    userId: data.user?.id ?? null
  };
}

export async function loginWithPassword({ email, password }: CredentialsPayload) {
  const supabase = await createActionSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("[SmartBell] login error", error);
    throw new Error("Credenciais inválidas. Verifique e-mail e senha.");
  }

  return {
    userId: data.user?.id ?? null
  };
}

export async function signOut() {
  const supabase = await createActionSupabaseClient();
  await supabase.auth.signOut();
}

export async function sendMagicLink(email: string) {
  const supabase = await createActionSupabaseClient();
  const baseUrl = resolveBaseUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback`
    }
  });

  if (error) {
    console.error("[SmartBell] magic link error", error);
    throw new Error(
      error.message || "Não foi possível enviar o link mágico. Tente novamente."
    );
  }
}

export async function updateCallStatus(callId: string, status: CallStatus) {
  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const updatePayload: Database["public"]["Tables"]["calls"]["Update"] = {
    status,
    ended_at:
      status === "missed" || status === "answered" || status === "ended"
        ? new Date().toISOString()
        : null
  };
  
  // Set started_at when call is answered
  if (status === "answered") {
    updatePayload.started_at = new Date().toISOString();
  }

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

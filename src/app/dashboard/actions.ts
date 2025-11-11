"use server";

import { createSupabaseRouteClient } from "@/lib/supabase";
import { env } from "@/lib/env";
import type { CallStatus } from "@/types";

export async function requestMagicLink(email: string) {
  const supabase = createSupabaseRouteClient();
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
  const supabase = createSupabaseRouteClient();
  await supabase.auth.signOut();
}

export async function updateCallStatus(callId: string, status: CallStatus) {
  const supabase = createSupabaseRouteClient();
  const { error } = await supabase
    .from("calls")
    .update({
      status,
      ended_at:
        status === "missed" || status === "answered"
          ? new Date().toISOString()
          : null
    })
    .eq("id", callId);

  if (error) {
    console.error("[SmartBell] update call status error", error);
    throw new Error("Não foi possível atualizar a chamada.");
  }
}

export async function saveFcmToken(token: string) {
  const supabase = createSupabaseRouteClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { error } = await supabase
    .from("users")
    .upsert({
      id: user.id,
      email: user.email ?? "",
      fcm_token: token
    })
    .eq("id", user.id);

  if (error) {
    console.error("[SmartBell] save FCM token error", error);
    throw new Error("Não foi possível salvar token de notificações.");
  }
}


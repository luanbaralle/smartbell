import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase";
import type { UserProfile } from "@/types";

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[SmartBell] auth error", authError);
    return null;
  }

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[SmartBell] failed to load user profile", error);
    throw new Error("Falha ao carregar perfil do usuário.");
  }

  if (data) {
    return data;
  }

  const { data: created, error: createError } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email ?? "",
        role: "morador"
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (createError) {
    console.error("[SmartBell] failed to create user profile", createError);
    throw new Error("Erro ao provisionar perfil do usuário.");
  }

  return created;
}

export async function saveFcmToken(token: string) {
  const supabase = createSupabaseServerClient();
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("sb-access-token");

  if (!sessionToken) {
    throw new Error("Usuário não autenticado.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { error } = await supabase
    .from("users")
    .upsert({ id: user.id, email: user.email, fcm_token: token })
    .eq("id", user.id);

  if (error) {
    console.error("[SmartBell] failed to save FCM token", error);
    throw new Error("Erro ao salvar token de notificações.");
  }
}


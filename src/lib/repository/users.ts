import { supabaseAdminClient } from "@/lib/supabaseAdmin";
import type { UserProfile } from "@/types";

export async function getUserProfileById(
  userId: string
): Promise<UserProfile | null> {
  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const { data, error } = await supabaseAdminClient
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[SmartBell] failed to load user profile", error);
    throw new Error("Falha ao carregar perfil do usuário.");
  }

  return data;
}

export async function upsertUserProfile(profile: UserProfile) {
  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const { error } = await supabaseAdminClient
    .from("users")
    .upsert(profile, { onConflict: "id" });

  if (error) {
    console.error("[SmartBell] failed to upsert user profile", error);
    throw new Error("Erro ao atualizar perfil do usuário.");
  }
}


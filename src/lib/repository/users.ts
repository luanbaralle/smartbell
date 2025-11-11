import { supabaseAdminClient } from "@/lib/supabaseAdmin";
import type { UserProfile } from "@/types";
import type { Database } from "@/types/database";

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

  const adminUsers = supabaseAdminClient as unknown as {
    from: (table: "users") => {
      upsert: (
        values: Database["public"]["Tables"]["users"]["Insert"][],
        options: { onConflict: "id" }
      ) => Promise<{ error: Error | null }>;
    };
  };

  const { error } = await adminUsers
    .from("users")
    .upsert(
      [
        {
          id: profile.id,
          email: profile.email,
          fcm_token: profile.fcm_token,
          role: profile.role,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        }
      ],
      { onConflict: "id" }
    );

  if (error) {
    console.error("[SmartBell] failed to upsert user profile", error);
    throw new Error("Erro ao atualizar perfil do usuário.");
  }
}


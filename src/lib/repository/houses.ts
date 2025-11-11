import { supabaseAdminClient } from "@/lib/supabaseAdmin";
import type { House } from "@/types";

export async function getHouseById(houseId: string): Promise<House | null> {
  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const { data, error } = await supabaseAdminClient
    .from("houses")
    .select("*")
    .eq("id", houseId)
    .maybeSingle();

  if (error) {
    console.error("[SmartBell] failed to load house", error);
    throw new Error("Falha ao carregar dados da casa.");
  }

  return data;
}

export async function listHousesByOwner(ownerId: string): Promise<House[]> {
  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const { data, error } = await supabaseAdminClient
    .from("houses")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[SmartBell] failed to list houses", error);
    throw new Error("Falha ao listar casas.");
  }

  return data ?? [];
}


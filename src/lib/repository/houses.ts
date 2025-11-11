import { createSupabaseServerClient } from "@/lib/supabase";
import type { House } from "@/types";

export async function getHouseById(houseId: string): Promise<House | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
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
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
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


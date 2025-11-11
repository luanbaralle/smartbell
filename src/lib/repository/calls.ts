import { supabaseAdminClient } from "@/lib/supabaseAdmin";
import type { Call, CallStatus, CallType } from "@/types";
import type { Database } from "@/types/database";

export async function createCall(input: {
  houseId: string;
  type: CallType;
  sessionId?: string;
  visitorName?: string;
}): Promise<Call> {
  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const payload: Database["public"]["Tables"]["calls"]["Insert"][] = [
    {
      house_id: input.houseId,
      type: input.type,
      session_id: input.sessionId ?? null,
      visitor_name: input.visitorName ?? null
    }
  ];

  const { data, error } = await supabaseAdminClient
    .from("calls")
    .insert(payload as any, { defaultToNull: false })
    .select("*")
    .single();

  if (error) {
    console.error("[SmartBell] failed to create call", error);
    throw new Error("Não foi possível iniciar a chamada.");
  }

  return data;
}

export async function updateCallStatus(callId: string, status: CallStatus) {
  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const adminCalls = supabaseAdminClient as unknown as {
    from: (table: "calls") => {
      update: (
        values: Database["public"]["Tables"]["calls"]["Update"]
      ) => {
        eq: (
          column: "id",
          value: string
        ) => Promise<{ error: Error | null }>;
      };
    };
  };

  const { error } = await adminCalls
    .from("calls")
    .update({ status })
    .eq("id", callId);

  if (error) {
    console.error("[SmartBell] failed to update call status", error);
    throw new Error("Não foi possível atualizar o status da chamada.");
  }
}

export async function listHouseCalls(houseId: string): Promise<Call[]> {
  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const { data, error } = await supabaseAdminClient
    .from("calls")
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[SmartBell] failed to list calls", error);
    throw new Error("Erro ao buscar chamadas.");
  }

  return data ?? [];
}


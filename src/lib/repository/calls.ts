import { createSupabaseServerClient } from "@/lib/supabase";
import type { Call, CallStatus, CallType } from "@/types";

export async function createCall(input: {
  houseId: string;
  type: CallType;
  sessionId?: string;
  visitorName?: string;
}): Promise<Call> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("calls")
    .insert({
      house_id: input.houseId,
      type: input.type,
      session_id: input.sessionId ?? null,
      visitor_name: input.visitorName ?? null
    })
    .select("*")
    .single();

  if (error) {
    console.error("[SmartBell] failed to create call", error);
    throw new Error("Não foi possível iniciar a chamada.");
  }

  return data;
}

export async function updateCallStatus(callId: string, status: CallStatus) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("calls")
    .update({ status })
    .eq("id", callId);

  if (error) {
    console.error("[SmartBell] failed to update call status", error);
    throw new Error("Não foi possível atualizar o status da chamada.");
  }
}

export async function listHouseCalls(houseId: string): Promise<Call[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
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


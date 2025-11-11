import { createSupabaseServerClient } from "@/lib/supabase";
import type { Message } from "@/types";

export async function listMessagesByCall(callId: string): Promise<Message[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("call_id", callId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[SmartBell] failed to load messages", error);
    throw new Error("Erro ao carregar mensagens.");
  }

  return data ?? [];
}

export async function createMessage(input: {
  callId: string;
  sender?: string | null;
  content?: string;
  audioUrl?: string;
  videoUrl?: string;
}): Promise<Message> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      call_id: input.callId,
      sender: input.sender ?? null,
      content: input.content ?? null,
      audio_url: input.audioUrl ?? null,
      video_url: input.videoUrl ?? null
    })
    .select("*")
    .single();

  if (error) {
    console.error("[SmartBell] failed to create message", error);
    throw new Error("Não foi possível enviar a mensagem.");
  }

  return data;
}


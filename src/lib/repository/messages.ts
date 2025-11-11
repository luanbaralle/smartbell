import { supabaseAdminClient } from "@/lib/supabaseAdmin";
import type { Message } from "@/types";
import type { Database } from "@/types/database";

export async function listMessagesByCall(callId: string): Promise<Message[]> {
  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const { data, error } = await supabaseAdminClient
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
  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client not configured.");
  }

  const adminMessages = supabaseAdminClient as unknown as {
    from: (table: "messages") => {
      insert: (
        values: Database["public"]["Tables"]["messages"]["Insert"][],
        options: { defaultToNull: boolean }
      ) => Promise<{ data: Message | null; error: Error | null }>;
    };
  };

  const { data, error } = await adminMessages
    .from("messages")
    .insert(
      [
        {
          call_id: input.callId,
          sender: input.sender ?? null,
          content: input.content ?? null,
          audio_url: input.audioUrl ?? null,
          video_url: input.videoUrl ?? null
        }
      ],
      { defaultToNull: false }
    );

  if (error) {
    console.error("[SmartBell] failed to create message", error);
    throw new Error("Não foi possível enviar a mensagem.");
  }

  if (!data) {
    throw new Error("Resposta inválida ao criar mensagem.");
  }

  return data;
}


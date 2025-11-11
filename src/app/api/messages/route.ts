import { NextRequest, NextResponse } from "next/server";

import { createMessageSchema } from "@/lib/schemas";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  if (!supabaseAdminClient) {
    return NextResponse.json(
      { message: "Supabase não configurado." },
      { status: 500 }
    );
  }

  const callId = request.nextUrl.searchParams.get("callId");
  if (!callId) {
    return NextResponse.json(
      { message: "callId é obrigatório" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdminClient
    .from("messages")
    .select("*")
    .eq("call_id", callId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[SmartBell] list messages error", error);
    return NextResponse.json(
      { message: "Erro ao carregar mensagens." },
      { status: 500 }
    );
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request) {
  if (!supabaseAdminClient) {
    return NextResponse.json(
      { message: "Supabase não configurado." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const parseResult = createMessageSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { message: "Dados inválidos", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { callId, sender, content, audioUrl, videoUrl } = parseResult.data;

  const { data, error } = await supabaseAdminClient
    .from("messages")
    .insert({
      call_id: callId,
      sender: sender ?? null,
      content: content ?? null,
      audio_url: audioUrl ?? null,
      video_url: videoUrl ?? null
    })
    .select("*")
    .single();

  if (error) {
    console.error("[SmartBell] create message error", error);
    return NextResponse.json(
      { message: "Erro ao salvar mensagem." },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: data });
}


import { NextResponse } from "next/server";

import { sendPushNotification } from "@/lib/fcm";
import { createCallSchema } from "@/lib/schemas";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";
import type { Database } from "@/types/database";

export async function POST(request: Request) {
  if (!supabaseAdminClient) {
    return NextResponse.json(
      { message: "Supabase não configurado." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const parseResult = createCallSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { message: "Dados inválidos", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { houseId, type, sessionId, visitorName } = parseResult.data;

  const payload: Database["public"]["Tables"]["calls"]["Insert"][] = [
    {
      house_id: houseId,
      type,
      status: "pending",
      session_id: sessionId ?? null,
      visitor_name: visitorName ?? null
    }
  ];

  const { data, error } = await supabaseAdminClient
    .from("calls")
    .insert(payload as any, { defaultToNull: false })
    .select("*")
    .single();

  if (error) {
    console.error("[SmartBell] create call error", error);
    return NextResponse.json(
      { message: "Erro ao criar chamada." },
      { status: 500 }
    );
  }

  const { data: houseRow } = await supabaseAdminClient
    .from("houses")
    .select("owner_id, name")
    .eq("id", houseId)
    .maybeSingle<Pick<Database["public"]["Tables"]["houses"]["Row"], "owner_id" | "name">>();

  if (houseRow?.owner_id) {
    const { data: residents } = await supabaseAdminClient
      .from("users")
      .select("fcm_token")
      .eq("id", houseRow.owner_id)
      .not("fcm_token", "is", null)
      .returns<{ fcm_token: string | null }[]>();

    const tokens =
      residents
        ?.map((resident) => resident.fcm_token)
        .filter((token: string | null): token is string => Boolean(token)) ?? [];

    if (tokens.length) {
      try {
        await sendPushNotification({
          tokens,
          title: "Visita no Smart Bell",
          body: `Alguém está chamando ${houseRow.name ?? "sua residência"}.`,
          data: {
            callId: data.id,
            houseId
          }
        });
      } catch (pushError) {
        console.error("[SmartBell] push notification error", pushError);
      }
    }
  }

  return NextResponse.json({ call: data });
}


import { NextResponse } from "next/server";

import { sendPushNotification } from "@/lib/fcm";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !Array.isArray(body.tokens)) {
    return NextResponse.json(
      { message: "Tokens inválidos para notificação." },
      { status: 400 }
    );
  }

  const tokens: string[] = body.tokens.filter((token: string) => !!token);
  if (!tokens.length) {
    return NextResponse.json(
      { message: "Nenhum token informado." },
      { status: 400 }
    );
  }

  try {
    await sendPushNotification({
      tokens,
      title: body.title ?? "Smart Bell",
      body: body.body ?? "Nova atividade no Smart Bell.",
      data: body.data ?? {}
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SmartBell] notify error", error);
    return NextResponse.json(
      { message: "Erro ao enviar notificação." },
      { status: 500 }
    );
  }
}


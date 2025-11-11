import { NextResponse } from "next/server";

/**
 * Endpoint reservado para cenários em que o servidor precise mediar a sinalização WebRTC.
 * No MVP atual, a sinalização ocorre via Supabase Realtime diretamente entre os clientes.
 */
export async function POST() {
  return NextResponse.json({
    message:
      "Sinalização WebRTC realizada via Supabase Realtime. Nenhuma ação necessária no endpoint."
  });
}

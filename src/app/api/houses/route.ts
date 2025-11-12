import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string) {
          cookieStore.delete(name);
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const houseName = body.name || "Casa de Teste";

  if (!supabaseAdminClient) {
    return NextResponse.json(
      { error: "Admin client não configurado" },
      { status: 500 }
    );
  }

  const baseUrl = env.NEXT_PUBLIC_APP_URL || "https://smartbell-nine.vercel.app";
  const houseId = crypto.randomUUID();
  const qrCode = `${baseUrl}/bell/${houseId}`;

  const payload: Database["public"]["Tables"]["houses"]["Insert"] = {
    id: houseId,
    name: houseName,
    qr_code: qrCode,
    owner_id: user.id
  };

  const { data, error } = await supabaseAdminClient
    .from("houses")
    .insert([payload] as any, { defaultToNull: false })
    .select()
    .single();

  if (error) {
    console.error("[SmartBell] create house error", error);
    return NextResponse.json({ error: "Erro ao criar casa" }, { status: 500 });
  }

  return NextResponse.json({ house: data });
}


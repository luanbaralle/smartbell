import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

const registerPushSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string()
});

async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          try {
            if (options) {
              cookieStore.set(name, value, options);
            } else {
              cookieStore.set(name, value);
            }
          } catch (err) {
            console.warn("[SmartBell] cookie set warning", err);
          }
        },
        remove(name: string) {
          try {
            cookieStore.delete(name);
          } catch (err) {
            console.warn("[SmartBell] cookie remove warning", err);
          }
        }
      }
    }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    
    // Check authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const parseResult = registerPushSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: "Dados inválidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { endpoint, p256dh, auth } = parseResult.data;

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (existing) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from("push_subscriptions")
        .update({
          p256dh,
          auth,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("[SmartBell] Push subscription update error", updateError);
        return NextResponse.json(
          { message: "Erro ao atualizar subscription" },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: "Subscription atualizada", id: existing.id });
    }

    // Create new subscription
    const { data, error } = await supabase
      .from("push_subscriptions")
      .insert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth
      })
      .select("id")
      .single();

    if (error) {
      console.error("[SmartBell] Push subscription insert error", error);
      return NextResponse.json(
        { message: "Erro ao registrar subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Subscription registrada", id: data.id });
  } catch (error) {
    console.error("[SmartBell] Push register error", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json(
        { message: "Endpoint não fornecido" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    if (error) {
      console.error("[SmartBell] Push subscription delete error", error);
      return NextResponse.json(
        { message: "Erro ao remover subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Subscription removida" });
  } catch (error) {
    console.error("[SmartBell] Push delete error", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}


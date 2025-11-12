import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    console.warn("[SmartBell] auth callback: no code provided");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  try {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[SmartBell] auth callback: missing Supabase credentials");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options?: any) {
            try {
              cookieStore.set({
                name,
                value,
                ...(options || {}),
                sameSite: "lax" as const,
                path: "/"
              });
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[SmartBell] auth callback error", error);
      return NextResponse.redirect(new URL("/dashboard?error=auth_failed", request.url));
    }

    if (!data?.session) {
      console.error("[SmartBell] auth callback: no session after exchange");
      return NextResponse.redirect(new URL("/dashboard?error=no_session", request.url));
    }

    // Verificar se o usuário foi autenticado corretamente
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("[SmartBell] auth callback: user not found after session exchange");
      return NextResponse.redirect(new URL("/dashboard?error=no_user", request.url));
    }

    console.log("[SmartBell] auth callback: success, user:", user.email);

    // Sucesso - redirecionar para dashboard
    const redirectUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[SmartBell] auth callback exception", error);
    // Em caso de erro, redirecionar para dashboard (que mostrará login se não autenticado)
    try {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch (redirectError) {
      // Fallback: retornar resposta simples
      return NextResponse.json(
        { error: "Authentication error", message: "Please try logging in again." },
        { status: 500 }
      );
    }
  }
}


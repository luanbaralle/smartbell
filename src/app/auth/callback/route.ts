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
            if (options) {
              cookieStore.set(name, value, options);
            } else {
              cookieStore.set(name, value);
            }
          } catch (err) {
            // Ignorar erros de cookie em rotas de callback
            console.warn("[SmartBell] cookie set warning", err);
          }
        },
        remove(name: string, options?: any) {
          try {
            cookieStore.delete(name);
          } catch (err) {
            console.warn("[SmartBell] cookie remove warning", err);
          }
        }
      }
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[SmartBell] auth callback error", error);
      return NextResponse.redirect(new URL("/dashboard?error=auth_failed", request.url));
    }

    if (data?.session) {
      // Sucesso - redirecionar para dashboard
      const redirectUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Se não houver sessão, redirecionar para login
    return NextResponse.redirect(new URL("/dashboard", request.url));
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


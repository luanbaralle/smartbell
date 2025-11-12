import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
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
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirecionar para dashboard após sucesso
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    console.error("[SmartBell] auth callback error", error);
  }

  // Se houver erro ou não houver código, redirecionar para login
  return NextResponse.redirect(new URL("/dashboard", request.url));
}


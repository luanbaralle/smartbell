import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { updateCallStatus } from "@/lib/repository/calls";
import { getHouseById } from "@/lib/repository/houses";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
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
  });
}

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    // Get call and verify ownership
    const { getCallById } = await import("@/lib/repository/calls");
    const call = await getCallById(id);

    if (!call) {
      return NextResponse.json({ message: "Chamada não encontrada" }, { status: 404 });
    }

    const house = await getHouseById(call.house_id);
    if (!house || house.owner_id !== user.id) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }

    // Update call status to answered
    await updateCallStatus(id, "answered");

    return NextResponse.json({ message: "Chamada atendida", call_id: id });
  } catch (error) {
    console.error("[SmartBell] Answer call error", error);
    return NextResponse.json(
      { message: "Erro ao atender chamada" },
      { status: 500 }
    );
  }
}


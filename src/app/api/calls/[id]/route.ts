import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getCallById, updateCallStatus } from "@/lib/repository/calls";
import { getHouseById } from "@/lib/repository/houses";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";
import { z } from "zod";

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

const updateCallSchema = z.object({
  status: z.enum(["pending", "answered", "missed", "ended"]).optional()
});

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const call = await getCallById(id);

    if (!call) {
      return NextResponse.json({ message: "Chamada não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ call });
  } catch (error) {
    console.error("[SmartBell] Get call error", error);
    return NextResponse.json({ message: "Erro ao buscar chamada" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

    const body = await request.json().catch(() => null);
    const parseResult = updateCallSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: "Dados inválidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Get call and verify ownership
    const call = await getCallById(id);
    if (!call) {
      return NextResponse.json({ message: "Chamada não encontrada" }, { status: 404 });
    }

    const house = await getHouseById(call.house_id);
    if (!house || house.owner_id !== user.id) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }

    // Update call status
    if (parseResult.data.status) {
      await updateCallStatus(id, parseResult.data.status);
    }

    return NextResponse.json({ message: "Chamada atualizada", call_id: id });
  } catch (error) {
    console.error("[SmartBell] Update call error", error);
    return NextResponse.json(
      { message: "Erro ao atualizar chamada" },
      { status: 500 }
    );
  }
}


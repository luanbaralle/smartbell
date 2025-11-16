import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { CallPageClient } from "@/app/call/[id]/CallPageClient";
import { getCallById } from "@/lib/repository/calls";
import { listMessagesByCall } from "@/lib/repository/messages";
import { getHouseById } from "@/lib/repository/houses";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function createCallPageSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        try {
          return cookieStore.get(name)?.value;
        } catch {
          return undefined;
        }
      },
      set(name: string, value: string, options?: any) {
        try {
          if (options) {
            cookieStore.set(name, value, options);
          } else {
            cookieStore.set(name, value);
          }
        } catch (err) {
          // Ignore cookie set errors in server components
          // This can happen during SSR when cookies are not available
        }
      },
      remove(name: string) {
        try {
          cookieStore.delete(name);
        } catch (err) {
          // Ignore cookie remove errors
        }
      }
    }
  });
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CallPage({ params }: PageProps) {
  try {
    const { id } = await params;
    
    // Check if we have any Supabase auth cookies before proceeding
    // Supabase SSR uses cookies like: sb-<project-ref>-auth-token
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const hasAuthCookie = allCookies.some(c => 
      c.name.includes("sb-") && c.name.includes("auth")
    );
    
    if (!hasAuthCookie) {
      // No auth cookies, redirect to login immediately
      redirect(`/?redirect=/call/${id}`);
    }
    
    // Create supabase client
    const supabase = await createCallPageSupabase();

    // Check authentication - wrap in try-catch to handle any errors gracefully
    let user;
    let userError;
    
    try {
      const authResult = await supabase.auth.getUser();
      user = authResult.data?.user;
      userError = authResult.error;
    } catch (error: any) {
      // Handle "Auth session missing" and other auth errors gracefully
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes("Auth session missing") || 
          errorMessage.includes("session") ||
          errorMessage.includes("JWT") ||
          errorMessage.includes("Invalid")) {
        redirect(`/?redirect=/call/${id}`);
      }
      // For any other error, also redirect to login
      redirect(`/?redirect=/call/${id}`);
    }

    // If there's an auth error or no user, redirect to login
    if (userError || !user) {
      redirect(`/?redirect=/call/${id}`);
    }

    // Get call data
    const call = await getCallById(id);
    if (!call) {
      notFound();
    }

    // Get house data
    const house = await getHouseById(call.house_id);
    if (!house) {
      notFound();
    }

    // Verify user owns the house
    if (house.owner_id !== user.id) {
      redirect("/dashboard");
    }

    // Get messages
    const messages = await listMessagesByCall(call.id);

    return <CallPageClient call={call} house={house} initialMessages={messages} userId={user.id} />;
  } catch (error: any) {
    // Catch any error during rendering and redirect
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("Auth session missing") || 
        errorMessage.includes("session") ||
        errorMessage.includes("JWT")) {
      const { id } = await params;
      redirect(`/?redirect=/call/${id}`);
    }
    console.error("[SmartBell] Call page error", error);
    redirect("/dashboard");
  }
}


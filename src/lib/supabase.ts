import {
  createBrowserClient,
  createRouteHandlerClient,
  createServerComponentClient
} from "@supabase/auth-helpers-nextjs";
import { cookies, headers } from "next/headers";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[SmartBell] Supabase environment variables are missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const createSupabaseBrowserClient = () =>
  createBrowserClient<Database>(supabaseUrl, supabaseKey);

export const createSupabaseServerClient = () =>
  createServerComponentClient<Database>({
    cookies
  });

export const createSupabaseRouteClient = () =>
  createRouteHandlerClient<Database>({
    cookies,
    headers
  });


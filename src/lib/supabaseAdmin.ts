import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseAdminClient =
  supabaseUrl && serviceRoleKey
    ? createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false
        }
      })
    : null;


import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies, headers } from "next/headers";

import type { Database } from "@/types/database";

export const createSupabaseRouteClient = () =>
  createRouteHandlerClient<Database>({
    cookies,
    headers
  });


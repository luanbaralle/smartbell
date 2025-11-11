import { createSupabaseServerClient } from "@/lib/supabase";

export async function requireUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Usuário não autenticado.");
  }

  return user;
}


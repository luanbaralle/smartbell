import { createSupabaseBrowserClient } from "@/lib/supabase";

export const createRealtimeChannel = (channel: string) => {
  const supabase = createSupabaseBrowserClient();
  const realtimeChannel = supabase.channel(channel, {
    config: {
      broadcast: { ack: true },
      presence: { key: `client-${Math.random().toString(36).slice(2)}` }
    }
  });

  return { supabase, channel: realtimeChannel };
};


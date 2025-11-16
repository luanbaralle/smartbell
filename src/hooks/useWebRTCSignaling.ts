"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createRealtimeChannel } from "@/lib/realtime";

export type SignalingMessage =
  | {
      type: "offer" | "answer";
      sdp: RTCSessionDescriptionInit;
      from: "visitor" | "resident";
    }
  | {
      type: "candidate";
      candidate: RTCIceCandidateInit;
      from: "visitor" | "resident";
    }
  | {
      type: "hangup";
      from: "visitor" | "resident";
    };

export function useWebRTCSignaling(
  callId: string | null,
  role: "visitor" | "resident",
  onSignal: (message: SignalingMessage) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createRealtimeChannel>["supabase"] | null>(null);

  useEffect(() => {
    if (!callId) return;
    const { supabase, channel } = createRealtimeChannel(`webrtc:${callId}`);
    supabaseRef.current = supabase;
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "signal" }, (payload) => {
        if (payload.payload) {
          onSignal(payload.payload as SignalingMessage);
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[SmartBell] erro no canal de sinalização");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      supabaseRef.current = null;
    };
  }, [callId, onSignal]);

  const sendSignal = useCallback(
    async (message: Omit<SignalingMessage, "from">) => {
      if (!channelRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.error("[useWebRTCSignaling] Cannot send signal - no channel", { callId, role, messageType: message.type });
        }
        return;
      }
      
      if (process.env.NODE_ENV === "development") {
        console.log("[useWebRTCSignaling] Sending signal", { callId, role, messageType: message.type });
      }
      
      await channelRef.current.send({
        type: "broadcast",
        event: "signal",
        payload: { ...message, from: role }
      });
      
      if (process.env.NODE_ENV === "development") {
        console.log("[useWebRTCSignaling] Signal sent successfully", { callId, role, messageType: message.type });
      }
    },
    [role, callId]
  );

  return { sendSignal };
}


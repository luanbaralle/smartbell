/**
 * Utilitários para sinalização de chamadas via Supabase Realtime
 * Baseado em especificação determinística
 */

import { createRealtimeChannel } from "@/lib/realtime";
import type { SignalingEvent } from "@/types/call-signaling";

/**
 * Cria um canal de sinalização para uma chamada específica
 * Usa o sistema de Realtime existente
 */
export function createSignalingChannel(callId: string) {
  return createRealtimeChannel(`call-signaling:${callId}`);
}

/**
 * Envia um evento de sinalização
 */
export async function sendSignalingEvent(
  channel: ReturnType<typeof createSignalingChannel>["channel"],
  event: SignalingEvent
): Promise<void> {
  try {
    const response = await channel.send({
      type: "broadcast",
      event: "signaling",
      payload: event
    });

    // RealtimeChannelSendResponse doesn't have error property in newer versions
    // Check if response indicates success
    if (response === "error" || (response as any)?.error) {
      const error = response === "error" ? new Error("Failed to send signaling event") : (response as any).error;
      console.error(`[call-signaling] Error sending ${event.type}`, error);
      throw error;
    }

    console.log(`[call-signaling] Sent ${event.type} for call ${event.callId}`);
  } catch (error) {
    console.error(`[call-signaling] Failed to send ${event.type}`, error);
    throw error;
  }
}

/**
 * Assina eventos de sinalização para uma chamada
 */
export function subscribeToSignalingEvents(
  channel: ReturnType<typeof createSignalingChannel>["channel"],
  handler: (event: SignalingEvent) => void
): () => void {
  const subscription = channel.on("broadcast", { event: "signaling" }, (payload) => {
    const event = payload.payload as SignalingEvent;
    console.log(`[call-signaling] Received ${event.type} for call ${event.callId}`);
    handler(event);
  });

  // Retornar função de unsubscribe
  return () => {
    // In newer Supabase versions, off method may not exist
    // Unsubscribe by removing the channel instead
    try {
      if (typeof (channel as any).off === "function") {
        (channel as any).off("broadcast", subscription);
      } else {
        // Fallback: unsubscribe the entire channel
        channel.unsubscribe();
      }
    } catch (error) {
      // If unsubscribe fails, try to unsubscribe the channel
      channel.unsubscribe();
    }
  };
}

/**
 * Helper para criar eventos de sinalização
 */
export const createSignalingEvent = {
  request: (callId: string, from: string, to: string): SignalingEvent => ({
    type: "call.request",
    callId,
    from,
    to,
    timestamp: Date.now()
  }),

  ringing: (callId: string, from: string, to: string): SignalingEvent => ({
    type: "call.ringing",
    callId,
    from,
    to,
    timestamp: Date.now()
  }),

  accept: (callId: string, from: string, to: string, sdpOffer?: RTCSessionDescriptionInit): SignalingEvent => ({
    type: "call.accept",
    callId,
    from,
    to,
    timestamp: Date.now(),
    sdpOffer
  }),

  reject: (callId: string, from: string, to: string, reason?: "busy" | "user_reject" | "timeout" | "error"): SignalingEvent => ({
    type: "call.reject",
    callId,
    from,
    to,
    timestamp: Date.now(),
    reason
  }),

  hangup: (callId: string, from: string, to: string, reason?: "user_end" | "timeout" | "error"): SignalingEvent => ({
    type: "call.hangup",
    callId,
    from,
    to,
    timestamp: Date.now(),
    reason
  }),

  ice: (callId: string, from: string, to: string, payload: RTCIceCandidateInit): SignalingEvent => ({
    type: "call.ice",
    callId,
    from,
    to,
    timestamp: Date.now(),
    payload
  }),

  sdp: (callId: string, from: string, to: string, payload: RTCSessionDescriptionInit): SignalingEvent => ({
    type: "call.sdp",
    callId,
    from,
    to,
    timestamp: Date.now(),
    payload
  }),

  status: (callId: string, from: string, to: string, state: "idle" | "ringing" | "in_call" | "ended"): SignalingEvent => ({
    type: "call.status",
    callId,
    from,
    to,
    timestamp: Date.now(),
    state
  })
};


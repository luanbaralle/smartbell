/**
 * DashboardClient refatorado com arquitetura determinística
 * Usa useCallState e eventos de sinalização para evitar bugs
 */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from "react";
import { MessageSquare, Phone, Video, Bell, LogOut, Plus, PhoneIncoming, PhoneOff, Send } from "lucide-react";

import { NotificationButton } from "@/components/NotificationButton";
import { ChatWindow } from "@/components/ChatWindow";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioCall } from "@/components/AudioCall";
import { VideoCall } from "@/components/VideoCall";
import { StatusBadge } from "@/components/StatusBadge";
import { QRDisplay } from "@/components/QRDisplay";
import { IncomingCallModal } from "@/components/IncomingCallModal";
import { ActiveCallOverlay } from "@/components/ActiveCallOverlay";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { createRealtimeChannel } from "@/lib/realtime";
import { cn, formatDate } from "@/lib/utils";
import type { Call, CallStatus, House, Message, UserProfile } from "@/types";
import { saveFcmToken, signOut, updateCallStatus } from "@/app/dashboard/actions";
import { useAudioCall } from "@/hooks/useAudioCall";
import { useVideoCall } from "@/hooks/useVideoCall";
import { useCallSounds } from "@/hooks/useCallSounds";
import { useCallState } from "@/hooks/useCallState";
import { 
  createSignalingChannel, 
  sendSignalingEvent, 
  subscribeToSignalingEvents,
  createSignalingEvent 
} from "@/lib/call-signaling";
import type { SignalingEvent } from "@/types/call-signaling";

type DashboardCall = Call & { house: House };

type DashboardClientProps = {
  profile: UserProfile;
  houses: House[];
  calls: DashboardCall[];
  messages: Record<string, Message[]>;
};

const quickReplies = [
  "Já estou indo!",
  "Aguarde um momento, por favor.",
  "Pode deixar o pacote com o porteiro.",
  "Não posso atender agora, volte mais tarde."
];

export function DashboardClientV2({
  profile,
  houses,
  calls,
  messages
}: DashboardClientProps) {
  const houseLookup = useMemo(() => {
    const map = new Map<string, House>();
    houses.forEach((house) => map.set(house.id, house));
    return map;
  }, [houses]);

  const [callMap, setCallMap] = useState<Record<string, DashboardCall>>(() => {
    const result: Record<string, DashboardCall> = {};
    calls.forEach((call) => {
      result[call.id] = call;
    });
    return result;
  });

  const [callOrder, setCallOrder] = useState<string[]>(() =>
    calls
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((call) => call.id)
  );

  const [messageMap, setMessageMap] = useState<Record<string, Message[]>>(messages);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(
    callOrder[0] ?? null
  );
  const [isSending, setIsSending] = useState(false);
  const audioSectionRef = useRef<HTMLDivElement | null>(null);
  const [isSigningOut, startSignOut] = useTransition();
  const [isCreatingHouse, setIsCreatingHouse] = useState(false);
  const [housesList, setHousesList] = useState<House[]>(houses);

  const selectedCall = selectedCallId ? callMap[selectedCallId] : null;
  const selectedMessages = selectedCallId ? messageMap[selectedCallId] ?? [] : [];

  // Usar novo hook de estado determinístico
  const callState = useCallState({
    userId: profile.id,
    role: "callee",
    onStateChange: (callId, newState) => {
      console.log(`[DashboardClient] Call ${callId} state changed to ${newState}`);
    }
  });

  // Hooks existentes para WebRTC
  const audioCall = useAudioCall(selectedCallId, "resident");
  const videoCall = useVideoCall(selectedCallId, "resident");
  const { playRingTone, stopRingTone } = useCallSounds();
  
  const {
    connectionState: audioState,
    pendingOffer: audioPendingOffer,
    acceptCall: acceptAudioCall,
    hangup: hangupAudioCall,
    remoteStream: audioRemoteStream
  } = audioCall;
  
  const {
    connectionState: videoState,
    pendingOffer: videoPendingOffer,
    acceptCall: acceptVideoCall,
    hangup: hangupVideoCall,
    remoteStream: videoRemoteStream,
    localStream: videoLocalStream
  } = videoCall;

  // Refs para canais de sinalização (um por callId)
  const signalingChannelsRef = useRef<Map<string, ReturnType<typeof createSignalingChannel>>>(new Map());

  /**
   * Obter chamada ativa (ringing ou in_call) para mostrar no modal
   */
  const activeIncomingCall = useMemo(() => {
    const activeCalls = callState.getActiveCalls();
    // Priorizar chamadas com estado "ringing"
    const ringingCall = activeCalls.find(call => call.state === "ringing");
    if (ringingCall) {
      const dbCall = callMap[ringingCall.callId];
      return dbCall || null;
    }
    // Se não há ringing, retornar primeira chamada ativa
    if (activeCalls.length > 0) {
      const dbCall = callMap[activeCalls[0].callId];
      return dbCall || null;
    }
    return null;
  }, [callState, callMap]);

  /**
   * Verificar se há chamada ativa (in_call)
   */
  const hasActiveCall = useMemo(() => {
    const activeCalls = callState.getActiveCalls();
    return activeCalls.some(call => call.state === "in_call");
  }, [callState]);

  /**
   * Handler para eventos de sinalização recebidos
   */
  const handleSignalingEvent = useCallback((event: SignalingEvent) => {
    console.log(`[DashboardClient] Received signaling event: ${event.type} for call ${event.callId}`);
    
    // Processar evento através do hook de estado
    const rejectEvent = callState.handleSignalingEvent(event);
    
    // Se retornou evento de rejeição (usuário ocupado), enviar
    if (rejectEvent && rejectEvent.type === "call.reject") {
      const channel = signalingChannelsRef.current.get(event.callId);
      if (channel) {
        sendSignalingEvent(channel.channel, rejectEvent).catch(console.error);
      }
    }
  }, [callState]);

  /**
   * Configurar canal de sinalização para uma chamada
   */
  const setupSignalingChannel = useCallback((callId: string) => {
    // Se já existe canal, não criar novamente
    if (signalingChannelsRef.current.has(callId)) {
      return;
    }

    const { channel } = createSignalingChannel(callId);
    
    // Subscrever eventos
    const unsubscribe = subscribeToSignalingEvents(channel, handleSignalingEvent);
    
    // Subscrever canal
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[DashboardClient] Subscribed to signaling channel for call ${callId}`);
      }
    });

    signalingChannelsRef.current.set(callId, { channel });
    
    // Cleanup ao desmontar
    return () => {
      unsubscribe();
      channel.unsubscribe();
      signalingChannelsRef.current.delete(callId);
    };
  }, [handleSignalingEvent]);

  /**
   * Quando uma nova chamada pendente é detectada, configurar sinalização
   */
  useEffect(() => {
    Object.values(callMap).forEach((call) => {
      if (call.status === "pending" && call.type === "audio") {
        setupSignalingChannel(call.id);
        
        // Se é uma nova chamada, processar como call.request
        const localCall = callState.getCall(call.id);
        if (!localCall) {
          // Simular evento call.request (vindo do visitante)
          handleSignalingEvent({
            type: "call.request",
            callId: call.id,
            from: call.session_id || "visitor", // Usar session_id como identificador do visitante
            to: profile.id,
            timestamp: Date.now()
          });
        }
      }
    });
  }, [callMap, callState, handleSignalingEvent, profile.id, setupSignalingChannel]);

  /**
   * Aceitar chamada de áudio
   */
  const handleAcceptAudioCall = useCallback(async () => {
    const callToAccept = activeIncomingCall?.id || selectedCallId;
    if (!callToAccept || !audioPendingOffer) {
      console.warn("[DashboardClient] Cannot accept call: no call or pending offer");
      return;
    }

    try {
      // Selecionar chamada se não estiver selecionada
      if (callToAccept !== selectedCallId) {
        setSelectedCallId(callToAccept);
      }
      
      // Aceitar via WebRTC
      await acceptAudioCall();
      
      // Atualizar estado local para "in_call"
      callState.updateCallState(callToAccept, "in_call");
      
      // Enviar evento call.accept via sinalização
      const channel = signalingChannelsRef.current.get(callToAccept);
      const call = callMap[callToAccept];
      if (channel && call) {
        await sendSignalingEvent(
          channel.channel,
          createSignalingEvent.accept(callToAccept, profile.id, call.session_id || "visitor")
        );
      }
      
      // Atualizar status no banco
      await updateCallStatus(callToAccept, "answered");
      
      // Parar ring tone
      stopRingTone();
    } catch (error) {
      console.error("[DashboardClient] Error accepting call", error);
    }
  }, [activeIncomingCall, selectedCallId, audioPendingOffer, acceptAudioCall, callState, profile.id, callMap, stopRingTone]);

  /**
   * Rejeitar chamada de áudio
   */
  const handleRejectAudioCall = useCallback(async () => {
    const callToReject = activeIncomingCall?.id || selectedCallId;
    if (!callToReject) return;

    try {
      // Enviar evento call.reject via sinalização
      const channel = signalingChannelsRef.current.get(callToReject);
      const call = callMap[callToReject];
      if (channel && call) {
        await sendSignalingEvent(
          channel.channel,
          createSignalingEvent.reject(callToReject, profile.id, call.session_id || "visitor", "user_reject")
        );
      }
      
      // Limpar estado local
      callState.cleanupCall(callToReject);
      
      // Atualizar status no banco
      await updateCallStatus(callToReject, "missed");
      
      // Parar ring tone
      stopRingTone();
    } catch (error) {
      console.error("[DashboardClient] Error rejecting call", error);
    }
  }, [activeIncomingCall, selectedCallId, callState, profile.id, callMap, stopRingTone]);

  /**
   * Encerrar chamada
   */
  const handleHangup = useCallback(async () => {
    if (!selectedCallId) return;

    try {
      // Encerrar via WebRTC
      await hangupAudioCall();
      
      // Enviar evento call.hangup via sinalização
      const channel = signalingChannelsRef.current.get(selectedCallId);
      if (channel) {
        await sendSignalingEvent(
          channel.channel,
          createSignalingEvent.hangup(selectedCallId, profile.id, selectedCall?.session_id || "visitor", "user_end")
        );
      }
      
      // Limpar estado local
      callState.cleanupCall(selectedCallId);
      
      // Atualizar status no banco
      if (selectedCall?.status === "answered") {
        await updateCallStatus(selectedCallId, "ended");
      }
    } catch (error) {
      console.error("[DashboardClient] Error hanging up", error);
    }
  }, [selectedCallId, selectedCall, hangupAudioCall, callState, profile.id]);

  /**
   * Tocar ring tone quando há chamada ringing
   */
  useEffect(() => {
    const ringingCall = callState.getActiveCalls().find(call => call.state === "ringing");
    
    if (ringingCall && audioPendingOffer) {
      // Tocar ring tone apenas se há offer pendente (visitante iniciou WebRTC)
      playRingTone();
    } else {
      stopRingTone();
    }
  }, [callState, audioPendingOffer, playRingTone, stopRingTone]);

  /**
   * Cleanup ao desmontar
   */
  useEffect(() => {
    return () => {
      // Limpar todos os canais de sinalização
      signalingChannelsRef.current.forEach(({ channel }) => {
        channel.unsubscribe();
      });
      signalingChannelsRef.current.clear();
    };
  }, []);

  // ... resto do componente (UI, handlers de mensagens, etc.)
  // Por enquanto, vou manter a estrutura básica e adicionar apenas a parte crítica do modal

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      {/* Active Call Overlay - Mostra quando há chamada ativa */}
      {hasActiveCall && selectedCall && (
        <ActiveCallOverlay
          call={selectedCall}
          audioState={audioState}
          remoteStream={audioRemoteStream}
          onHangup={handleHangup}
        />
      )}

      {/* Incoming Call Modal - Mostra quando há chamada ringing */}
      {activeIncomingCall && callState.getCall(activeIncomingCall.id)?.state === "ringing" && (
        <IncomingCallModal
          call={activeIncomingCall}
          open={true}
          onAccept={handleAcceptAudioCall}
          onReject={handleRejectAudioCall}
          hasPendingOffer={!!audioPendingOffer}
        />
      )}

      {/* Resto da UI... */}
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Dashboard refatorado - Em desenvolvimento</p>
      </div>
    </div>
  );
}


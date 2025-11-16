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
import { CallEndedOverlay } from "@/components/CallEndedOverlay";
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

export function DashboardClient({
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
  const { answeredCount, missedCount, pendingCount } = useMemo(() => {
    const values = {
      answeredCount: 0,
      missedCount: 0,
      pendingCount: 0
    };
    Object.values(callMap).forEach((call) => {
      if (call.status === "answered") values.answeredCount += 1;
      if (call.status === "missed") values.missedCount += 1;
      if (call.status === "pending") values.pendingCount += 1;
      if (call.status === "ended") values.answeredCount += 1; // Ended calls count as answered (they were answered before ending)
    });
    return values;
  }, [callMap]);

  // NOVA ARQUITETURA: Usar useCallState para gerenciar estado determinístico
  const callState = useCallState({
    userId: profile.id,
    role: "callee",
    onStateChange: (callId, newState) => {
      if (process.env.NODE_ENV === "development") {
        console.log(`[DashboardClient] Call ${callId} state changed to ${newState}`);
      }
    }
  });

  // Refs para canais de sinalização (um por callId)
  const signalingChannelsRef = useRef<Map<string, ReturnType<typeof createSignalingChannel>>>(new Map());

  // Obter chamada ativa (ringing ou in_call) para mostrar no modal - ESTADO DETERMINÍSTICO
  const activeIncomingCall = useMemo(() => {
    const activeCalls = callState.getActiveCalls();
    // Priorizar chamadas com estado "ringing"
    const ringingCall = activeCalls.find(call => call.state === "ringing");
    if (ringingCall) {
      const dbCall = callMap[ringingCall.callId];
      return dbCall || null;
    }
    return null;
  }, [callState, callMap]);

  // Verificar se há chamada ativa (in_call) - para mostrar overlay
  const hasActiveCall = useMemo(() => {
    const activeCalls = callState.getActiveCalls();
    return activeCalls.some(call => call.state === "in_call");
  }, [callState]);

  // Extract selected call properties
  const selectedCallIdValue = selectedCall?.id;
  const selectedCallStatus = selectedCall?.status;
  const selectedCallType = selectedCall?.type;

  /**
   * Handler para eventos de sinalização recebidos
   */
  const handleSignalingEvent = useCallback((event: SignalingEvent) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DashboardClient] Received signaling event: ${event.type} for call ${event.callId}`);
    }
    
    // Processar evento através do hook de estado
    const rejectEvent = callState.handleSignalingEvent(event);
    
    // Se retornou evento de rejeição (usuário ocupado), enviar
    if (rejectEvent && rejectEvent.type === "call.reject") {
      const channel = signalingChannelsRef.current.get(event.callId);
      if (channel) {
        sendSignalingEvent(channel.channel, rejectEvent).catch(console.error);
      }
    }
    
    // Detectar quando visitante encerra a chamada
    if (event.type === "call.hangup" && !callEndedByResident && !callEndedByVisitor) {
      // Visitante encerrou a chamada
      setCallEndedByVisitor(true);
      setCallEndedByResident(false);
    }
  }, [callState, callEndedByResident, callEndedByVisitor]);

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
        if (process.env.NODE_ENV === "development") {
          console.log(`[DashboardClient] Subscribed to signaling channel for call ${callId}`);
        }
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
   * Quando uma nova chamada pendente é detectada, configurar sinalização e processar como call.request
   */
  useEffect(() => {
    Object.values(callMap).forEach((call) => {
      if (call.status === "pending" && call.type === "audio") {
        setupSignalingChannel(call.id);
        
        // Verificar se é uma nova chamada (não existe no callState ainda)
        const localCall = callState.getCall(call.id);
        if (!localCall) {
          // CRÍTICO: Selecionar a chamada IMEDIATAMENTE para que useAudioCall se inscreva no canal WebRTC
          // Isso deve acontecer ANTES do visitante enviar o offer
          if (!selectedCallId || call.id !== selectedCallId) {
            if (process.env.NODE_ENV === "development") {
              console.log("[DashboardClient] Selecionando chamada automaticamente", call.id);
            }
            setSelectedCallId(call.id);
          }
          
          // Processar evento call.request após garantir que selectedCallId foi atualizado
          // useAudioCall precisa de tempo para se inscrever no canal webrtc:${callId}
          setTimeout(() => {
            handleSignalingEvent({
              type: "call.request",
              callId: call.id,
              from: call.session_id || "visitor",
              to: profile.id,
              timestamp: Date.now()
            });
          }, 100); // Dar tempo para useAudioCall se inscrever
        }
      }
    });
  }, [callMap, callState, handleSignalingEvent, profile.id, setupSignalingChannel, selectedCallId]);

  /**
   * Monitorar quando audioPendingOffer muda para debug
   */
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      if (audioPendingOffer) {
        console.log("[DashboardClient] ✅ Offer recebido!", {
          callId: selectedCallIdValue,
          hasOffer: !!audioPendingOffer,
          selectedCallId: selectedCallIdValue
        });
      }
    }
  }, [audioPendingOffer, selectedCallIdValue]);

  /**
   * Tocar ring tone quando há chamada ringing E há offer pendente
   */
  useEffect(() => {
    const ringingCall = callState.getActiveCalls().find(call => call.state === "ringing");
    
    if (ringingCall && audioPendingOffer && ringingCall.callId === selectedCallIdValue) {
      // Tocar ring tone apenas se há offer pendente (visitante iniciou WebRTC)
      playRingTone();
    } else {
      stopRingTone();
    }
  }, [callState, audioPendingOffer, selectedCallIdValue, playRingTone, stopRingTone]);

  // Sincronizar estado do WebRTC com callState quando conexão é estabelecida
  useEffect(() => {
    if (selectedCallId && audioState === "connected") {
      const localCall = callState.getCall(selectedCallId);
      if (localCall && localCall.state !== "in_call") {
        callState.updateCallState(selectedCallId, "in_call");
      }
    }
  }, [selectedCallId, audioState, callState]);

  // Track previous connection state to detect when call ends
  const prevAudioStateRef = useRef<"idle" | "calling" | "ringing" | "connected">("idle");
  const prevVideoStateRef = useRef<"idle" | "calling" | "ringing" | "connected">("idle");

  useEffect(() => {
    const { supabase, channel } = createRealtimeChannel(
      `dashboard-calls:${profile.id}`
    );

    // Subscribe to all calls for houses owned by this user
    housesList.forEach((house) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calls",
          filter: `house_id=eq.${house.id}`
        },
        (payload) => {
          // Log para debug (remover em produção se necessário)
          if (process.env.NODE_ENV === "development") {
            console.log("[SmartBell] Realtime call update received", {
              event: payload.eventType,
              callId: payload.new?.id,
              houseId: payload.new?.house_id,
              status: payload.new?.status
            });
          }
          
          if (!payload.new) return;
          const data = payload.new as Call;
          const houseInfo = houseLookup.get(data.house_id);
          if (!houseInfo) return;
          const dashboardCall: DashboardCall = { ...data, house: houseInfo };

          // Check if this is a new call (INSERT event) or update (UPDATE event)
          // Supabase Realtime uses eventType in the payload
          setCallMap((prev) => {
            const isNewCall = payload.eventType === "INSERT" || 
                             (payload as any).eventType === "INSERT" ||
                             !prev[dashboardCall.id];
            
            // Auto-select new calls (all types) so user sees them immediately
            if (isNewCall && dashboardCall.status === "pending") {
              setSelectedCallId(dashboardCall.id);
              
              // Scroll to top of call list to show new call
              setTimeout(() => {
                const callElement = document.querySelector(`[data-call-id="${dashboardCall.id}"]`);
                if (callElement) {
                  callElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
              }, 100);
            }
            
            // Show browser notification for new pending calls
            if (isNewCall && dashboardCall.status === "pending") {
              // Request permission if not granted
              if ("Notification" in window) {
                if (Notification.permission === "granted") {
                  const notification = new Notification("Nova Chamada - Smart Bell", {
                    body: `Alguém está chamando ${houseInfo.name}`,
                    icon: "/icons/icon-192.png",
                    tag: `call-${dashboardCall.id}`,
                    requireInteraction: true,
                    data: {
                      callId: dashboardCall.id,
                      houseId: houseInfo.id
                    }
                  });
                  
                  notification.onclick = () => {
                    window.focus();
                    setSelectedCallId(dashboardCall.id);
                    notification.close();
                  };
                } else if (Notification.permission === "default") {
                  // Request permission
                  Notification.requestPermission().then((permission) => {
                    if (permission === "granted") {
                      const notification = new Notification("Nova Chamada - Smart Bell", {
                        body: `Alguém está chamando ${houseInfo.name}`,
                        icon: "/icons/icon-192.png",
                        tag: `call-${dashboardCall.id}`,
                        requireInteraction: true,
                        data: {
                          callId: dashboardCall.id,
                          houseId: houseInfo.id
                        }
                      });
                      
                      notification.onclick = () => {
                        window.focus();
                        setSelectedCallId(dashboardCall.id);
                        notification.close();
                      };
                    }
                  });
                }
              }
            }
            
            return {
              ...prev,
              [dashboardCall.id]: dashboardCall
            };
          });
          
          setCallOrder((prev) => {
            const filtered = prev.filter((id) => id !== dashboardCall.id);
            return [dashboardCall.id, ...filtered];
          });
        }
      );
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Channel subscribed successfully
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        // Silently handle errors - Realtime may reconnect automatically
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [housesList, houseLookup, profile.id]);

  useEffect(() => {
    if (!selectedCallId) return;
    const { supabase, channel } = createRealtimeChannel(
      `dashboard-messages:${selectedCallId}`
    );

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `call_id=eq.${selectedCallId}`
      },
      (payload) => {
        if (!payload.new) return;
        const data = payload.new as Message;
        setMessageMap((prev) => {
          const current = prev[selectedCallId] ?? [];
          const exists = current.some((item) => item.id === data.id);
          if (exists) return prev;
          return {
            ...prev,
            [selectedCallId]: [...current, data]
          };
        });
      }
    );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error("[SmartBell] dashboard messages realtime error");
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCallId]);

  useEffect(() => {
    if (!selectedCallId) return;
    if (messageMap[selectedCallId]) return;

    const controller = new AbortController();
    fetch(`/api/messages?callId=${selectedCallId}`, {
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("messages list error");
        }
        return response.json();
      })
      .then((data) => {
        setMessageMap((prev) => ({
          ...prev,
          [selectedCallId]: data.messages ?? []
        }));
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("[SmartBell] load messages error", error);
        }
      });

    return () => controller.abort();
  }, [messageMap, selectedCallId]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedCallId) return;
      setIsSending(true);
      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callId: selectedCallId,
            sender: profile.id,
            content
          })
        });
        if (!response.ok) {
          throw new Error("message error");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsSending(false);
      }
    },
    [profile.id, selectedCallId]
  );

  const handleQuickReply = useCallback(
    (message: string) => {
      handleSendMessage(message);
    },
    [handleSendMessage]
  );

  const handleAudioResponse = useCallback(
    async (blob: Blob) => {
      if (!selectedCallId) return;
      const call = callMap[selectedCallId];
      if (!call) return;
      const formData = new FormData();
      formData.append("file", blob, "response.webm");
      formData.append("houseId", call.house_id);

      const uploadResponse = await fetch("/api/audio", {
        method: "POST",
        body: formData
      });
      if (!uploadResponse.ok) {
        console.error("audio upload error");
        return;
      }

      const { url } = await uploadResponse.json();

      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: selectedCallId,
          sender: profile.id,
          audioUrl: url
        })
      });
    },
    [callMap, profile.id, selectedCallId]
  );

  const handleUpdateStatus = useCallback(
    async (status: CallStatus) => {
      if (!selectedCallId) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[DashboardClient] handleUpdateStatus called but no selectedCallId");
        }
        return;
      }
      
      // Verificar se a chamada ainda existe no callMap antes de atualizar
      const call = callMap[selectedCallId];
      if (!call) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[DashboardClient] handleUpdateStatus called but call not found in callMap", selectedCallId);
        }
        return;
      }
      
      try {
        await updateCallStatus(selectedCallId, status);
        if (process.env.NODE_ENV === "development") {
          console.log(`[DashboardClient] Successfully updated call ${selectedCallId} to status ${status}`);
        }
      } catch (error) {
        // Não mostrar erro se a chamada já foi atualizada ou não existe mais
        if (error instanceof Error && error.message.includes("Não foi possível atualizar")) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`[DashboardClient] Failed to update call status (call may have been deleted or already updated):`, error);
          }
        } else {
          console.error("[DashboardClient] Error updating call status", error);
        }
      }
    },
    [selectedCallId, callMap]
  );

  // Detect when call is ended (hung up) and update status to "ended"
  useEffect(() => {
    if (!selectedCall) {
      prevAudioStateRef.current = "idle";
      prevVideoStateRef.current = "idle";
      return;
    }
    
    // If call was answered and we transitioned from connected to idle, it was ended
    const wasAudioConnected = prevAudioStateRef.current === "connected";
    const wasVideoConnected = prevVideoStateRef.current === "connected";
    const isNowIdle = audioState === "idle" && videoState === "idle";
    
    if (selectedCall.status === "answered" && (wasAudioConnected || wasVideoConnected) && isNowIdle) {
      // Call was ended - limpar estado local e atualizar status no banco
      const callIdToUpdate = selectedCall.id;
      callState.cleanupCall(callIdToUpdate);
      
      // Verificar se a chamada ainda existe antes de atualizar
      if (callMap[callIdToUpdate]) {
        handleUpdateStatus("ended").catch((error) => {
          // Erro já é logado em handleUpdateStatus, apenas logar aqui se necessário
          if (process.env.NODE_ENV === "development") {
            console.warn("[SmartBell] Error updating call status to ended (non-critical)", error);
          }
        });
      } else {
        if (process.env.NODE_ENV === "development") {
          console.warn("[SmartBell] Call already removed from callMap, skipping status update");
        }
      }
    }
    
    // Update refs for next comparison
    prevAudioStateRef.current = audioState;
    prevVideoStateRef.current = videoState;
  }, [selectedCall, audioState, videoState, handleUpdateStatus, callMap, callState]);

  const handleSaveFcm = useCallback(async (token: string) => {
    try {
      await saveFcmToken(token);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleCreateHouse = useCallback(async () => {
    setIsCreatingHouse(true);
    try {
      const response = await fetch("/api/houses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Casa de Teste" })
      });

      if (!response.ok) {
        throw new Error("Erro ao criar casa");
      }

      const { house } = await response.json();
      setHousesList((prev) => [...prev, house]);
      // Recarregar página para sincronizar com servidor
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Não foi possível criar a casa. Tente novamente.");
    } finally {
      setIsCreatingHouse(false);
    }
  }, []);
  const handleAcceptAudioCall = useCallback(async () => {
    const callToAccept = activeIncomingCall?.id || selectedCallId;
    if (!callToAccept || !audioPendingOffer) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[SmartBell] Cannot accept call: no call or pending offer", {
          callToAccept,
          hasPendingOffer: !!audioPendingOffer
        });
      }
      alert("Aguardando o visitante iniciar a chamada...");
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
      console.error("[SmartBell] Error accepting call", error);
      alert("Erro ao aceitar a chamada. Tente novamente.");
    }
  }, [activeIncomingCall, selectedCallId, audioPendingOffer, acceptAudioCall, callState, profile.id, callMap, stopRingTone]);

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
      console.error("[SmartBell] Error rejecting call", error);
    }
  }, [activeIncomingCall, selectedCallId, callState, profile.id, callMap, stopRingTone]);

  const handleAcceptVideoCall = useCallback(async () => {
    if (!selectedCallId) return;
    try {
      await acceptVideoCall();
      await updateCallStatus(selectedCallId, "answered");
    } catch (error) {
      console.error(error);
    }
  }, [acceptVideoCall, selectedCallId]);

  // Handler para aceitar do modal
  const handleModalAccept = useCallback(async () => {
    if (process.env.NODE_ENV === "development") {
      console.log("[SmartBell] handleModalAccept called");
    }
    try {
      await handleAcceptAudioCall();
    } catch (error) {
      console.error("[SmartBell] Error in handleModalAccept", error);
    }
  }, [handleAcceptAudioCall]);

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      // Limpar todos os canais de sinalização
      signalingChannelsRef.current.forEach(({ channel }) => {
        channel.unsubscribe();
      });
      signalingChannelsRef.current.clear();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      {/* Call Ended Overlay - Shows when call is ended */}
      {(callEndedByResident || callEndedByVisitor) && selectedCall && (
        <CallEndedOverlay
          endedBy={callEndedByResident ? "self" : "other"}
          otherPartyLabel="visitante"
          onClose={() => {
            setCallEndedByResident(false);
            setCallEndedByVisitor(false);
            // Limpar estado local se houver callId
            if (selectedCallId) {
              callState.cleanupCall(selectedCallId);
            }
          }}
        />
      )}

      {/* Active Call Overlay - Shows on top of everything */}
      {hasActiveCall && selectedCall && !callEndedByResident && !callEndedByVisitor && (
        <ActiveCallOverlay
          call={selectedCall}
          audioState={audioState}
          remoteStream={audioRemoteStream}
          onHangup={async () => {
            if (!selectedCallId) return;
            
            try {
              // Encerrar via WebRTC
              await hangupAudioCall();
              
              // Enviar evento call.hangup via sinalização
              const channel = signalingChannelsRef.current.get(selectedCallId);
              const call = callMap[selectedCallId];
              if (channel && call) {
                await sendSignalingEvent(
                  channel.channel,
                  createSignalingEvent.hangup(selectedCallId, profile.id, call.session_id || "visitor", "user_end")
                );
              }
              
              // Limpar estado local
              callState.cleanupCall(selectedCallId);
              
              // Marcar que o morador encerrou a chamada
              setCallEndedByResident(true);
              setCallEndedByVisitor(false);
              
              // Atualizar status no banco
              if (selectedCall?.status === "answered") {
                await handleUpdateStatus("ended");
              }
            } catch (error) {
              console.error("[SmartBell] Error hanging up", error);
            }
          }}
        />
      )}

      {/* Incoming Call Modal - Baseado em estado determinístico */}
      {activeIncomingCall && callState.getCall(activeIncomingCall.id)?.state === "ringing" && (
        <IncomingCallModal
          call={activeIncomingCall}
          open={true}
          onAccept={handleModalAccept}
          onReject={handleRejectAudioCall}
          hasPendingOffer={!!audioPendingOffer && activeIncomingCall.id === selectedCallIdValue}
        />
      )}
      
      {/* Debug info */}
      {process.env.NODE_ENV === "development" && activeIncomingCall && (
        <div style={{ position: "fixed", bottom: 10, right: 10, background: "rgba(0,0,0,0.8)", color: "white", padding: "10px", fontSize: "12px", zIndex: 99999, borderRadius: "8px" }}>
          <div><strong>Debug Info:</strong></div>
          <div>Active Call: {activeIncomingCall.id}</div>
          <div>Selected: {selectedCallIdValue || "none"}</div>
          <div>Has Offer: {audioPendingOffer ? "✅ YES" : "❌ NO"}</div>
          <div>Match: {activeIncomingCall.id === selectedCallIdValue ? "✅" : "❌"}</div>
          <div>Button Enabled: {!!audioPendingOffer && activeIncomingCall.id === selectedCallIdValue ? "✅" : "❌"}</div>
        </div>
      )}
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Smart Bell</h1>
                <p className="text-sm text-muted-foreground">Painel de Controle</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() =>
                startSignOut(async () => {
                  await signOut();
                  window.location.href = "/dashboard";
                })
              }
              disabled={isSigningOut}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Chamadas
                </CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{callOrder.length}</div>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Atendidas
                </CardTitle>
                <Phone className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{answeredCount}</div>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Perdidas
                </CardTitle>
                <Video className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{missedCount}</div>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendentes
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">{pendingCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* QR Code Section */}
            <div className="lg:col-span-1 space-y-4">
              {housesList.length > 0 ? (
                <>
                  <QRDisplay house={housesList[0]} />
                  {housesList.length > 1 && (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground mb-2">
                          {housesList.length - 1} outra(s) residência(s)
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma casa cadastrada. Crie uma casa para começar.
                    </p>
                    <Button
                      onClick={handleCreateHouse}
                      disabled={isCreatingHouse}
                      className="w-full gap-2 bg-gradient-primary"
                    >
                      <Plus className="h-4 w-4" />
                      {isCreatingHouse ? "Criando..." : "Nova Residência"}
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Notificações Push</CardTitle>
                </CardHeader>
                <CardContent>
                  <NotificationButton onToken={handleSaveFcm} />
                </CardContent>
              </Card>
            </div>

            {/* Recent Calls */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-card">
                  <CardTitle>Chamadas Recentes</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {callOrder.length === 0 && housesList.length > 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhuma chamada ainda</p>
                    </div>
                  )}
                  <div className="space-y-4">
                    {callOrder.map((callId) => {
                      const call = callMap[callId];
                      if (!call) return null;
                      return (
                        <button
                          key={call.id}
                          data-call-id={call.id}
                          onClick={() => setSelectedCallId(call.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors text-left",
                            selectedCallId === call.id && "border-primary bg-primary/5",
                            selectedCallId === call.id && call.type === "audio" && audioState === "connected" && "border-green-500 bg-green-500/5",
                            call.status === "pending" && call.type === "audio" && callState.getCall(call.id)?.state === "ringing" && "border-green-500 bg-green-500/10 animate-pulse",
                            call.status === "pending" && "border-yellow-500/50 bg-yellow-500/5"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center",
                              call.status === "pending" && call.type === "audio" && callState.getCall(call.id)?.state === "ringing"
                                ? "bg-green-500/20 animate-pulse"
                                : selectedCallId === call.id && call.type === "audio" && audioState === "connected"
                                ? "bg-green-500/20"
                                : "bg-primary/10"
                            )}>
                              {call.status === "pending" && call.type === "audio" && callState.getCall(call.id)?.state === "ringing" ? (
                                <PhoneIncoming className="h-5 w-5 text-green-500 animate-pulse" />
                              ) : selectedCallId === call.id && call.type === "audio" && audioState === "connected" ? (
                                <Phone className="h-5 w-5 text-green-500" />
                              ) : (
                                <Bell className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {call.house.name}
                                {call.status === "pending" && call.type === "audio" && callState.getCall(call.id)?.state === "ringing" && (
                                  <span className="text-xs text-green-500 font-semibold animate-pulse">
                                    🔔 TOCANDO
                                  </span>
                                )}
                                {selectedCallId === call.id && call.type === "audio" && audioState === "connected" && (
                                  <span className="text-xs text-green-500 font-semibold flex items-center gap-1">
                                    <span className="inline-block h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                    EM ANDAMENTO
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(call.created_at)} · {call.type === "audio" ? "ÁUDIO" : call.type === "video" ? "VÍDEO" : "TEXTO"}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={call.status} />
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Call Details */}
          {selectedCall && (
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-card">
                <CardTitle>Detalhes da Chamada</CardTitle>
                <CardDescription>
                  Responda via texto ou áudio e atualize o status da chamada.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Call Info - Hide when audio call is connected (shown in dedicated call screen) */}
                {!(selectedCall.type === "audio" && audioState === "connected") && (
                  <div className="flex w-full items-center justify-between rounded-md border bg-card p-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {selectedCall.house.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Iniciada em {formatDate(selectedCall.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={selectedCall.status} />
                  </div>
                )}

                {/* Hide chat when audio call is connected to focus on call */}
                {!(selectedCall.type === "audio" && audioState === "connected") && (
                  <ChatWindow
                    messages={selectedMessages}
                    onSendMessage={handleSendMessage}
                    isSending={isSending}
                  />
                )}

                {selectedCall.type === "audio" && (
                  <>
                    {/* Incoming Call - Show when pending offer */}
                    {audioPendingOffer && audioState !== "connected" && selectedCall.status === "pending" ? (
                      <div className="rounded-md border bg-card p-4">
                        <div className="flex flex-col gap-4 p-4 bg-green-500/10 border-2 border-green-500 rounded-lg animate-pulse">
                          <div className="flex items-center gap-3">
                            <PhoneIncoming className="h-6 w-6 text-green-500 animate-pulse" />
                            <div>
                              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                                🔔 Chamada de Voz Tocando!
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Visitante está chamando você
                              </p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => {
                              stopRingTone();
                              void acceptAudioCall();
                            }} 
                            className="bg-green-500 hover:bg-green-600 text-white w-full"
                            size="lg"
                          >
                            <Phone className="mr-2 h-5 w-5" />
                            Atender Chamada
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    
                    {/* Show AudioCall component for non-connected states (calling, ringing) */}
                    {/* When connected, the overlay shows instead */}
                    {audioState !== "idle" && audioState !== "connected" && (
                      <div className="rounded-md border bg-card p-4">
                        <AudioCall
                          call={selectedCall}
                          state={audioState}
                          remoteStream={audioRemoteStream}
                          onHangup={() => {
                            void hangupAudioCall();
                            void handleUpdateStatus("answered");
                          }}
                        />
                      </div>
                    )}
                  </>
                )}

                {selectedCall.type === "video" && (
                  <div className="rounded-md border bg-card p-4">
                    {videoPendingOffer && videoState !== "connected" ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-muted-foreground">
                          Visitante aguardando vídeo chamada.
                        </p>
                        <Button onClick={() => void handleAcceptVideoCall()} className="bg-gradient-primary">
                          Atender vídeo chamada
                        </Button>
                      </div>
                    ) : null}
                    {videoState !== "idle" && (
                      <VideoCall
                        call={selectedCall}
                        state={videoState}
                        localStream={videoLocalStream}
                        remoteStream={videoRemoteStream}
                        onHangup={() => {
                          void hangupVideoCall();
                          void handleUpdateStatus("answered");
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Hide quick replies and other actions when audio call is connected */}
                {!(selectedCall.type === "audio" && audioState === "connected") && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {quickReplies.map((reply) => (
                        <Button
                          key={reply}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickReply(reply)}
                        >
                          <MessageSquare className="mr-2 h-3 w-3" />
                          {reply}
                        </Button>
                      ))}
                    </div>

                    <div
                      ref={audioSectionRef}
                      className="rounded-md border bg-card p-4"
                    >
                      <AudioRecorder onSave={handleAudioResponse} disabled={false} />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => handleUpdateStatus("answered")}>
                        <Send className="mr-2 h-4 w-4" />
                        Marcar como atendida
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateStatus("missed")}
                      >
                        Marcar como perdida
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}


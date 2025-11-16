"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ChatWindow } from "@/components/ChatWindow";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioCall } from "@/components/AudioCall";
import { VideoCall } from "@/components/VideoCall";
import { StatusBadge } from "@/components/StatusBadge";
import { CallEndedOverlay } from "@/components/CallEndedOverlay";
import { Bell, Phone, Video, MessageSquare, PhoneOff, Clock } from "lucide-react";
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
import type { Call, CallType, House, Message } from "@/types";
import { createRealtimeChannel } from "@/lib/realtime";
import { cn, formatDate } from "@/lib/utils";

type CallClientProps = {
  house: House;
  initialCall: Call | null;
  initialMessages: Message[];
};

type CallIntent =
  | "idle"
  | "text"
  | "audio"
  | "audio-active"
  | "video"
  | "video-active";

export function CallClient({
  house,
  initialCall,
  initialMessages
}: CallClientProps) {
  const [currentCall, setCurrentCall] = useState<Call | null>(initialCall);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isCalling, startCalling] = useTransition();
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [intent, setIntent] = useState<CallIntent>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [wasConnected, setWasConnected] = useState(false); // Track if call was connected
  const [callEndedByResident, setCallEndedByResident] = useState(false); // Track if call was ended by resident
  const [callEndedByVisitor, setCallEndedByVisitor] = useState(false); // Track if call was ended by visitor (self)
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  const callId = currentCall?.id ?? null;
  
  // NOVA ARQUITETURA: Usar useCallState para gerenciar estado determinístico
  // Gerar ID único para esta sessão do visitante
  const visitorIdRef = useRef<string>(`visitor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  
  const callState = useCallState({
    userId: visitorIdRef.current,
    role: "caller",
    onStateChange: (callId, newState) => {
      if (process.env.NODE_ENV === "development") {
        console.log(`[CallClient] Call ${callId} state changed to ${newState}`);
      }
    }
  });

  // Refs para canais de sinalização
  const signalingChannelsRef = useRef<Map<string, ReturnType<typeof createSignalingChannel>>>(new Map());

  const audioCall = useAudioCall(callId, "visitor");
  const videoCall = useVideoCall(callId, "visitor");
  const { playDialTone, stopDialTone } = useCallSounds();
  const {
    connectionState: audioState,
    initiateCall: initiateAudioCall,
    hangup: hangupAudioCall,
    remoteStream: audioRemoteStream
  } = audioCall;
  const {
    connectionState: videoState,
    initiateCall: initiateVideoCall,
    hangup: hangupVideoCall,
    remoteStream: videoRemoteStream,
    localStream: videoLocalStream
  } = videoCall;

  // Update status message based on call state
  useEffect(() => {
    if (!currentCall) {
      setStatusMessage(null);
      setIntent("idle");
      return;
    }

    try {
      if (currentCall.status === "pending") {
        setStatusMessage("Aguardando resposta do morador...");
      } else if (currentCall.status === "answered") {
        setStatusMessage("Morador atendeu. Comunicação ativa.");
      } else if (currentCall.status === "missed") {
        setStatusMessage("Morador não disponível no momento.");
        // Only reset intent if we're not in an active call
        setIntent((prevIntent) => {
          if (prevIntent === "audio-active" || prevIntent === "video-active") {
            return prevIntent; // Keep active call state
          }
          return "idle";
        });
      } else if (currentCall.status === "ended") {
        setStatusMessage("Chamada encerrada.");
        setIntent("idle");
      }
    } catch (error) {
      // Silenciosamente ignorar erros de atualização de status
    }
  }, [currentCall]);

  // Ref para rastrear se o dial tone já foi iniciado para esta chamada
  const dialToneCallIdRef = useRef<string | null>(null);
  // Ref separado para rastrear se WebRTC foi iniciado
  const webrtcInitiatedRef = useRef<string | null>(null);
  // Ref para rastrear valores anteriores e evitar loops
  const prevCallEndedByResidentRef = useRef(false);
  const prevWasConnectedRef = useRef(false);
  const prevAudioStateRef = useRef<"idle" | "calling" | "ringing" | "connected">("idle");
  
  const stopDialToneSafely = useCallback(() => {
    if (stopDialTone) {
      stopDialTone();
    }
    dialToneCallIdRef.current = null;
  }, [stopDialTone]);

  // Handle audio call initiation - iniciar WebRTC quando há chamada criada
  useEffect(() => {
    // Only proceed if intent is audio and we have a call ID
    if (intent !== "audio" || !currentCall?.id) {
      return;
    }

    const callId = currentCall.id;
    const localCall = callState.getCall(callId);
    
    // Não iniciar se chamada foi encerrada pelo morador
    if (callEndedByResident || (localCall && localCall.state === "ended")) {
      setIntent("idle");
      stopDialToneSafely();
      return;
    }
    
    // Não iniciar se já está conectado ou se foi encerrada
    if (wasConnected && audioState === "idle") {
      setIntent("idle");
      stopDialToneSafely();
      return;
    }

    // Verificar se já iniciamos WebRTC para esta chamada
    if (webrtcInitiatedRef.current === callId) {
      if (process.env.NODE_ENV === "development") {
        console.log("[CallClient] WebRTC já iniciado para esta chamada, ignorando", { callId });
      }
      return;
    }

    let cancelled = false;
    
    // Marcar que iniciamos WebRTC para esta chamada
    webrtcInitiatedRef.current = callId;
    
    (async () => {
      try {
        if (process.env.NODE_ENV === "development") {
          console.log("[CallClient] Iniciando chamada WebRTC", { callId, intent });
        }
        
        // Iniciar WebRTC
        await initiateAudioCall(callId);
        
        if (process.env.NODE_ENV === "development") {
          console.log("[CallClient] Chamada WebRTC iniciada com sucesso", { callId });
        }
        
        if (!cancelled) {
          // Estado será atualizado quando receber call.accept
        }
      } catch (error) {
        console.error("[CallClient] Error initiating audio call", error);
        if (!cancelled) {
          webrtcInitiatedRef.current = null; // Reset em caso de erro
          setIntent("idle");
          stopDialToneSafely();
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [intent, currentCall?.id, initiateAudioCall, callState, callEndedByResident, wasConnected, audioState, stopDialToneSafely]);

  // Handle video call initiation
  useEffect(() => {
    if (intent !== "video" || !currentCall?.id) {
      return;
    }

    const callId = currentCall.id;
    if (!callId) {
      return;
    }

    let cancelled = false;
    
    (async () => {
      try {
        await initiateVideoCall(callId);
        if (!cancelled) {
          setIntent("video-active");
        }
      } catch (error) {
        // Silenciosamente tratar erros de vídeo
        if (!cancelled) {
          setIntent("idle");
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [intent, currentCall?.id, initiateVideoCall]);

  // Stop dial tone when call is connected or when receiving answer (resident accepted)
  useEffect(() => {
    // Stop dial tone immediately when connected
    if (audioState === "connected") {
      if (process.env.NODE_ENV === "development") {
        console.log("[SmartBell] Call connected, stopping dial tone");
      }
      stopDialToneSafely();
    }
    // Also stop when ringing (resident is answering) to prevent dial tone continuing
    if (audioState === "ringing") {
      if (process.env.NODE_ENV === "development") {
        console.log("[SmartBell] Call ringing (resident answering), stopping dial tone");
      }
      stopDialToneSafely();
    }
    // Stop dial tone when remote stream is received (resident accepted the call)
    // This happens before audioState changes to "connected" in some cases
    if (audioRemoteStream) {
      if (dialToneCallIdRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("[SmartBell] Remote stream received (resident accepted), stopping dial tone");
        }
        stopDialToneSafely();
      }
    }
  }, [audioState, audioRemoteStream, stopDialToneSafely]);

  // Stop dial tone immediately when call ends (especially when ended by resident)
  useEffect(() => {
    // CRITICAL: Stop dial tone FIRST if callEndedByResident is true (resident ended the call)
    // This must be checked FIRST to ensure immediate stop and prevent any restart
    if (callEndedByResident) {
      if (dialToneCallIdRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("[SmartBell] Call ended by resident, forcing dial tone stop");
        }
        stopDialToneSafely();
        dialToneCallIdRef.current = null;
      }
      return; // Don't check other conditions if call was ended by resident
    }
    
    // If call was connected and now is idle, it was ended - stop dial tone immediately
    // This handles the case where wasConnected is true but callEndedByResident hasn't been set yet
    if (wasConnected && audioState === "idle") {
      if (dialToneCallIdRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("[SmartBell] Call ended (was connected), stopping dial tone immediately");
        }
        stopDialToneSafely();
        dialToneCallIdRef.current = null;
      }
    }
    
    // Also stop if audio is idle and we're not in audio mode
    if (
      audioState === "idle" &&
      dialToneCallIdRef.current &&
      intent !== "audio" &&
      intent !== "audio-active"
    ) {
      if (process.env.NODE_ENV === "development") {
        console.log("[SmartBell] Audio idle and intent not audio, stopping dial tone");
      }
      stopDialToneSafely();
      dialToneCallIdRef.current = null;
    }
  }, [audioState, intent, wasConnected, callEndedByResident, stopDialToneSafely]);

  // Processar eventos call.accept quando recebidos - atualizar estado para "in_call"
  useEffect(() => {
    if (callId) {
      const localCall = callState.getCall(callId);
      if (localCall && localCall.state === "in_call") {
        // Chamada foi aceita - parar dial tone e atualizar UI
        // NÃO resetar callEndedByResident se já está true (chamada foi encerrada)
        if (!callEndedByResident) {
          stopDialToneSafely();
          setWasConnected(true);
          setCallEndedByResident(false);
          setIntent("audio-active");
        }
      }
    }
  }, [callId, callState, callEndedByResident, stopDialToneSafely]);

  // Sincronizar estado do WebRTC com callState quando conexão é estabelecida
  useEffect(() => {
    if (callId && (audioState === "connected" || videoState === "connected")) {
      const localCall = callState.getCall(callId);
      if (localCall && localCall.state !== "in_call") {
        callState.updateCallState(callId, "in_call");
      }
      // NÃO resetar callEndedByResident se já está true (chamada foi encerrada)
      if (!callEndedByResident) {
        setWasConnected(true);
        setCallEndedByResident(false); // Reset when new call connects
        stopDialToneSafely();
      }
    }
  }, [callId, audioState, videoState, callState, callEndedByResident, stopDialToneSafely]);

  // Reset intent when calls end - detect when resident ends call
  useEffect(() => {
    // Atualizar refs
    const prevWasConnected = prevWasConnectedRef.current;
    const prevAudioState = prevAudioStateRef.current;
    prevWasConnectedRef.current = wasConnected;
    prevAudioStateRef.current = audioState;
    
    // Check if call was connected and now is idle (ended by resident)
    // Só executar se houve mudança de estado (connected -> idle)
    if (prevWasConnected && prevAudioState === "connected" && audioState === "idle") {
      // Stop dial tone IMMEDIATELY - this is critical and must happen first
      if (dialToneCallIdRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("[SmartBell] Call ended by resident - stopping dial tone immediately");
        }
        stopDialToneSafely();
        dialToneCallIdRef.current = null;
      }
      
      // Set callEndedByResident apenas uma vez - verificar se já não está true
      if (!callEndedByResident && (intent === "audio-active" || intent === "audio")) {
        setCallEndedByResident(true);
        setStatusMessage("Chamada encerrada pelo morador.");
        setIntent("idle");
        // Don't reset wasConnected immediately - let the card show
      }
    } else if (intent === "audio-active" && audioState === "idle" && !wasConnected && !callEndedByResident) {
      // Call ended but wasn't connected (maybe error or visitor ended)
      setIntent("idle");
    }
  }, [audioState, intent, wasConnected, callEndedByResident, stopDialToneSafely]);

  useEffect(() => {
    if (intent === "video-active" && videoState === "idle") {
      // If call was connected and now is idle, it was ended by resident
      if (wasConnected) {
        // Limpar estado local se houver callId
        if (callId) {
          callState.cleanupCall(callId);
        }
        
        setCallEndedByResident(true);
        setStatusMessage("Chamada encerrada pelo morador.");
        setIntent("idle");
      } else {
        // Call ended but wasn't connected (maybe error or visitor ended)
        setIntent("idle");
      }
    }
  }, [intent, videoState, wasConnected, callId, callState]);

  // Update status based on connection state
  useEffect(() => {
    if (audioState === "connected" || videoState === "connected") {
      setStatusMessage("Chamada conectada.");
    } else if (audioState === "idle" && videoState === "idle" && intent === "idle" && currentCall && !wasConnected) {
      if (currentCall.status === "answered") {
        setStatusMessage("Chamada em andamento.");
      }
    }
  }, [audioState, intent, videoState, currentCall, wasConnected]);

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

  // Listen to call updates
  useEffect(() => {
    const { supabase, channel } = createRealtimeChannel(`call-${house.id}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calls",
          filter: `house_id=eq.${house.id}`
        },
        (payload) => {
          try {
            if (payload.new) {
              const data = payload.new as Call;
              // Validate call data before updating
              if (data && data.id && data.house_id === house.id) {
                setCurrentCall(data);
              }
            }
          } catch (error) {
            // Silenciosamente ignorar erros de realtime
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [house.id]);

  // Clear messages when callId changes
  useEffect(() => {
    setMessages([]);
  }, [callId]);

  // Listen to messages - ONLY for the current call
  useEffect(() => {
    if (!callId) {
      return;
    }
    
    const { supabase, channel } = createRealtimeChannel(`call-${callId}-messages`);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `call_id=eq.${callId}`
        },
        (payload) => {
          const data = payload.new as Message;
          // Double check that the message belongs to the current call
          if (data.call_id !== callId) {
            // Mensagem pertence a outra chamada, ignorar silenciosamente
            return;
          }
          setMessages((prev) => {
            // Ensure all messages belong to current call
            const filtered = prev.filter(m => m.call_id === callId);
            const exists = filtered.some((item) => item.id === data.id);
            if (exists) return filtered;
            return [...filtered, data].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId]);

  // Load messages when call changes - ensure we only load messages for current call
  useEffect(() => {
    if (!callId) {
      setMessages([]);
      return;
    }

    const controller = new AbortController();
    fetch(`/api/messages?callId=${callId}`, {
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("messages list error");
        }
        return response.json();
      })
      .then((data) => {
        // Filter messages to ensure they all belong to the current call
        const messages = (data.messages ?? []).filter((msg: Message) => msg.call_id === callId);
        setMessages(messages);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          // Silenciosamente ignorar erros de carregamento de mensagens
        }
      });

    return () => controller.abort();
  }, [callId]);

  const ensureCall = useCallback(
    async (type: CallType) => {
      if (currentCall && (currentCall.status === "pending" || currentCall.status === "answered")) {
        return currentCall;
      }

      setStatusMessage("Chamando morador...");

      try {
        const response = await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            houseId: house.id,
            type
          })
        });

        if (!response.ok) {
          setStatusMessage("Não foi possível iniciar a chamada.");
          throw new Error("call error");
        }

        const data = await response.json();
        const newCall = data.call as Call;
        // Clear all messages and set new call
        setMessages([]);
        setCurrentCall(newCall);
        setStatusMessage("Morador foi chamado. Aguardando resposta...");
        return newCall;
      } catch (error) {
        setStatusMessage("Falha ao iniciar a chamada.");
        throw error;
      }
    },
    [currentCall, house.id]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isSendingMessage) return;
      setIsSendingMessage(true);

      try {
        const call = await ensureCall("text");
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callId: call.id,
            content
          })
        });

        if (!response.ok) {
          throw new Error("message error");
        }
          } catch (error) {
            setStatusMessage("Não foi possível enviar a mensagem.");
          } finally {
        setIsSendingMessage(false);
      }
    },
    [ensureCall, isSendingMessage]
  );

  const handleSendAudio = useCallback(
    async (blob: Blob) => {
      try {
        const call = await ensureCall("audio");
        const formData = new FormData();
        formData.append("file", blob, "audio.webm");
        formData.append("houseId", house.id);

        const uploadResponse = await fetch("/api/audio", {
          method: "POST",
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error("upload audio error");
        }

        const { url } = await uploadResponse.json();

        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callId: call.id,
            audioUrl: url
          })
        });
          } catch (error) {
            setStatusMessage("Não foi possível enviar o áudio.");
          }
    },
    [ensureCall, house.id]
  );

  /**
   * Handler para eventos de sinalização recebidos
   */
  const handleSignalingEvent = useCallback((event: SignalingEvent) => {
    // Não processar eventos se chamada já foi encerrada (evitar loops)
    // EXCETO se for um call.hangup do outro lado (para mostrar overlay correto)
    const isOwnHangup = event.type === "call.hangup" && event.from === visitorIdRef.current;
    const isHangupFromOther = event.type === "call.hangup" && event.from !== visitorIdRef.current;
    
    // Ignorar apenas se:
    // 1. Chamada já foi encerrada E
    // 2. É um evento que não precisa processar (reject, status, ou próprio hangup)
    // NÃO ignorar se for hangup do outro lado
    if ((callEndedByResident || callEndedByVisitor) && 
        (event.type === "call.reject" || event.type === "call.status" || isOwnHangup) &&
        !isHangupFromOther) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[CallClient] Ignoring ${event.type} event - call already ended or own hangup`);
      }
      return;
    }
    
    if (process.env.NODE_ENV === "development") {
      console.log(`[CallClient] Received signaling event: ${event.type} for call ${event.callId}`);
    }
    
    // Processar evento através do hook de estado
    callState.handleSignalingEvent(event);
    
    // Atualizar UI baseado no estado
    const localCall = callState.getCall(event.callId);
    if (localCall) {
      if (localCall.state === "in_call") {
        // Chamada aceita - só processar se não foi encerrada
        if (!callEndedByResident) {
          setWasConnected(true);
          setIntent("audio-active");
          stopDialToneSafely();
        }
      } else if (localCall.state === "ended") {
        // Chamada encerrada - só setar se ainda não foi setado (evitar loops)
        // Se não foi o visitante que encerrou, foi o morador
        if (!callEndedByResident && !callEndedByVisitor) {
          setCallEndedByResident(true);
          setCallEndedByVisitor(false);
          setIntent("idle");
          stopDialToneSafely();
        }
      }
    }
    
    // Processar eventos específicos
    if (event.type === "call.reject") {
      // Chamada rejeitada - só processar se não foi encerrada
      if (!callEndedByResident) {
        stopDialToneSafely();
        setStatusMessage("Chamada recusada pelo morador.");
        setIntent("idle");
      }
    } else if (event.type === "call.hangup") {
      // Chamada encerrada - verificar quem encerrou pelo campo 'from' do evento
      // Se 'from' é o visitante, então o visitante encerrou (já foi setado no onHangup)
      // Se 'from' é o morador, então o morador encerrou
      const isFromVisitor = event.from === visitorIdRef.current;
      
      if (process.env.NODE_ENV === "development") {
        console.log(`[CallClient] Processing call.hangup event`, {
          from: event.from,
          visitorId: visitorIdRef.current,
          isFromVisitor,
          callEndedByResident,
          callEndedByVisitor
        });
      }
      
      // Se foi o próprio visitante que encerrou, não fazer nada (já foi setado no onHangup)
      if (isFromVisitor) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[CallClient] Ignoring own hangup event`);
        }
        return;
      }
      
      // Se foi o morador que encerrou, processar
      if (!callEndedByResident && !callEndedByVisitor) {
        stopDialToneSafely();
        setCallEndedByResident(true);
        setCallEndedByVisitor(false);
        setStatusMessage("Chamada encerrada pelo morador.");
        setIntent("idle");
      }
    }
  }, [callState, callEndedByResident, callEndedByVisitor, stopDialToneSafely]);

  /**
   * Configurar canal de sinalização para uma chamada
   */
  const setupSignalingChannel = useCallback((callId: string, residentId: string) => {
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
          console.log(`[CallClient] Subscribed to signaling channel for call ${callId}`);
        }
        
        // Enviar call.request após subscrever
        sendSignalingEvent(
          channel,
          createSignalingEvent.request(callId, visitorIdRef.current, residentId)
        ).catch(console.error);
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

  const handleRequestVoiceCall = useCallback(() => {
    // Reset call ended state when starting a new call
    setCallEndedByResident(false);
    setCallEndedByVisitor(false);
    setWasConnected(false);
    prevCallEndedByResidentRef.current = false;
    prevWasConnectedRef.current = false;
    webrtcInitiatedRef.current = null; // Reset WebRTC ref para permitir nova chamada
    startCalling(async () => {
      try {
        // Criar chamada no banco
        const call = await ensureCall("audio");
        
        // Criar estado local com callId
        const localCall = callState.createCall(call.id, house.owner_id);
        
        // Configurar canal de sinalização e enviar call.request
        setupSignalingChannel(call.id, house.owner_id);
        
        // Configurar timeout de 30s
        callState.setCallTimeout(call.id, 30000);
        
        // Iniciar dial tone
        if (playDialTone) {
          playDialTone();
          dialToneCallIdRef.current = call.id;
        }
        
        setIntent("audio");
      } catch (error) {
        console.error("[CallClient] Error initiating call", error);
        setStatusMessage("Falha ao iniciar a chamada.");
        setIntent("idle");
      }
    });
  }, [ensureCall, callState, house.owner_id, setupSignalingChannel, playDialTone]);

  const handleRequestVideoCall = useCallback(() => {
    startCalling(async () => {
      const call = await ensureCall("video");
      setIntent("video");
    });
  }, [ensureCall]);

  // Filter messages to ensure they only belong to current call
  const filteredMessages = useMemo(() => {
    if (!callId) return [];
    return messages.filter(msg => msg.call_id === callId);
  }, [messages, callId]);

  const showChat = intent === "text" || (currentCall && currentCall.type === "text" && intent !== "audio-active" && intent !== "video-active");
  // Don't show audio call UI if call was ended by resident
  // Mostrar quando intent é "audio" (chamando) ou "audio-active" (conectado), ou quando audioState não é idle
  const showAudioCall = (intent === "audio" || intent === "audio-active" || audioState !== "idle") && !callEndedByResident && !callEndedByVisitor && !!currentCall;
  const showVideoCall = (intent === "video-active" || videoState !== "idle") && !callEndedByResident && !callEndedByVisitor;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Header */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                <Bell className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-100">
                  {house.name}
                </CardTitle>
                <CardDescription className="flex items-center justify-center gap-2 text-slate-400 mt-2">
                  <Clock className="h-3 w-3" />
                  {currentCall ? formatDate(currentCall.created_at) : "Nova chamada"}
                </CardDescription>
              </div>
              {currentCall && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Status:</span>
                  <StatusBadge status={currentCall.status} />
                </div>
              )}
              {statusMessage && (
                <div className={cn(
                  "w-full p-3 rounded-lg animate-in fade-in",
                  statusMessage.includes("encerrada") 
                    ? "bg-red-500/10 border border-red-500/30" 
                    : "bg-slate-800/50"
                )}>
                  <p className={cn(
                    "text-sm text-center",
                    statusMessage.includes("encerrada")
                      ? "text-red-400 font-semibold"
                      : "text-slate-400"
                  )}>
                    {statusMessage}
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Action Buttons - Only show when idle */}
        {intent === "idle" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={async () => {
                setIntent("text");
                await ensureCall("text");
                setTimeout(() => messageInputRef.current?.focus(), 100);
              }}
              variant="outline"
              size="lg"
              className="h-32 flex-col gap-3"
              disabled={isCalling}
            >
              <MessageSquare className="h-8 w-8" />
              <div className="text-center">
                <p className="font-semibold">Chat</p>
                <p className="text-xs text-muted-foreground">Mensagem de texto</p>
              </div>
            </Button>

            <Button
              onClick={handleRequestVoiceCall}
              variant="outline"
              size="lg"
              className="h-32 flex-col gap-3"
              disabled={isCalling}
            >
              <Phone className="h-8 w-8" />
              <div className="text-center">
                <p className="font-semibold">Áudio</p>
                <p className="text-xs text-muted-foreground">Chamada de voz</p>
              </div>
            </Button>

            <Button
              onClick={handleRequestVideoCall}
              variant="outline"
              size="lg"
              className="h-32 flex-col gap-3"
              disabled={isCalling}
            >
              <Video className="h-8 w-8" />
              <div className="text-center">
                <p className="font-semibold">Vídeo</p>
                <p className="text-xs text-muted-foreground">Chamada com vídeo</p>
              </div>
            </Button>
          </div>
        )}

        {/* Chat Window */}
        {showChat && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Chat</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIntent("idle")}
                >
                  Fechar
                </Button>
              </div>
              <ChatWindow
                messages={filteredMessages}
                onSendMessage={handleSendMessage}
                isSending={isSendingMessage}
                textareaRef={messageInputRef}
              />
              <div className="mt-4">
                <AudioRecorder
                  onSave={handleSendAudio}
                  disabled={isCalling || showAudioCall || showVideoCall}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audio Call */}
        {showAudioCall && currentCall && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardContent className="pt-6">
              <AudioCall
                call={currentCall}
                state={audioState}
                onHangup={async () => {
                  if (process.env.NODE_ENV === "development") {
                    console.log(`[CallClient] onHangup called`, { callId, hasCurrentCall: !!currentCall });
                  }
                  
                  if (!callId) {
                    if (process.env.NODE_ENV === "development") {
                      console.warn(`[CallClient] onHangup called but no callId`);
                    }
                    return;
                  }
                  
                  try {
                    // Marcar que o visitante encerrou ANTES de fazer outras operações
                    // Isso garante que o overlay apareça imediatamente
                    setCallEndedByVisitor(true);
                    setCallEndedByResident(false);
                    
                    if (process.env.NODE_ENV === "development") {
                      console.log(`[CallClient] Set callEndedByVisitor=true, callEndedByResident=false`);
                    }
                    
                    // Encerrar via WebRTC
                    await hangupAudioCall();
                    
                    if (process.env.NODE_ENV === "development") {
                      console.log(`[CallClient] WebRTC hangup completed`);
                    }
                    
                    // Enviar evento call.hangup via sinalização
                    // IMPORTANTE: Fazer isso ANTES de limpar o estado local
                    const channelEntry = signalingChannelsRef.current.get(callId);
                    if (process.env.NODE_ENV === "development") {
                      console.log(`[CallClient] Checking signaling channel`, {
                        callId,
                        hasChannelEntry: !!channelEntry,
                        hasChannel: !!channelEntry?.channel,
                        hasCurrentCall: !!currentCall,
                        signalingChannelsSize: signalingChannelsRef.current.size,
                        signalingChannelKeys: Array.from(signalingChannelsRef.current.keys())
                      });
                    }
                    
                    if (channelEntry?.channel && currentCall) {
                      const hangupEvent = createSignalingEvent.hangup(callId, visitorIdRef.current, house.owner_id, "user_end");
                      if (process.env.NODE_ENV === "development") {
                        console.log(`[CallClient] Sending call.hangup event`, {
                          callId,
                          from: visitorIdRef.current,
                          to: house.owner_id,
                          event: hangupEvent
                        });
                      }
                      await sendSignalingEvent(channelEntry.channel, hangupEvent);
                      if (process.env.NODE_ENV === "development") {
                        console.log(`[CallClient] call.hangup event sent successfully`);
                      }
                    } else {
                      if (process.env.NODE_ENV === "development") {
                        console.warn(`[CallClient] Cannot send call.hangup - channel or call not found`, {
                          hasChannelEntry: !!channelEntry,
                          hasChannel: !!channelEntry?.channel,
                          hasCall: !!currentCall,
                          callId
                        });
                      }
                    }
                    
                    // Limpar estado local DEPOIS de enviar o evento
                    callState.cleanupCall(callId);
                    
                    setIntent("idle");
                    setWasConnected(false);
                    stopDialToneSafely();
                  } catch (error) {
                    console.error("[CallClient] Error hanging up", error);
                    // Em caso de erro, ainda mostrar o overlay
                    setCallEndedByVisitor(true);
                    setCallEndedByResident(false);
                  }
                }}
                remoteStream={audioRemoteStream}
              />
            </CardContent>
          </Card>
        )}

        {/* Call Ended Overlay - Show fullscreen when call was ended */}
        {(callEndedByResident || callEndedByVisitor) && (
          <CallEndedOverlay
            endedBy={callEndedByVisitor ? "self" : "other"}
            otherPartyLabel="morador"
            onClose={() => {
              // Limpar estado local se houver callId
              if (callId) {
                callState.cleanupCall(callId);
              }
              
              // Reset todos os estados e refs
              setCallEndedByResident(false);
              setCallEndedByVisitor(false);
              setWasConnected(false);
              setStatusMessage(null);
              setIntent("idle");
              stopDialToneSafely(); // Ensure dial tone is stopped
              dialToneCallIdRef.current = null; // Clear dial tone ref
              webrtcInitiatedRef.current = null; // Clear WebRTC ref
              prevCallEndedByResidentRef.current = false;
              prevWasConnectedRef.current = false;
              prevAudioStateRef.current = "idle";
            }}
          />
        )}

        {/* Video Call */}
        {showVideoCall && currentCall && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardContent className="pt-6">
              <VideoCall
                call={currentCall}
                state={videoState}
                localStream={videoLocalStream}
                remoteStream={videoRemoteStream}
                onHangup={() => {
                  hangupVideoCall();
                  setIntent("idle");
                  setWasConnected(false);
                  setCallEndedByResident(false); // Visitor ended, not resident
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* End Call Button */}
        {(showAudioCall || showVideoCall) && (
          <div className="flex justify-center">
            <Button
              variant="destructive"
              size="lg"
              onClick={async () => {
                if (process.env.NODE_ENV === "development") {
                  console.log(`[CallClient] Encerrar Chamada button clicked`, { 
                    showAudioCall, 
                    showVideoCall, 
                    callId,
                    hasCurrentCall: !!currentCall 
                  });
                }
                
                if (showAudioCall && callId) {
                  // Usar a mesma lógica do onHangup do AudioCall
                  try {
                    // Marcar que o visitante encerrou ANTES de fazer outras operações
                    setCallEndedByVisitor(true);
                    setCallEndedByResident(false);
                    
                    if (process.env.NODE_ENV === "development") {
                      console.log(`[CallClient] Set callEndedByVisitor=true, callEndedByResident=false`);
                    }
                    
                    // Encerrar via WebRTC
                    await hangupAudioCall();
                    
                    if (process.env.NODE_ENV === "development") {
                      console.log(`[CallClient] WebRTC hangup completed`);
                    }
                    
                    // Enviar evento call.hangup via sinalização
                    const channelEntry = signalingChannelsRef.current.get(callId);
                    if (process.env.NODE_ENV === "development") {
                      console.log(`[CallClient] Checking signaling channel`, {
                        callId,
                        hasChannelEntry: !!channelEntry,
                        hasChannel: !!channelEntry?.channel,
                        hasCurrentCall: !!currentCall,
                        signalingChannelsSize: signalingChannelsRef.current.size,
                        signalingChannelKeys: Array.from(signalingChannelsRef.current.keys())
                      });
                    }
                    
                    if (channelEntry?.channel && currentCall) {
                      const hangupEvent = createSignalingEvent.hangup(callId, visitorIdRef.current, house.owner_id, "user_end");
                      if (process.env.NODE_ENV === "development") {
                        console.log(`[CallClient] Sending call.hangup event`, {
                          callId,
                          from: visitorIdRef.current,
                          to: house.owner_id,
                          event: hangupEvent
                        });
                      }
                      await sendSignalingEvent(channelEntry.channel, hangupEvent);
                      if (process.env.NODE_ENV === "development") {
                        console.log(`[CallClient] call.hangup event sent successfully`);
                      }
                    } else {
                      if (process.env.NODE_ENV === "development") {
                        console.warn(`[CallClient] Cannot send call.hangup - channel or call not found`, {
                          hasChannelEntry: !!channelEntry,
                          hasChannel: !!channelEntry?.channel,
                          hasCall: !!currentCall,
                          callId
                        });
                      }
                    }
                    
                    // Limpar estado local DEPOIS de enviar o evento
                    callState.cleanupCall(callId);
                    
                    setIntent("idle");
                    setWasConnected(false);
                    stopDialToneSafely();
                  } catch (error) {
                    console.error("[CallClient] Error hanging up", error);
                    setCallEndedByVisitor(true);
                    setCallEndedByResident(false);
                  }
                }
                if (showVideoCall) {
                  hangupVideoCall();
                }
                if (!showAudioCall) {
                  setIntent("idle");
                }
              }}
              className="w-full max-w-md"
            >
              <PhoneOff className="mr-2 h-4 w-4" />
              Encerrar Chamada
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

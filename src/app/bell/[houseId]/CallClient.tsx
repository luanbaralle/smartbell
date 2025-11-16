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

    // Se já iniciamos o dial tone para esta chamada, não reiniciar
    if (dialToneCallIdRef.current === callId) {
      return;
    }

    let cancelled = false;
    
    // Marcar que iniciamos o dial tone para esta chamada
    dialToneCallIdRef.current = callId;
    
    (async () => {
      try {
        // Iniciar WebRTC
        await initiateAudioCall(callId);
        if (!cancelled) {
          // Estado será atualizado quando receber call.accept
        }
      } catch (error) {
        console.error("[CallClient] Error initiating audio call", error);
        if (!cancelled) {
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
        stopDialToneSafely();
        setWasConnected(true);
        setCallEndedByResident(false);
        setIntent("audio-active");
      }
    }
  }, [callId, callState, stopDialToneSafely]);

  // Sincronizar estado do WebRTC com callState quando conexão é estabelecida
  useEffect(() => {
    if (callId && (audioState === "connected" || videoState === "connected")) {
      const localCall = callState.getCall(callId);
      if (localCall && localCall.state !== "in_call") {
        callState.updateCallState(callId, "in_call");
      }
      setWasConnected(true);
      setCallEndedByResident(false); // Reset when new call connects
      stopDialToneSafely();
    }
  }, [callId, audioState, videoState, callState, stopDialToneSafely]);

  // Reset intent when calls end - detect when resident ends call
  useEffect(() => {
    // Check if call was connected and now is idle (ended by resident)
    if (wasConnected && audioState === "idle") {
      // Stop dial tone IMMEDIATELY - this is critical and must happen first
      if (dialToneCallIdRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("[SmartBell] Call ended by resident - stopping dial tone immediately");
        }
        stopDialToneSafely();
        dialToneCallIdRef.current = null;
      }
      
      // Set callEndedByResident immediately to prevent any dial tone restart
      if (intent === "audio-active" || intent === "audio") {
        setCallEndedByResident(true);
        setStatusMessage("Chamada encerrada pelo morador.");
        setIntent("idle");
        // Don't reset wasConnected immediately - let the card show
      }
    } else if (intent === "audio-active" && audioState === "idle" && !wasConnected) {
      // Call ended but wasn't connected (maybe error or visitor ended)
      setIntent("idle");
    }
  }, [audioState, intent, wasConnected, stopDialToneSafely]);

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
    if (process.env.NODE_ENV === "development") {
      console.log(`[CallClient] Received signaling event: ${event.type} for call ${event.callId}`);
    }
    
    // Processar evento através do hook de estado
    callState.handleSignalingEvent(event);
    
    // Atualizar UI baseado no estado
    const localCall = callState.getCall(event.callId);
    if (localCall) {
      if (localCall.state === "in_call") {
        // Chamada aceita
        setWasConnected(true);
        setIntent("audio-active");
        stopDialToneSafely();
      } else if (localCall.state === "ended") {
        // Chamada encerrada
        setCallEndedByResident(true);
        setIntent("idle");
        stopDialToneSafely();
      }
    }
    
    // Processar eventos específicos
    if (event.type === "call.reject") {
      // Chamada rejeitada
      stopDialToneSafely();
      setStatusMessage("Chamada recusada pelo morador.");
      setIntent("idle");
    } else if (event.type === "call.hangup") {
      // Chamada encerrada pelo morador
      stopDialToneSafely();
      setCallEndedByResident(true);
      setStatusMessage("Chamada encerrada pelo morador.");
      setIntent("idle");
    }
  }, [callState, stopDialToneSafely]);

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
    setWasConnected(false);
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
  const showAudioCall = (intent === "audio" || intent === "audio-active" || audioState !== "idle") && !callEndedByResident && !!currentCall;
  const showVideoCall = (intent === "video-active" || videoState !== "idle") && !callEndedByResident;

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
                  if (!callId) return;
                  
                  try {
                    // Encerrar via WebRTC
                    await hangupAudioCall();
                    
                    // Enviar evento call.hangup via sinalização
                    const channel = signalingChannelsRef.current.get(callId);
                    if (channel && currentCall) {
                      await sendSignalingEvent(
                        channel.channel,
                        createSignalingEvent.hangup(callId, visitorIdRef.current, house.owner_id, "user_end")
                      );
                    }
                    
                    // Limpar estado local
                    callState.cleanupCall(callId);
                    
                    setIntent("idle");
                    setWasConnected(false);
                    setCallEndedByResident(false); // Visitor ended, not resident
                    stopDialToneSafely();
                  } catch (error) {
                    console.error("[CallClient] Error hanging up", error);
                  }
                }}
                remoteStream={audioRemoteStream}
              />
            </CardContent>
          </Card>
        )}

        {/* Call Ended Overlay - Show fullscreen when call was ended by resident */}
        {callEndedByResident && (
          <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-red-950/95 via-slate-950/95 to-slate-950/95 backdrop-blur-md">
            <div className="flex h-full flex-col items-center justify-center p-6">
              <div className="w-full max-w-md space-y-8 text-center">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                    <div className="relative h-28 w-28 rounded-full bg-red-500/40 flex items-center justify-center border-4 border-red-500/50">
                      <PhoneOff className="h-14 w-14 text-red-400" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-red-400">
                    Chamada Encerrada
                  </h2>
                  <p className="text-base text-slate-400">
                    O morador encerrou a chamada.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setCallEndedByResident(false);
                    setWasConnected(false);
                    setStatusMessage(null);
                    setIntent("idle");
                    stopDialToneSafely(); // Ensure dial tone is stopped
                    dialToneCallIdRef.current = null; // Clear dial tone ref
                  }}
                  className="w-full h-14 text-lg"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
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
              onClick={() => {
                if (showAudioCall) {
                  hangupAudioCall();
                }
                if (showVideoCall) {
                  hangupVideoCall();
                }
                setIntent("idle");
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

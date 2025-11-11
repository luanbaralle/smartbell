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
import { useAudioCall } from "@/hooks/useAudioCall";
import { useVideoCall } from "@/hooks/useVideoCall";
import type { Call, CallType, House, Message } from "@/types";
import { createRealtimeChannel } from "@/lib/realtime";
import { cn } from "@/lib/utils";

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
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isCalling, startCalling] = useTransition();
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [intent, setIntent] = useState<CallIntent>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const audioSectionRef = useRef<HTMLDivElement | null>(null);

  const callId = currentCall?.id ?? null;
  const audioCall = useAudioCall(callId, "visitor");
  const videoCall = useVideoCall(callId, "visitor");
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

  useEffect(() => {
    if (!currentCall) {
      setStatusMessage(null);
      setIntent("idle");
      return;
    }

    if (currentCall.status === "pending") {
      setStatusMessage("Aguardando resposta do morador...");
    } else if (currentCall.status === "answered") {
      setStatusMessage("Morador atendeu. Comunicação ativa.");
    } else if (currentCall.status === "missed") {
      setStatusMessage("Morador não disponível no momento.");
      setIntent("idle");
    }
  }, [currentCall]);

  useEffect(() => {
    if (intent === "audio" && currentCall?.id) {
      (async () => {
        await initiateAudioCall(currentCall.id);
        setIntent("audio-active");
      })();
    }
  }, [intent, currentCall?.id, initiateAudioCall]);

  useEffect(() => {
    if (intent === "video" && currentCall?.id) {
      (async () => {
        await initiateVideoCall(currentCall.id);
        setIntent("video-active");
      })();
    }
  }, [intent, currentCall?.id, initiateVideoCall]);

  useEffect(() => {
    if (intent === "audio-active" && audioState === "idle") {
      setIntent("idle");
    }
  }, [audioState, intent]);

  useEffect(() => {
    if (intent === "video-active" && videoState === "idle") {
      setIntent("idle");
    }
  }, [intent, videoState]);

  useEffect(() => {
    if (audioState === "connected" || videoState === "connected") {
      setStatusMessage("Chamada conectada.");
    } else if (audioState === "idle" && videoState === "idle" && intent === "idle") {
      setStatusMessage("Chamada encerrada.");
    }
  }, [audioState, intent, videoState]);

  useEffect(() => {
    const { supabase, channel } = createRealtimeChannel(`calls:${house.id}`);

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
          if (!payload.new) return;
          const data = payload.new as Call;
          setCurrentCall(data);
        }
      );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error("[SmartBell] call realtime subscribe error");
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [house.id]);

  useEffect(() => {
    if (!callId) return;
    const { supabase, channel } = createRealtimeChannel(`messages:${callId}`);

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
          setMessages((prev) => {
            const exists = prev.some((item) => item.id === data.id);
            if (exists) return prev;
            return [...prev, data].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });
        }
      );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error("[SmartBell] message realtime subscribe error");
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId]);

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
        setMessages(data.messages ?? []);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("[SmartBell] não foi possível carregar mensagens", error);
        }
      });

    return () => controller.abort();
  }, [callId]);

  const hasActiveCall = useMemo(() => {
    if (!currentCall) return false;
    return (
      currentCall.status === "pending" || currentCall.status === "answered"
    );
  }, [currentCall]);
  const showAudioPanel =
    !!currentCall &&
    (intent === "audio-active" ||
      audioState === "calling" ||
      audioState === "ringing" ||
      audioState === "connected");
  const showVideoPanel =
    !!currentCall &&
    (intent === "video-active" ||
      videoState === "calling" ||
      videoState === "ringing" ||
      videoState === "connected");

  const ensureCall = useCallback(
    async (type: CallType) => {
      setIntent(type);
      if (hasActiveCall && currentCall) {
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
        setCurrentCall(data.call);
        setMessages([]);
        setStatusMessage("Morador foi chamado. Aguardando resposta...");
        return data.call as Call;
      } catch (error) {
        console.error(error);
        setStatusMessage("Falha ao iniciar a chamada.");
        throw error;
      }
    },
    [currentCall, hasActiveCall, house.id]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
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
        setStatusMessage("Mensagem enviada.");
      } catch (error) {
        console.error(error);
        setStatusMessage("Não foi possível enviar a mensagem.");
      } finally {
        setIsSendingMessage(false);
      }
    },
    [ensureCall]
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
        setStatusMessage("Mensagem de áudio enviada.");
      } catch (error) {
        console.error(error);
        setStatusMessage("Não foi possível enviar o áudio.");
      }
    },
    [ensureCall, house.id]
  );

  const handleRequestVoiceCall = useCallback(() => {
    startCalling(async () => {
      await ensureCall("audio");
    });
  }, [ensureCall]);

  const handleRequestVideoCall = useCallback(() => {
    startCalling(async () => {
      await ensureCall("video");
    });
  }, [ensureCall]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{house.name}</CardTitle>
          <CardDescription>
            Você está prestes a chamar o morador desta residência.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentCall && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span>Status da chamada:</span>
              <StatusBadge status={currentCall.status} />
            </div>
          )}

          {statusMessage && (
            <p className="text-sm text-slate-400">{statusMessage}</p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
        <Button
          className="w-full"
          variant="outline"
          onClick={() => messageInputRef.current?.focus()}
        >
          Enviar mensagem
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={() =>
            audioSectionRef.current?.scrollIntoView({ behavior: "smooth" })
          }
        >
          Enviar áudio
        </Button>
            <Button
              className="w-full"
              onClick={() =>
                startCalling(async () => {
                  await ensureCall("audio");
                })
              }
              disabled={isCalling}
            >
              Chamar morador
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleRequestVoiceCall}
              disabled={isCalling}
            >
              Iniciar chamada de voz
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleRequestVideoCall}
              disabled={isCalling}
            >
              Vídeo chamada
            </Button>
          </div>
        </CardContent>
      </Card>

      {showAudioPanel && currentCall && (
        <Card>
          <CardHeader>
            <CardTitle>Chamada de voz</CardTitle>
            <CardDescription>
              {audioState === "calling"
                ? "Chamando morador..."
                : audioState === "ringing"
                  ? "Morador foi notificado. Aguarde."
                  : audioState === "connected"
                    ? "Chamada ativa."
                    : "Sessão finalizada."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AudioCall
              call={currentCall}
              state={audioState}
              remoteStream={audioRemoteStream}
              onHangup={() => {
                void hangupAudioCall();
                setIntent("idle");
              }}
            />
          </CardContent>
        </Card>
      )}

      {showVideoPanel && currentCall && (
        <Card>
          <CardHeader>
            <CardTitle>Vídeo chamada</CardTitle>
            <CardDescription>
              {videoState === "calling"
                ? "Preparando chamada de vídeo..."
                : videoState === "ringing"
                  ? "Aguardando o morador aceitar."
                  : videoState === "connected"
                    ? "Conexão de vídeo ativa."
                    : "Sessão finalizada."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VideoCall
              call={currentCall}
              state={videoState}
              localStream={videoLocalStream}
              remoteStream={videoRemoteStream}
              onHangup={() => {
                void hangupVideoCall();
                setIntent("idle");
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mensagens</CardTitle>
          <CardDescription>
            Envie uma mensagem ou áudio para o morador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isSending={isSendingMessage}
            textareaRef={messageInputRef}
          />
          <div
            className={cn(
              "rounded-md border border-slate-800 bg-slate-900/60 p-4"
            )}
            ref={audioSectionRef}
          >
            <AudioRecorder
              onSave={handleSendAudio}
              disabled={isCalling || intent.startsWith("video")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


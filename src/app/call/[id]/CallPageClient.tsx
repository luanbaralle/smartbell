"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatWindow } from "@/components/ChatWindow";
import { AudioCall } from "@/components/AudioCall";
import { VideoCall } from "@/components/VideoCall";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Phone,
  Video,
  MessageSquare,
  PhoneOff,
  ArrowLeft,
  Clock,
  User
} from "lucide-react";
import { useAudioCall } from "@/hooks/useAudioCall";
import { useVideoCall } from "@/hooks/useVideoCall";
import type { Call, House, Message } from "@/types";
import { createRealtimeChannel } from "@/lib/realtime";
import { cn, formatDate } from "@/lib/utils";

type CallPageClientProps = {
  call: Call;
  house: House;
  initialMessages: Message[];
  userId: string;
};

const QUICK_RESPONSES = [
  { text: "Já estou indo", emoji: "🚶" },
  { text: "Aguarde um momento", emoji: "⏳" },
  { text: "Pode deixar com o porteiro", emoji: "🏢" },
  { text: "Não posso atender agora", emoji: "❌" }
];

export function CallPageClient({
  call: initialCall,
  house,
  initialMessages,
  userId
}: CallPageClientProps) {
  const router = useRouter();
  const [call, setCall] = useState<Call>(initialCall);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [activeMode, setActiveMode] = useState<"chat" | "audio" | "video" | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  const audioCall = useAudioCall(call.id, "resident");
  const videoCall = useVideoCall(call.id, "resident");

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

  // Listen to call updates
  useEffect(() => {
    const { supabase, channel } = createRealtimeChannel(`call-${call.id}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `id=eq.${call.id}`
        },
        (payload) => {
          if (payload.new) {
            setCall(payload.new as Call);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [call.id]);

  // Listen to messages
  useEffect(() => {
    const { supabase, channel } = createRealtimeChannel(`call-${call.id}-messages`);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `call_id=eq.${call.id}`
        },
        (payload) => {
          if (payload.new) {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [call.id]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isSendingMessage) return;

      setIsSendingMessage(true);
      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            call_id: call.id,
            sender: userId,
            content: content.trim()
          })
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }
      } catch (error) {
        console.error("[SmartBell] Send message error", error);
        throw error;
      } finally {
        setIsSendingMessage(false);
      }
    },
    [call.id, userId, isSendingMessage]
  );

  const sendQuickResponse = useCallback(
    async (text: string) => {
      await sendMessage(text);
    },
    [sendMessage]
  );

  const answerCall = useCallback(async () => {
    try {
      const response = await fetch(`/api/calls/${call.id}/answer`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Failed to answer call");
      }

      // Auto-start chat if it's a text call
      if (call.type === "text") {
        setActiveMode("chat");
        setTimeout(() => {
          messageInputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error("[SmartBell] Answer call error", error);
    }
  }, [call.id, call.type]);

  const startAudioCall = useCallback(async () => {
    setActiveMode("audio");
    await initiateAudioCall(call.id);
  }, [call.id, initiateAudioCall]);

  const startVideoCall = useCallback(async () => {
    setActiveMode("video");
    await initiateVideoCall(call.id);
  }, [call.id, initiateVideoCall]);

  const endCall = useCallback(async () => {
    if (activeMode === "audio") {
      hangupAudioCall();
    } else if (activeMode === "video") {
      hangupVideoCall();
    }

    setActiveMode(null);

    try {
      await fetch(`/api/calls/${call.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "missed" })
      });
    } catch (error) {
      console.error("[SmartBell] End call error", error);
    }

    router.push("/dashboard");
  }, [activeMode, call.id, hangupAudioCall, hangupVideoCall, router]);

  const isAnswered = call.status === "answered";
  const isPending = call.status === "pending";
  const showQuickResponses = isAnswered && activeMode === "chat";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Header */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/dashboard")}
                  className="text-slate-400 hover:text-slate-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <CardTitle className="text-xl text-slate-100">
                    {house.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-slate-400">
                    <Clock className="h-3 w-3" />
                    {formatDate(call.created_at)}
                  </CardDescription>
                </div>
              </div>
              <StatusBadge status={call.status} />
            </div>
          </CardHeader>
        </Card>

        {/* Call Info */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                <User className="h-8 w-8" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-100">
                  {call.visitor_name || "Visitante"}
                </p>
                <p className="text-sm text-slate-400">
                  {isPending && "Aguardando sua resposta..."}
                  {isAnswered && "Chamada em andamento"}
                  {call.status === "missed" && "Chamada perdida"}
                </p>
              </div>

              {isPending && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={answerCall}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Atender Chamada
                  </Button>
                </div>
              )}

              {isAnswered && !activeMode && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setActiveMode("chat");
                      setTimeout(() => messageInputRef.current?.focus(), 100);
                    }}
                    variant="outline"
                    size="lg"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat
                  </Button>
                  <Button
                    onClick={startAudioCall}
                    variant="outline"
                    size="lg"
                    disabled={audioState !== "idle"}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Áudio
                  </Button>
                  <Button
                    onClick={startVideoCall}
                    variant="outline"
                    size="lg"
                    disabled={videoState !== "idle"}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Vídeo
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Responses */}
        {showQuickResponses && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-2">
                {QUICK_RESPONSES.map((response, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    onClick={() => sendQuickResponse(response.text)}
                    className="h-auto py-3 text-left"
                    disabled={isSendingMessage}
                  >
                    <span className="mr-2">{response.emoji}</span>
                    {response.text}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Window */}
        {activeMode === "chat" && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Chat</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveMode(null)}
                >
                  Fechar
                </Button>
              </div>
              <ChatWindow
                messages={messages}
                onSendMessage={sendMessage}
                isSending={isSendingMessage}
                textareaRef={messageInputRef}
              />
            </CardContent>
          </Card>
        )}

        {/* Audio Call */}
        {activeMode === "audio" && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardContent className="pt-6">
              <AudioCall
                call={call}
                state={audioState}
                onHangup={() => {
                  hangupAudioCall();
                  setActiveMode(null);
                }}
                remoteStream={audioRemoteStream}
              />
            </CardContent>
          </Card>
        )}

        {/* Video Call */}
        {activeMode === "video" && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
            <CardContent className="pt-6">
              <VideoCall
                call={call}
                state={videoState}
                localStream={videoLocalStream}
                remoteStream={videoRemoteStream}
                onHangup={() => {
                  hangupVideoCall();
                  setActiveMode(null);
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* End Call Button */}
        {isAnswered && activeMode && (
          <div className="flex justify-center">
            <Button
              variant="destructive"
              size="lg"
              onClick={endCall}
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


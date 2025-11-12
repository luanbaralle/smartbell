"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from "react";
import { MessageSquare, PhoneIncoming, Send } from "lucide-react";

import { NotificationButton } from "@/components/NotificationButton";
import { ChatWindow } from "@/components/ChatWindow";
import { AudioRecorder } from "@/components/AudioRecorder";
import { AudioCall } from "@/components/AudioCall";
import { VideoCall } from "@/components/VideoCall";
import { StatusBadge } from "@/components/StatusBadge";
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
    });
    return values;
  }, [callMap]);

  useEffect(() => {
    const { supabase, channel } = createRealtimeChannel(
      `dashboard-calls:${profile.id}`
    );

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
          if (!payload.new) return;
          const data = payload.new as Call;
          const houseInfo = houseLookup.get(data.house_id);
          if (!houseInfo) return;
          const dashboardCall: DashboardCall = { ...data, house: houseInfo };

          setCallMap((prev) => ({
            ...prev,
            [dashboardCall.id]: dashboardCall
          }));
          setCallOrder((prev) => {
            const filtered = prev.filter((id) => id !== dashboardCall.id);
            return [dashboardCall.id, ...filtered];
          });
        }
      );
    });

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error("[SmartBell] dashboard calls realtime error");
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
      if (!selectedCallId) return;
      try {
        await updateCallStatus(selectedCallId, status);
      } catch (error) {
        console.error(error);
      }
    },
    [selectedCallId]
  );

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
    if (!selectedCallId) return;
    try {
      await acceptAudioCall();
      await updateCallStatus(selectedCallId, "answered");
    } catch (error) {
      console.error(error);
    }
  }, [acceptAudioCall, selectedCallId]);

  const handleAcceptVideoCall = useCallback(async () => {
    if (!selectedCallId) return;
    try {
      await acceptVideoCall();
      await updateCallStatus(selectedCallId, "answered");
    } catch (error) {
      console.error(error);
    }
  }, [acceptVideoCall, selectedCallId]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Bem-vindo, {profile.email}</CardTitle>
              <CardDescription>
                Gerencie suas chamadas em tempo real e responda aos visitantes.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                startSignOut(async () => {
                  await signOut();
                  window.location.href = "/dashboard";
                })
              }
              disabled={isSigningOut}
            >
              Sair
            </Button>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6">
            <div>
              <p className="text-3xl font-semibold">{housesList.length}</p>
              <p className="text-sm text-slate-400">Casas vinculadas</p>
            </div>
            <div>
              <p className="text-3xl font-semibold">
                {callOrder.length}
              </p>
              <p className="text-sm text-slate-400">Chamadas registradas</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-green-400">
                {answeredCount}
              </p>
              <p className="text-sm text-slate-400">Chamadas atendidas</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-red-400">
                {missedCount}
              </p>
              <p className="text-sm text-slate-400">Chamadas perdidas</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-amber-300">
                {pendingCount}
              </p>
              <p className="text-sm text-slate-400">Chamadas pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notificações Push</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationButton onToken={handleSaveFcm} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Chamadas</CardTitle>
            <CardDescription>
              Veja as chamadas recentes e selecione para responder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {housesList.length === 0 && (
              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <p className="text-sm text-slate-300">
                  Nenhuma casa cadastrada. Crie uma casa de teste para começar.
                </p>
                <Button
                  onClick={handleCreateHouse}
                  disabled={isCreatingHouse}
                  className="w-full"
                >
                  {isCreatingHouse ? "Criando..." : "Criar Casa de Teste"}
                </Button>
              </div>
            )}
            {callOrder.length === 0 && housesList.length > 0 && (
              <p className="text-sm text-slate-400">
                Nenhuma chamada registrada até o momento.
              </p>
            )}
            <div className="space-y-2">
              {callOrder.map((callId) => {
                const call = callMap[callId];
                if (!call) return null;
                return (
                  <button
                    key={call.id}
                    onClick={() => setSelectedCallId(call.id)}
                    className={cn(
                      "w-full rounded-md border border-slate-800 bg-slate-900/50 p-3 text-left transition hover:bg-slate-900",
                      selectedCallId === call.id && "border-primary bg-slate-900"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                        <PhoneIncoming className="h-4 w-4 text-primary" />
                        {call.house.name}
                      </div>
                      <StatusBadge status={call.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(call.created_at)} · {call.type.toUpperCase()}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[480px]">
          <CardHeader>
            <CardTitle>Detalhes da chamada</CardTitle>
            <CardDescription>
              Responda via texto ou áudio e atualize o status da chamada.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-4">
            {selectedCall ? (
              <>
                <div className="flex w-full items-center justify-between rounded-md border border-slate-800 bg-slate-900/60 p-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {selectedCall.house.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Iniciada em {formatDate(selectedCall.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={selectedCall.status} />
                </div>

                <ChatWindow
                  messages={selectedMessages}
                  onSendMessage={handleSendMessage}
                  isSending={isSending}
                />

                {selectedCall.type === "audio" && (
                  <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4">
                    {audioPendingOffer && audioState !== "connected" ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-slate-300">
                          Visitante iniciando chamada de voz.
                        </p>
                        <Button onClick={() => void handleAcceptAudioCall()}>
                          Atender chamada de voz
                        </Button>
                      </div>
                    ) : null}
                    {audioState !== "idle" && (
                      <AudioCall
                        call={selectedCall}
                        state={audioState}
                        remoteStream={audioRemoteStream}
                        onHangup={() => {
                          void hangupAudioCall();
                          void handleUpdateStatus("answered");
                        }}
                      />
                    )}
                  </div>
                )}

                {selectedCall.type === "video" && (
                  <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4">
                    {videoPendingOffer && videoState !== "connected" ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-slate-300">
                          Visitante aguardando vídeo chamada.
                        </p>
                        <Button onClick={() => void handleAcceptVideoCall()}>
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
                  className="rounded-md border border-slate-800 bg-slate-900/60 p-4"
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
            ) : (
              <p className="text-sm text-slate-400">
                Selecione uma chamada para visualizar detalhes.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


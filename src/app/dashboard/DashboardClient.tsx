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

  // Find calls with pending audio offers
  const incomingAudioCalls = useMemo(() => {
    return Object.values(callMap).filter(
      (call) => call.status === "pending" && call.type === "audio"
    );
  }, [callMap]);

  // Track if we're currently ringing for a call
  const [ringingCallId, setRingingCallId] = useState<string | null>(null);
  
  // Track which call should show the modal (most recent incoming audio call with pending offer)
  const [incomingCallModalCallId, setIncomingCallModalCallId] = useState<string | null>(null);

  // Extract selected call properties to avoid object reference changes
  const selectedCallIdValue = selectedCall?.id;
  const selectedCallStatus = selectedCall?.status;
  const selectedCallType = selectedCall?.type;

  // Use refs to track previous values and avoid unnecessary updates
  const prevAudioStateForModalRef = useRef(audioState);
  const prevSelectedCallStatusRef = useRef(selectedCallStatus);
  const prevIncomingCallModalCallIdRef = useRef(incomingCallModalCallId);

  // Track previous audioPendingOffer to detect when it changes
  const prevAudioPendingOfferRef = useRef(audioPendingOffer);

  // Play ring tone and show modal when there's an incoming audio call
  useEffect(() => {
    // Check if call is active FIRST (answered AND connected, or ended)
    // This must be checked BEFORE any other logic to prevent modal from reopening
    const callIsActive = (selectedCallStatus === "answered" && audioState === "connected") || selectedCallStatus === "ended";
    
    // CRITICAL: If call is active, always close modal and return early - prevent any reopening
    if (callIsActive) {
      if (incomingCallModalCallId) {
        setIncomingCallModalCallId(null);
        stopRingTone();
        setRingingCallId(null);
      }
      // Update refs before returning
      prevAudioStateForModalRef.current = audioState;
      prevSelectedCallStatusRef.current = selectedCallStatus;
      prevIncomingCallModalCallIdRef.current = null;
      prevAudioPendingOfferRef.current = audioPendingOffer;
      return;
    }
    
    // Skip if nothing changed
    const audioStateChanged = prevAudioStateForModalRef.current !== audioState;
    const statusChanged = prevSelectedCallStatusRef.current !== selectedCallStatus;
    const modalIdChanged = prevIncomingCallModalCallIdRef.current !== incomingCallModalCallId;
    const offerChanged = prevAudioPendingOfferRef.current !== audioPendingOffer;
    
    // Always run if offer changed (to enable/disable button)
    if (!audioStateChanged && !statusChanged && !modalIdChanged && !offerChanged && 
        audioPendingOffer === null && selectedCallStatus !== "pending") {
      return;
    }

    // Update refs
    prevAudioStateForModalRef.current = audioState;
    prevSelectedCallStatusRef.current = selectedCallStatus;
    prevIncomingCallModalCallIdRef.current = incomingCallModalCallId;
    prevAudioPendingOfferRef.current = audioPendingOffer;

    // CRITICAL: Don't show/hide modal if call is already connected (overlay will handle it)
    // Also don't show if call is ended
    if (audioState === "connected" || selectedCallStatus === "ended") {
      // If connected or ended, close modal immediately (only if it's for this call)
      if (incomingCallModalCallId === selectedCallIdValue) {
        setIncomingCallModalCallId(null);
        stopRingTone();
        setRingingCallId(null);
      }
      return;
    }
    
    // If status is "answered" but not yet connected, keep modal open but stop ring tone
    if (selectedCallStatus === "answered" && audioState !== "connected") {
      // Stop ring tone but keep modal open until connection is established
      if (ringingCallId === selectedCallIdValue) {
        stopRingTone();
        setRingingCallId(null);
      }
      // Don't set incomingCallModalCallId here - keep it as is if already set
      return;
    }
    
    // Show modal ONLY if:
    // 1. Selected call is an audio call with pending status
    // 2. AND call is not active (not answered+connected, not ended)
    const selectedCallIsPendingAudio = selectedCallStatus === "pending" && selectedCallType === "audio";
    const hasPendingOffer = audioPendingOffer !== null;

    // Show modal when there's a pending audio call
    if (selectedCallIsPendingAudio && selectedCallIdValue) {
      const callToRing = selectedCallIdValue;
      
      // Set ringing call ID and show modal (only if not already set)
      if (callToRing !== ringingCallId) {
        setRingingCallId(callToRing);
        // Only play ring tone when we have an offer (visitor has initiated the call)
        if (hasPendingOffer) {
          playRingTone();
        }
      }
      // Show modal for the incoming call - only set if different
      if (callToRing !== incomingCallModalCallId) {
        setIncomingCallModalCallId(callToRing);
      }
      // If we have an offer but ring tone isn't playing yet, start it
      if (hasPendingOffer && callToRing === incomingCallModalCallId && callToRing !== ringingCallId) {
        setRingingCallId(callToRing);
        playRingTone();
      }
    } 
    // Hide modal if call is not pending
    else if (!selectedCallIsPendingAudio && incomingCallModalCallId) {
      // Only hide if it's for this call or a different call
      if (incomingCallModalCallId === selectedCallIdValue || incomingCallModalCallId !== selectedCallIdValue) {
        // But don't hide if status is "answered" and not yet connected (keep it open)
        if (!(selectedCallStatus === "answered" && audioState !== "connected")) {
          setIncomingCallModalCallId(null);
          stopRingTone();
          setRingingCallId(null);
        }
      }
    }
  }, [audioPendingOffer, selectedCallIdValue, selectedCallStatus, selectedCallType, ringingCallId, incomingCallModalCallId, audioState, playRingTone, stopRingTone]);

  // Stop ring tone and hide modal when call is answered or connected
  useEffect(() => {
    // Check if call is active FIRST
    const callIsActive = (selectedCallStatus === "answered" && audioState === "connected") || selectedCallStatus === "ended";
    
    // CRITICAL: If call is active, always close modal
    if (callIsActive && incomingCallModalCallId) {
      setIncomingCallModalCallId(null);
      stopRingTone();
      setRingingCallId(null);
      return;
    }
    
    // Only run if audioState changed
    if (prevAudioStateForModalRef.current === audioState) return;
    
    if (audioState === "connected") {
      // Only update if there's something to clear
      if (ringingCallId || incomingCallModalCallId === selectedCallIdValue) {
        stopRingTone();
        setRingingCallId(null);
        if (incomingCallModalCallId === selectedCallIdValue) {
          setIncomingCallModalCallId(null);
        }
      }
    } else if (audioState === "idle") {
      // Only clear if not answered/ended and modal is showing for this call
      if (selectedCallStatus !== "answered" && selectedCallStatus !== "ended" && incomingCallModalCallId === selectedCallIdValue) {
        stopRingTone();
        setRingingCallId(null);
        setIncomingCallModalCallId(null);
      }
    }
  }, [audioState, selectedCallIdValue, selectedCallStatus, incomingCallModalCallId, ringingCallId]);

  // Stop ring tone and hide modal when call status changes to answered or missed
  useEffect(() => {
    if (!selectedCallIdValue) return;
    
    // Check if call is active FIRST
    const callIsActive = (selectedCallStatus === "answered" && audioState === "connected") || selectedCallStatus === "ended";
    
    // CRITICAL: If call is active, always close modal
    if (callIsActive && incomingCallModalCallId) {
      setIncomingCallModalCallId(null);
      stopRingTone();
      setRingingCallId(null);
      return;
    }
    
    // Only run if status changed
    if (prevSelectedCallStatusRef.current === selectedCallStatus) return;
    
    const shouldCloseModal = 
      (ringingCallId === selectedCallIdValue || incomingCallModalCallId === selectedCallIdValue);
    
    if (selectedCallStatus === "missed" && shouldCloseModal) {
      // Always close modal for missed calls
      stopRingTone();
      setRingingCallId(null);
      setIncomingCallModalCallId(null);
    } else if (selectedCallStatus === "answered" && shouldCloseModal) {
      // DON'T close modal when status changes to answered - wait for connection
      // Only stop ring tone, but keep modal open until audioState becomes "connected"
      stopRingTone();
      setRingingCallId(null);
      // Keep modal open - it will close when audioState becomes "connected" (via other useEffect)
    } else if (selectedCallStatus === "ended" && shouldCloseModal) {
      // Close modal for ended calls
      stopRingTone();
      setRingingCallId(null);
      setIncomingCallModalCallId(null);
    }
  }, [selectedCallStatus, selectedCallIdValue, ringingCallId, incomingCallModalCallId, stopRingTone, audioState]);

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
      if (!selectedCallId) return;
      try {
        await updateCallStatus(selectedCallId, status);
      } catch (error) {
        console.error(error);
      }
    },
    [selectedCallId]
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
      // Call was ended - update status to "ended"
      handleUpdateStatus("ended").catch((error) => {
        console.error("[SmartBell] Error updating call status to ended", error);
      });
    }
    
    // Update refs for next comparison
    prevAudioStateRef.current = audioState;
    prevVideoStateRef.current = videoState;
  }, [selectedCall, audioState, videoState, handleUpdateStatus]);

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
    if (!selectedCallId) {
      console.error("[SmartBell] No selected call ID");
      return;
    }
    
    // Check if we have a pending offer before accepting
    if (!audioPendingOffer) {
      console.warn("[SmartBell] No pending offer yet, waiting...");
      // Show a message to user that we're waiting for the call to be initiated
      alert("Aguardando o visitante iniciar a chamada...");
      return;
    }
    
    stopRingTone();
    setRingingCallId(null);
    // Don't clear incomingCallModalCallId immediately - let it close when connected
    // This prevents the modal from disappearing before the overlay appears
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[SmartBell] Accepting audio call", selectedCallId);
      }
      // Set a flag to keep modal open during accept process
      await acceptAudioCall();
      await updateCallStatus(selectedCallId, "answered");
      // Modal will close automatically when audioState becomes "connected" (via useEffect)
      // Don't clear incomingCallModalCallId here - let the useEffect handle it
    } catch (error) {
      console.error("[SmartBell] Error accepting call", error);
      // If error, clear modal
      setIncomingCallModalCallId(null);
      alert("Erro ao aceitar a chamada. Tente novamente.");
    }
  }, [acceptAudioCall, selectedCallId, audioPendingOffer, stopRingTone]);

  const handleRejectAudioCall = useCallback(async () => {
    stopRingTone();
    setRingingCallId(null);
    setIncomingCallModalCallId(null);
    // Select the call if not already selected
    const callToReject = incomingCallModalCallId || selectedCallId;
    if (callToReject) {
      try {
        await updateCallStatus(callToReject, "missed");
        // If rejecting a different call, select it first
        if (callToReject !== selectedCallId) {
          setSelectedCallId(callToReject);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }, [incomingCallModalCallId, selectedCallId]);

  const handleAcceptVideoCall = useCallback(async () => {
    if (!selectedCallId) return;
    try {
      await acceptVideoCall();
      await updateCallStatus(selectedCallId, "answered");
    } catch (error) {
      console.error(error);
    }
  }, [acceptVideoCall, selectedCallId]);

  // Get the call for the modal - ensure we select the correct call when accepting
  const incomingCallModalCall = incomingCallModalCallId ? callMap[incomingCallModalCallId] : null;
  
  // When accepting from modal, use the standard accept handler
  // (the call is already selected when modal shows)
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

  // Check if there's an active audio call
  const hasActiveCall = selectedCall?.type === "audio" && audioState === "connected";
  
  // CRITICAL: Ensure modal is closed when call is active
  useEffect(() => {
    if (hasActiveCall && incomingCallModalCallId) {
      setIncomingCallModalCallId(null);
      stopRingTone();
      setRingingCallId(null);
    }
  }, [hasActiveCall, incomingCallModalCallId, stopRingTone]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      {/* Active Call Overlay - Shows on top of everything */}
      {hasActiveCall && selectedCall && (
        <ActiveCallOverlay
          call={selectedCall}
          audioState={audioState}
          remoteStream={audioRemoteStream}
          onHangup={async () => {
            await hangupAudioCall();
            // If call was answered (connected), mark as ended when hanging up
            if (selectedCall?.status === "answered") {
              await handleUpdateStatus("ended");
            }
          }}
        />
      )}

      {/* Incoming Call Modal */}
      {/* Show modal when there's an incoming call ID set AND call is not yet connected */}
      {/* Keep modal open until connection is established to prevent flicker */}
      {process.env.NODE_ENV === "development" && (
        <div style={{ position: "fixed", top: 0, right: 0, background: "red", color: "white", padding: "10px", zIndex: 99999 }}>
          Debug: incomingCallModalCallId={incomingCallModalCallId}, incomingCallModalCall={incomingCallModalCall ? "exists" : "null"}, audioState={audioState}, open={!!incomingCallModalCall && audioState !== "connected"}
        </div>
      )}
      <IncomingCallModal
        call={incomingCallModalCall}
        open={
          !!incomingCallModalCall && 
          !!incomingCallModalCallId &&
          // CRITICAL: Never show if call is active (answered AND connected)
          !(selectedCallStatus === "answered" && audioState === "connected") &&
          // Never show if call is ended
          selectedCallStatus !== "ended" &&
          // Only show modal if status is pending OR (answered but not yet connected)
          (selectedCallStatus === "pending" || (selectedCallStatus === "answered" && audioState !== "connected"))
        }
        onAccept={handleModalAccept}
        onReject={handleRejectAudioCall}
        hasPendingOffer={!!audioPendingOffer}
      />
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
                            call.status === "pending" && call.type === "audio" && ringingCallId === call.id && "border-green-500 bg-green-500/10 animate-pulse",
                            call.status === "pending" && "border-yellow-500/50 bg-yellow-500/5"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center",
                              call.status === "pending" && call.type === "audio" && ringingCallId === call.id
                                ? "bg-green-500/20 animate-pulse"
                                : selectedCallId === call.id && call.type === "audio" && audioState === "connected"
                                ? "bg-green-500/20"
                                : "bg-primary/10"
                            )}>
                              {call.status === "pending" && call.type === "audio" && ringingCallId === call.id ? (
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
                                {call.status === "pending" && call.type === "audio" && ringingCallId === call.id && (
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


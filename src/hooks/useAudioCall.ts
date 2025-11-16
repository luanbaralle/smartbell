"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createPeerConnection } from "@/lib/webrtc";
import {
  SignalingMessage,
  useWebRTCSignaling
} from "@/hooks/useWebRTCSignaling";

type ConnectionState = "idle" | "calling" | "ringing" | "connected";

type BroadcastPayload = {
  type: "candidate" | "offer" | "answer" | "hangup";
  [key: string]: unknown;
};

export function useAudioCall(
  callId: string | null,
  role: "visitor" | "resident"
) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [pendingOffer, setPendingOffer] = useState<RTCSessionDescriptionInit | null>(
    null
  );

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const sendSignalRef = useRef<
    ((message: Omit<SignalingMessage, "from">) => Promise<void>) | null
  >(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  const cleanup = useCallback(() => {
    // Close peer connection
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.getSenders().forEach((sender) => {
          sender.track?.stop();
        });
        peerConnectionRef.current.getReceivers().forEach((receiver) => {
          receiver.track?.stop();
        });
        peerConnectionRef.current.close();
      } catch (error) {
        console.error("[SmartBell] Error closing peer connection", error);
      }
      peerConnectionRef.current = null;
    }
    
    // Stop local stream using ref
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }
    
    // Stop remote stream using ref
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      remoteStreamRef.current = null;
      setRemoteStream(null);
    }
    
    setConnectionState("idle");
    setPendingOffer(null);
    candidateQueueRef.current = [];
  }, []);

  const ensurePeerConnection = useCallback(() => {
    // If connection exists and is still valid, reuse it
    if (peerConnectionRef.current) {
      const state = peerConnectionRef.current.connectionState;
      if (state !== "closed" && state !== "failed") {
        return peerConnectionRef.current;
      }
      // Connection is invalid, clean it up first
      cleanup();
    }

    // Create new connection
    const pc = createPeerConnection({
      onIceCandidate: (candidate) => {
        if (candidate) {
          const payload: BroadcastPayload = {
            type: "candidate",
            candidate: candidate.toJSON()
          };
          sendSignalRef.current?.(payload);
        }
      },
      onTrack: (event) => {
        const stream = event.streams[0];
        if (process.env.NODE_ENV === "development") {
          console.log("[useAudioCall] onTrack event", {
            trackKind: event.track.kind,
            trackId: event.track.id,
            trackEnabled: event.track.enabled,
            trackReadyState: event.track.readyState,
            streamsCount: event.streams.length,
            hasStream: !!stream,
            audioTracks: stream?.getAudioTracks().length || 0
          });
        }
        
        if (stream) {
          // Ensure audio tracks are enabled
          stream.getAudioTracks().forEach(track => {
            track.enabled = true;
            if (process.env.NODE_ENV === "development") {
              console.log("[useAudioCall] Audio track enabled", {
                trackId: track.id,
                enabled: track.enabled,
                readyState: track.readyState,
                muted: track.muted
              });
            }
          });
        }
        
        setRemoteStream(stream);
        setConnectionState("connected");
      }
    });

    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        cleanup();
      } else if (pc.connectionState === "connected") {
        setConnectionState("connected");
      }
    });

    peerConnectionRef.current = pc;
    return pc;
  }, [cleanup]);

  const flushCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    for (const candidate of candidateQueueRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("[SmartBell] add candidate error", error);
      }
    }
    candidateQueueRef.current = [];
  }, []);

  const handleSignal = useCallback(
    async (message: SignalingMessage) => {
      if (message.from === role) return;
      if (!callId) return;

      const pc = ensurePeerConnection();

      if (message.type === "offer") {
        setPendingOffer(message.sdp);
        setConnectionState("ringing");
      } else if (message.type === "answer") {
        // Only set remote description if we're in the correct signaling state
        // (have-local-offer means we created an offer and are waiting for an answer)
        if (pc.signalingState === "have-local-offer") {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            await flushCandidates();
            setConnectionState("connected");
          } catch (error) {
            // If already set or in wrong state, log and continue
            if (process.env.NODE_ENV === "development") {
              console.warn("[SmartBell] setRemoteDescription error (answer)", error, {
                signalingState: pc.signalingState,
                connectionState: pc.connectionState
              });
            }
            // If connection is already stable/connected, just update state
            if (pc.signalingState === "stable" || pc.connectionState === "connected") {
              setConnectionState("connected");
            }
          }
        } else {
          // Already processed or in wrong state
          if (process.env.NODE_ENV === "development") {
            console.warn("[SmartBell] Ignoring answer - wrong signaling state", {
              signalingState: pc.signalingState,
              connectionState: pc.connectionState
            });
          }
          // If already connected, just ensure state is correct
          if (pc.connectionState === "connected") {
            setConnectionState("connected");
          }
        }
      } else if (message.type === "candidate") {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
          } catch (error) {
            console.error("[SmartBell] add candidate error", error);
          }
        } else {
          candidateQueueRef.current.push(message.candidate);
        }
      } else if (message.type === "hangup") {
        cleanup();
      }
    },
    [callId, cleanup, ensurePeerConnection, flushCandidates, role]
  );

  const { sendSignal } = useWebRTCSignaling(callId, role, handleSignal);

  useEffect(() => {
    sendSignalRef.current = sendSignal;
  }, [sendSignal]);

  const startLocalAudio = useCallback(async () => {
    if (localStream) {
      if (process.env.NODE_ENV === "development") {
        console.log("[useAudioCall] Reusing existing local stream");
      }
      return localStream;
    }

    try {
      // Detectar se é mobile/Safari
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      // Verificar APIs disponíveis (moderna e legada para Safari iOS)
      const hasModernAPI = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      const legacyGetUserMedia = (navigator as any).getUserMedia || 
                                 (navigator as any).webkitGetUserMedia || 
                                 (navigator as any).mozGetUserMedia;
      
      if (!hasModernAPI && !legacyGetUserMedia) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[useAudioCall] No getUserMedia API available");
        }
        throw new Error("Seu navegador não suporta acesso ao microfone");
      }
      
      // Para mobile/Safari, usar constraints mais simples
      // Constraints muito específicas podem falhar no Safari iOS
      let audioConstraints: MediaTrackConstraints | boolean = true;
      
      if (!isMobile || !isSafari) {
        // Para desktop, usar constraints mais específicas
        audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        };
      } else {
        // Para mobile/Safari, usar apenas true ou constraints mínimas
        // Safari iOS pode rejeitar constraints muito específicas
        audioConstraints = {
          echoCancellation: true,
          noiseSuppression: true
        };
      }
      
      if (process.env.NODE_ENV === "development") {
        console.log("[useAudioCall] Requesting microphone access", {
          isMobile,
          isSafari,
          hasModernAPI,
          hasLegacyAPI: !!legacyGetUserMedia,
          audioConstraints
        });
      }
      
      // Tentar primeiro com API moderna
      let stream: MediaStream;
      try {
        if (hasModernAPI) {
          // Tentar primeiro com constraints específicas
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraints,
              video: false
            });
          } catch (error) {
            // Se falhar, tentar com constraints mínimas (apenas true)
            if (process.env.NODE_ENV === "development") {
              console.warn("[useAudioCall] Failed with specific constraints, trying minimal", error);
            }
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false
            });
          }
        } else if (legacyGetUserMedia) {
          // Usar API legada (Safari iOS antigo)
          stream = await new Promise<MediaStream>((resolve, reject) => {
            legacyGetUserMedia.call(
              navigator,
              { audio: true, video: false },
              resolve,
              reject
            );
          });
        } else {
          throw new Error("No getUserMedia API available");
        }
      } catch (error: any) {
        if (process.env.NODE_ENV === "development") {
          console.error("[useAudioCall] Error getting user media", error);
        }
        // Se for erro de permissão negada, dar mensagem mais clara
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          throw new Error("Permissão de microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador.");
        }
        throw error;
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[useAudioCall] Microphone access granted", {
          tracks: stream.getAudioTracks().length,
          trackSettings: stream.getAudioTracks().map(t => ({
            id: t.id,
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
            muted: t.muted,
            settings: t.getSettings()
          }))
        });
      }

      // IMPORTANTE: O peer connection deve já existir antes de adicionar tracks
      // Isso é garantido porque startLocalAudio é chamado DEPOIS de ensurePeerConnection
      const pc = ensurePeerConnection();
      
      // Adicionar cada track ao peer connection
      stream.getAudioTracks().forEach((track) => {
        // Enable track before adding
        track.enabled = true;
        pc.addTrack(track, stream);
        
        if (process.env.NODE_ENV === "development") {
          console.log("[useAudioCall] Added audio track to peer connection", {
            trackId: track.id,
            trackKind: track.kind,
            trackEnabled: track.enabled,
            trackReadyState: track.readyState
          });
        }
      });
      
      // Verificar se os tracks foram adicionados
      const senders = pc.getSenders();
      if (process.env.NODE_ENV === "development") {
        console.log("[useAudioCall] Tracks added to peer connection", {
          sendersCount: senders.length,
          senders: senders.map(s => ({
            trackId: s.track?.id,
            trackKind: s.track?.kind,
            trackEnabled: s.track?.enabled
          }))
        });
      }
      
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("[useAudioCall] Error accessing microphone", error);
      throw error;
    }
  }, [ensurePeerConnection, localStream]);

  const initiateCall = useCallback(
    async (overrideCallId?: string) => {
      const targetCallId = overrideCallId ?? callId;
      if (!targetCallId) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[useAudioCall] initiateCall called but no callId", { callId, overrideCallId });
        }
        return;
      }
      
      if (process.env.NODE_ENV === "development") {
        console.log("[useAudioCall] initiateCall starting", { targetCallId, role, currentCallId: callId });
      }
      
      // IMPORTANTE: Se o callId mudou, aguardar um pouco para garantir que o canal está subscrito
      if (targetCallId !== callId) {
        if (process.env.NODE_ENV === "development") {
          console.log("[useAudioCall] callId mismatch, waiting for channel subscription", { targetCallId, currentCallId: callId });
        }
        // Aguardar um pouco para o useWebRTCSignaling se inscrever no novo canal
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setConnectionState("calling");
      
      // CRÍTICO: Criar peer connection ANTES de obter o stream
      // Isso garante que o onTrack está registrado antes de adicionar tracks
      const pc = ensurePeerConnection();
      
      // Obter stream local
      const localStream = await startLocalAudio();
      if (!localStream) {
        throw new Error("Failed to get local audio stream");
      }
      
      // Verificar se os tracks foram adicionados corretamente
      const senders = pc.getSenders();
      if (process.env.NODE_ENV === "development") {
        console.log("[useAudioCall] Peer connection senders after adding tracks", {
          sendersCount: senders.length,
          tracks: senders.map(s => ({
            trackId: s.track?.id,
            trackKind: s.track?.kind,
            trackEnabled: s.track?.enabled,
            trackReadyState: s.track?.readyState
          }))
        });
      }
      
      // Criar offer com configuração para áudio
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await pc.setLocalDescription(offer);
      
      if (process.env.NODE_ENV === "development") {
        console.log("[useAudioCall] Offer created", {
          sdp: offer.sdp?.substring(0, 200),
          hasAudio: offer.sdp?.includes("m=audio"),
          hasVideo: offer.sdp?.includes("m=video")
        });
      }
      
      const payload: BroadcastPayload = { type: "offer", sdp: offer };
      
      if (process.env.NODE_ENV === "development") {
        console.log("[useAudioCall] Sending offer", { targetCallId, role, hasSendSignal: !!sendSignal });
      }
      
      // Verificar se sendSignal está disponível antes de enviar
      if (!sendSignal) {
        console.error("[useAudioCall] sendSignal not available!", { targetCallId, role });
        throw new Error("sendSignal not available");
      }
      
      await sendSignal(payload);
      
      if (process.env.NODE_ENV === "development") {
        console.log("[useAudioCall] Offer sent successfully", { targetCallId, role });
      }
    },
    [callId, ensurePeerConnection, sendSignal, startLocalAudio, role]
  );

  const acceptCall = useCallback(async () => {
    if (!pendingOffer) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[SmartBell] acceptCall called but no pendingOffer", { callId, role });
      }
      throw new Error("No pending offer to accept");
    }
    
    if (process.env.NODE_ENV === "development") {
      console.log("[SmartBell] acceptCall starting", { callId, role, hasPendingOffer: !!pendingOffer });
    }
    
    try {
      // CRÍTICO: Criar peer connection ANTES de obter o stream
      // Isso garante que o onTrack está registrado antes de adicionar tracks
      const pc = ensurePeerConnection();
      
      // Obter stream local
      const localStream = await startLocalAudio();
      if (!localStream) {
        throw new Error("Failed to get local audio stream");
      }
      
      // Verificar se os tracks foram adicionados corretamente
      const senders = pc.getSenders();
      if (process.env.NODE_ENV === "development") {
        console.log("[SmartBell] Peer connection senders after adding tracks", {
          sendersCount: senders.length,
          tracks: senders.map(s => ({
            trackId: s.track?.id,
            trackKind: s.track?.kind,
            trackEnabled: s.track?.enabled,
            trackReadyState: s.track?.readyState
          }))
        });
      }
      
      // Configurar remote description
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
      
      // Criar answer com configuração para áudio
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await pc.setLocalDescription(answer);
      
      if (process.env.NODE_ENV === "development") {
        console.log("[SmartBell] Answer created", {
          sdp: answer.sdp?.substring(0, 200),
          hasAudio: answer.sdp?.includes("m=audio"),
          hasVideo: answer.sdp?.includes("m=video")
        });
      }
      
      const payload: BroadcastPayload = { type: "answer", sdp: answer };
      await sendSignal(payload);
      await flushCandidates();
      
      // Set connection state first, then clear pending offer
      // This ensures UI components see "connected" before pendingOffer is cleared
      setConnectionState("connected");
      setPendingOffer(null);
      
      if (process.env.NODE_ENV === "development") {
        console.log("[SmartBell] acceptCall completed successfully");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[SmartBell] acceptCall error", error);
      }
      throw error;
    }
  }, [ensurePeerConnection, flushCandidates, pendingOffer, sendSignal, startLocalAudio, callId, role]);

  const hangup = useCallback(async () => {
    const payload: BroadcastPayload = { type: "hangup" };
    await sendSignal(payload);
    cleanup();
  }, [cleanup, sendSignal]);

  // Cleanup when callId changes or component unmounts
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [callId]); // Remove cleanup from deps to avoid recreating effect

  // Also cleanup when component unmounts
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    connectionState,
    localStream,
    remoteStream,
    pendingOffer,
    startLocalAudio,
    initiateCall,
    acceptCall,
    hangup
  };
}


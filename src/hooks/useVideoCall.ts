"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

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

export function useVideoCall(
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
    ((message: BroadcastPayload) => Promise<void>) | null
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
        setRemoteStream(event.streams[0]);
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

  const startLocalMedia = useCallback(async () => {
    if (!navigator.mediaDevices) return null;
    if (localStream) return localStream;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });

    const pc = ensurePeerConnection();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    setLocalStream(stream);
    return stream;
  }, [ensurePeerConnection, localStream]);

  const initiateCall = useCallback(
    async (overrideCallId?: string) => {
      const targetCallId = overrideCallId ?? callId;
      if (!targetCallId) return;
      setConnectionState("calling");
      await startLocalMedia();
      const pc = ensurePeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const payload: BroadcastPayload = { type: "offer", sdp: offer };
      await sendSignal(payload);
    },
    [callId, ensurePeerConnection, sendSignal, startLocalMedia]
  );

  const acceptCall = useCallback(async () => {
    if (!pendingOffer) return;
    await startLocalMedia();
    const pc = ensurePeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const payload: BroadcastPayload = { type: "answer", sdp: answer };
    await sendSignal(payload);
    await flushCandidates();
    setPendingOffer(null);
    setConnectionState("connected");
  }, [ensurePeerConnection, flushCandidates, pendingOffer, sendSignal, startLocalMedia]);

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
    startLocalMedia,
    initiateCall,
    acceptCall,
    hangup
  };
}


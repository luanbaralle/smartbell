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

export function useVideoCall(callId: string | null, role: "visitor" | "resident") {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [pendingOffer, setPendingOffer] = useState<RTCSessionDescriptionInit | null>(
    null
  );

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const sendSignalRef = useRef<(message: Omit<SignalingMessage, "from">) => Promise<void>>();

  const cleanup = useCallback(() => {
    peerConnectionRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStream?.getTracks().forEach((track) => track.stop());
    remoteStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("idle");
    setPendingOffer(null);
    candidateQueueRef.current = [];
  }, [localStream, remoteStream]);

  const ensurePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = createPeerConnection({
      onIceCandidate: (candidate) => {
        if (candidate) {
          sendSignalRef.current?.({
            type: "candidate",
            candidate: candidate.toJSON()
          });
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
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        await flushCandidates();
        setConnectionState("connected");
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
      await sendSignal({ type: "offer", sdp: offer });
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
    await sendSignal({ type: "answer", sdp: answer });
    await flushCandidates();
    setPendingOffer(null);
    setConnectionState("connected");
  }, [ensurePeerConnection, flushCandidates, pendingOffer, sendSignal, startLocalMedia]);

  const hangup = useCallback(async () => {
    await sendSignal({ type: "hangup" });
    cleanup();
  }, [cleanup, sendSignal]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [callId, cleanup]);

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
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPeerConnection } from "@/lib/webrtc";

export function useVideoCall() {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const peerConnection = useMemo(
    () =>
      createPeerConnection({
        onTrack: (event) => {
          setRemoteStream(event.streams[0]);
        }
      }),
    []
  );

  useEffect(() => {
    return () => {
      peerConnection.close();
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [peerConnection, localStream]);

  const startLocalMedia = async () => {
    if (!navigator.mediaDevices) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    setLocalStream(stream);
    return stream;
  };

  return {
    peerConnection,
    localStream,
    remoteStream,
    startLocalMedia
  };
}


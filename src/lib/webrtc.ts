export type WebRTCSignalingMessage =
  | {
      type: "offer" | "answer";
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "ice";
      candidate: RTCIceCandidateInit;
    };

export type WebRTCSessionConfig = {
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onTrack?: (event: RTCTrackEvent) => void;
};

export const createPeerConnection = (
  config: WebRTCSessionConfig = {}
): RTCPeerConnection => {
  // Build ICE servers list
  const iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ];

  // Add TURN server only if credentials are provided
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL || "turn:turn.smartbell.app:3478";

  if (turnUsername && turnCredential && turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential
    });
  }

  const peer = new RTCPeerConnection({
    iceServers
  });

  if (config.onIceCandidate) {
    peer.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        config.onIceCandidate?.(event.candidate);
      }
    });
  }

  if (config.onTrack) {
    peer.addEventListener("track", config.onTrack);
  }

  return peer;
};


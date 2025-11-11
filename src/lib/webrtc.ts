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
  const peer = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:turn.smartbell.app:3478",
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL
      }
    ]
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


/**
 * Tipos para eventos de sinalização de chamadas
 * Baseado em especificação determinística para evitar bugs
 */

export type CallRole = "caller" | "callee";

export type CallState = "idle" | "ringing" | "in_call" | "ended";

export type SignalingEventType =
  | "call.request"
  | "call.ringing"
  | "call.accept"
  | "call.reject"
  | "call.hangup"
  | "call.ice"
  | "call.sdp"
  | "call.status";

export interface BaseSignalingEvent {
  type: SignalingEventType;
  callId: string; // UUID único por tentativa de chamada
  from: string; // ID do remetente
  to: string; // ID do destinatário
  timestamp: number;
}

export interface CallRequestEvent extends BaseSignalingEvent {
  type: "call.request";
}

export interface CallRingingEvent extends BaseSignalingEvent {
  type: "call.ringing";
}

export interface CallAcceptEvent extends BaseSignalingEvent {
  type: "call.accept";
  sdpOffer?: RTCSessionDescriptionInit; // Opcional - pode iniciar troca WebRTC
}

export interface CallRejectEvent extends BaseSignalingEvent {
  type: "call.reject";
  reason?: "busy" | "user_reject" | "timeout" | "error";
}

export interface CallHangupEvent extends BaseSignalingEvent {
  type: "call.hangup";
  reason?: "user_end" | "timeout" | "error";
}

export interface CallIceEvent extends BaseSignalingEvent {
  type: "call.ice";
  payload: RTCIceCandidateInit;
}

export interface CallSdpEvent extends BaseSignalingEvent {
  type: "call.sdp";
  payload: RTCSessionDescriptionInit;
}

export interface CallStatusEvent extends BaseSignalingEvent {
  type: "call.status";
  state: CallState;
}

export type SignalingEvent =
  | CallRequestEvent
  | CallRingingEvent
  | CallAcceptEvent
  | CallRejectEvent
  | CallHangupEvent
  | CallIceEvent
  | CallSdpEvent
  | CallStatusEvent;

/**
 * Estado local de uma chamada no cliente
 */
export interface LocalCallState {
  callId: string;
  state: CallState;
  from: string;
  to: string;
  role: CallRole;
  createdAt: number;
  timeoutId?: NodeJS.Timeout;
  peerConnection?: RTCPeerConnection;
}


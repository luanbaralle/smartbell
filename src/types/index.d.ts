export type House = {
  id: string;
  name: string;
  qr_code: string;
  owner_id: string;
};

export type UserRole = "morador" | "admin";

export type UserProfile = {
  id: string;
  email: string;
  fcm_token: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
};

export type CallType = "text" | "audio" | "video";

export type CallStatus = "pending" | "answered" | "missed" | "ended";

export type Call = {
  id: string;
  house_id: string;
  created_at: string;
  type: CallType;
  status: CallStatus;
  session_id: string | null;
  visitor_name: string | null;
  ended_at: string | null;
};

export type Message = {
  id: string;
  call_id: string;
  sender: string | null;
  content: string | null;
  audio_url: string | null;
  video_url: string | null;
  created_at: string;
};


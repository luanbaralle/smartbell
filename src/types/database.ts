export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      houses: {
        Row: {
          id: string;
          name: string;
          qr_code: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          qr_code: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          qr_code?: string;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          fcm_token: string | null;
          role: "morador" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          fcm_token?: string | null;
          role?: "morador" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          fcm_token?: string | null;
          role?: "morador" | "admin";
          created_at?: string;
          updated_at?: string;
        };
      };
      calls: {
        Row: {
          id: string;
          house_id: string;
          created_at: string;
          type: "text" | "audio" | "video";
          status: "pending" | "answered" | "missed";
          session_id: string | null;
          visitor_name: string | null;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          house_id: string;
          created_at?: string;
          type: "text" | "audio" | "video";
          status?: "pending" | "answered" | "missed";
          session_id?: string | null;
          visitor_name?: string | null;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          house_id?: string;
          created_at?: string;
          type?: "text" | "audio" | "video";
          status?: "pending" | "answered" | "missed";
          session_id?: string | null;
          visitor_name?: string | null;
          ended_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          call_id: string;
          sender: string;
          content: string | null;
          audio_url: string | null;
          video_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          sender: string;
          content?: string | null;
          audio_url?: string | null;
          video_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          sender?: string;
          content?: string | null;
          audio_url?: string | null;
          video_url?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "morador" | "admin";
      call_type: "text" | "audio" | "video";
      call_status: "pending" | "answered" | "missed";
    };
  };
}


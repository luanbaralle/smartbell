"use client";

import { useEffect, useRef } from "react";
import { PhoneOff, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Call } from "@/types";

type VideoCallProps = {
  call: Call;
  state: "idle" | "calling" | "ringing" | "connected";
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  onHangup: () => void;
};

export function VideoCall({
  call,
  state,
  localStream,
  remoteStream,
  onHangup
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <video
          ref={remoteVideoRef}
          className="aspect-video w-full rounded-lg border border-slate-800 bg-black"
          autoPlay
          playsInline
        />
        <video
          ref={localVideoRef}
          className="aspect-video w-full rounded-lg border border-slate-800 bg-black"
          autoPlay
          playsInline
          muted
        />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Video className="h-8 w-8" />
        </div>
        <p className="text-lg font-semibold">
          Vídeo chamada (
          {state === "calling"
            ? "chamando"
            : state === "ringing"
              ? "aguardando"
              : state === "connected"
                ? "ativa"
                : "encerrada"}
          )
        </p>
        <Button variant="outline" onClick={onHangup}>
          <PhoneOff className="mr-2 h-4 w-4" />
          Encerrar
        </Button>
      </div>
    </div>
  );
}


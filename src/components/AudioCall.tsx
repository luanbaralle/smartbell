"use client";

import { useEffect } from "react";
import { Phone, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Call } from "@/types";

type AudioCallProps = {
  call: Call;
  state: "idle" | "calling" | "ringing" | "connected";
  onHangup: () => void;
  remoteStream?: MediaStream | null;
};

export function AudioCall({ call, state, onHangup, remoteStream }: AudioCallProps) {
  useEffect(() => {
    if (!remoteStream) return;
    const audioElement = document.getElementById(
      "smartbell-remote-audio"
    ) as HTMLAudioElement | null;
    if (!audioElement) return;
    audioElement.srcObject = remoteStream;
  }, [remoteStream]);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-primary">
        <Phone className="h-10 w-10" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">Chamada de voz</p>
        <p className="text-sm text-slate-400">
          {state === "calling" && "Chamando morador..."}
          {state === "ringing" && "Aguardando resposta do morador..."}
          {state === "connected" && "Conexão estabelecida."}
          {state === "idle" && "Sessão finalizada."}
        </p>
      </div>
      <audio id="smartbell-remote-audio" autoPlay />
      <Button variant="outline" onClick={onHangup}>
        <PhoneOff className="mr-2 h-4 w-4" />
        Encerrar
      </Button>
    </div>
  );
}


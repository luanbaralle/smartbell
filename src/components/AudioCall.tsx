"use client";

import { useEffect } from "react";
import { Phone, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  const isConnected = state === "connected";

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className={cn(
        "relative flex h-20 w-20 items-center justify-center rounded-full transition-colors",
        isConnected 
          ? "bg-green-500/20 text-green-600 dark:text-green-400" 
          : "bg-primary/20 text-primary"
      )}>
        {isConnected && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-pulse border-2 border-background"></span>
        )}
        <Phone className="h-10 w-10" />
      </div>
      <div className="text-center">
        <p className={cn(
          "text-lg font-semibold flex items-center justify-center gap-2",
          isConnected && "text-green-700 dark:text-green-400"
        )}>
          {isConnected && (
            <span className="inline-block h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
          )}
          Chamada de voz
        </p>
        <p className={cn(
          "text-sm mt-1",
          isConnected ? "text-green-600 dark:text-green-400" : "text-slate-400"
        )}>
          {state === "calling" && "Chamando morador..."}
          {state === "ringing" && "Aguardando resposta do morador..."}
          {state === "connected" && "Conexão estabelecida - Chamada ativa"}
          {state === "idle" && "Sessão finalizada."}
        </p>
      </div>
      <audio id="smartbell-remote-audio" autoPlay />
      <Button 
        variant={isConnected ? "destructive" : "outline"} 
        onClick={onHangup}
        className={isConnected ? "bg-red-500 hover:bg-red-600 text-white" : ""}
      >
        <PhoneOff className="mr-2 h-4 w-4" />
        Encerrar
      </Button>
    </div>
  );
}


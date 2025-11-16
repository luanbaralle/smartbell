"use client";

import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioCall } from "@/components/AudioCall";
import type { Call } from "@/types";

type ActiveCallOverlayProps = {
  call: Call | null;
  audioState: "idle" | "calling" | "ringing" | "connected";
  remoteStream?: MediaStream | null;
  onHangup: () => void;
  onUpdateStatus?: (status: "answered" | "missed") => void;
};

export function ActiveCallOverlay({
  call,
  audioState,
  remoteStream,
  onHangup,
  onUpdateStatus
}: ActiveCallOverlayProps) {
  if (!call || audioState !== "connected") return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-green-950/95 via-background/95 to-background/95 backdrop-blur-md">
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-8">
          {/* Call Info Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
                <div className="relative h-28 w-28 rounded-full bg-green-500/40 flex items-center justify-center border-4 border-green-500/50">
                  <Phone className="h-14 w-14 text-green-400" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-green-400 flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 bg-green-500 rounded-full animate-pulse"></span>
                Chamada em Andamento
              </h2>
              <p className="text-base text-muted-foreground">
                Conectado com <span className="font-semibold text-foreground">{(call as any).house?.name || "Interfone"}</span>
              </p>
            </div>
          </div>

          {/* Audio Call Component */}
          <div className="rounded-xl border-2 border-green-500/30 bg-card/80 backdrop-blur-sm p-8 shadow-2xl">
            <AudioCall
              call={call}
              state={audioState}
              remoteStream={remoteStream}
              onHangup={onHangup}
            />
          </div>

          {/* End Call Button */}
          <div className="pt-2">
            <Button
              variant="destructive"
              size="lg"
              onClick={onHangup}
              className="w-full bg-red-500 hover:bg-red-600 text-white h-16 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <PhoneOff className="mr-2 h-6 w-6" />
              Encerrar Chamada
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


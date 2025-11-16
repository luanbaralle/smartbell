"use client";

import { PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type CallEndedOverlayProps = {
  endedBy: "self" | "other";
  otherPartyLabel: string; // "morador" ou "visitante"
  onClose: () => void;
};

export function CallEndedOverlay({
  endedBy,
  otherPartyLabel,
  onClose
}: CallEndedOverlayProps) {
  const message = endedBy === "self" 
    ? "Você encerrou a chamada."
    : `O ${otherPartyLabel} encerrou a chamada.`;

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-red-950/95 via-slate-950/95 to-slate-950/95 backdrop-blur-md">
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
              <div className="relative h-28 w-28 rounded-full bg-red-500/40 flex items-center justify-center border-4 border-red-500/50">
                <PhoneOff className="h-14 w-14 text-red-400" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-red-400">
              Chamada Encerrada
            </h2>
            <p className="text-base text-slate-400">
              {message}
            </p>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={onClose}
            className="w-full h-14 text-lg"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}


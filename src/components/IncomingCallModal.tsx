"use client";

import { Phone, PhoneOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Call, House } from "@/types";

type IncomingCallModalProps = {
  call: (Call & { house?: House }) | null;
  open: boolean;
  onAccept: () => void;
  onReject: () => void;
  hasPendingOffer?: boolean;
};

export function IncomingCallModal({
  call,
  open,
  onAccept,
  onReject,
  hasPendingOffer = false
}: IncomingCallModalProps) {
  if (!call) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Prevent closing by clicking outside - user must accept or reject
      if (!isOpen) {
        onReject();
      }
    }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => {
        // Prevent closing by clicking outside
        e.preventDefault();
      }}>
        <DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {/* Animated phone icon */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
              <div className="relative h-20 w-20 rounded-full bg-green-500/30 flex items-center justify-center">
                <Phone className="h-10 w-10 text-green-600 dark:text-green-400 animate-pulse" />
              </div>
            </div>
            
            <DialogTitle className="text-2xl text-center">
              Chamada de Voz Recebida
            </DialogTitle>
            <div className="text-center text-base space-y-1">
              <div className="font-semibold text-foreground">
                {call.house?.name || "Interfone"}
              </div>
              <div className="text-sm text-muted-foreground">
                Visitante está chamando você
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={onReject}
            variant="outline"
            className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            size="lg"
          >
            <PhoneOff className="mr-2 h-5 w-5" />
            Rejeitar
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (hasPendingOffer) {
                onAccept();
              }
            }}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
            type="button"
            disabled={!hasPendingOffer}
          >
            <Phone className="mr-2 h-5 w-5" />
            {hasPendingOffer ? "Atender" : "Aguardando chamada..."}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


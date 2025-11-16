"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [audioPaused, setAudioPaused] = useState(true);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  
  useEffect(() => {
    if (!remoteStream) {
      if (process.env.NODE_ENV === "development") {
        console.log("[AudioCall] No remoteStream available");
      }
      return;
    }
    
    const audioElement = document.getElementById(
      "smartbell-remote-audio"
    ) as HTMLAudioElement | null;
    if (!audioElement) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[AudioCall] Audio element not found");
      }
      return;
    }
    
    audioElementRef.current = audioElement;
    
    if (process.env.NODE_ENV === "development") {
      console.log("[AudioCall] Setting up remote audio stream", {
        hasStream: !!remoteStream,
        tracks: remoteStream.getAudioTracks().length,
        trackEnabled: remoteStream.getAudioTracks().map(t => t.enabled),
        trackReadyState: remoteStream.getAudioTracks().map(t => t.readyState)
      });
    }
    
    // Set the stream
    audioElement.srcObject = remoteStream;
    
    // For Safari/iOS, we need to set volume and ensure element is ready
    audioElement.volume = 1.0;
    audioElement.muted = false;
    
    // Safari requires explicit play() call and may need user interaction
    const attemptPlay = async () => {
      try {
        // Wait a bit for Safari to process the stream
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const playPromise = audioElement.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          if (process.env.NODE_ENV === "development") {
            console.log("[AudioCall] Audio playback started successfully");
          }
        }
      } catch (error) {
        // Autoplay was prevented - this is common on Safari/iOS
        if (process.env.NODE_ENV === "development") {
          console.warn("[AudioCall] Autoplay prevented, will try on user interaction", error);
        }
        
        // Safari/iOS requires user interaction to play audio
        // Create a button overlay to allow user to start audio
        const tryPlayOnInteraction = async () => {
          try {
            await audioElement.play();
            if (process.env.NODE_ENV === "development") {
              console.log("[AudioCall] Audio started after user interaction");
            }
          } catch (err) {
            console.error("[AudioCall] Failed to play audio after interaction", err);
          }
          document.removeEventListener("click", tryPlayOnInteraction);
          document.removeEventListener("touchstart", tryPlayOnInteraction);
        };
        
        // Listen for any user interaction
        document.addEventListener("click", tryPlayOnInteraction, { once: true });
        document.addEventListener("touchstart", tryPlayOnInteraction, { once: true });
      }
    };
    
    attemptPlay();
    
    // Monitor audio element state
    const checkAudioState = () => {
      setAudioPaused(audioElement.paused);
    };
    
    audioElement.addEventListener("play", checkAudioState);
    audioElement.addEventListener("pause", checkAudioState);
    
    // Also try to play when the stream gets new tracks (Safari quirk)
    remoteStream.getAudioTracks().forEach(track => {
      track.addEventListener("unmute", () => {
        audioElement.play().catch(() => {
          setNeedsUserInteraction(true);
        });
      });
    });
    
    // Check initial state
    checkAudioState();
    
    return () => {
      audioElement.removeEventListener("play", checkAudioState);
      audioElement.removeEventListener("pause", checkAudioState);
    };
  }, [remoteStream]);
  
  // Handler para ativar áudio manualmente (Safari/iOS)
  const handleActivateAudio = useCallback(async () => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;
    
    try {
      await audioElement.play();
      setNeedsUserInteraction(false);
      setAudioPaused(false);
      if (process.env.NODE_ENV === "development") {
        console.log("[AudioCall] Audio activated manually");
      }
    } catch (error) {
      console.error("[AudioCall] Failed to activate audio", error);
    }
  }, []);

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
        {isConnected && (
          <p className="text-xs text-muted-foreground mt-1">
            {remoteStream ? "Áudio recebido ✓" : "Aguardando áudio..."}
          </p>
        )}
      </div>
      <audio 
        id="smartbell-remote-audio" 
        autoPlay 
        playsInline 
        controls={false}
        muted={false}
        volume={1.0}
        style={{ display: "none" }}
      />
      {/* Safari/iOS may need a visible play button if autoplay fails */}
      {isConnected && remoteStream && (audioPaused || needsUserInteraction) && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-yellow-500 text-center">
            Áudio disponível mas não está reproduzindo
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleActivateAudio}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Phone className="mr-2 h-4 w-4" />
            Ativar Áudio
          </Button>
        </div>
      )}
      <Button 
        variant={isConnected ? "destructive" : "outline"} 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (process.env.NODE_ENV === "development") {
            console.log(`[AudioCall] Button clicked, calling onHangup`);
          }
          onHangup();
        }}
        className={isConnected ? "bg-red-500 hover:bg-red-600 text-white" : ""}
      >
        <PhoneOff className="mr-2 h-4 w-4" />
        Encerrar
      </Button>
    </div>
  );
}


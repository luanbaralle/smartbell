"use client";

import { useRef, useCallback } from "react";

/**
 * Hook para gerenciar sons de chamada (tom de chamada e interfone tocando)
 */
export function useCallSounds() {
  const dialToneRef = useRef<HTMLAudioElement | null>(null);
  const ringToneRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dialToneOscillatorRef = useRef<OscillatorNode | null>(null);
  const ringToneOscillatorRef = useRef<OscillatorNode | null>(null);

  // Definir stopDialTone primeiro para poder ser usado por playDialTone
  const stopDialTone = useCallback(() => {
    if (dialToneOscillatorRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.log("[SmartBell] Stopping dial tone", {
          intervalId: dialToneOscillatorRef.current,
          type: typeof dialToneOscillatorRef.current,
          stack: new Error().stack
        });
      }
      try {
        // dialToneOscillatorRef agora armazena o interval ID, não o oscillator
        const intervalId = dialToneOscillatorRef.current as any;
        if (intervalId && typeof intervalId === "number") {
          clearInterval(intervalId);
        }
        dialToneOscillatorRef.current = null;
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[SmartBell] Error stopping dial tone", error);
        }
      }
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log("[SmartBell] stopDialTone called but no interval running", {
          stack: new Error().stack
        });
      }
    }
  }, []);

  // Criar tom de chamada (dial tone) - som repetitivo como telefone tocando (tuuu, tuuu, tuuu...)
  const playDialTone = useCallback(() => {
    try {
      // IMPORTANTE: Parar qualquer som anterior ANTES de começar novo
      // Mas fazer isso de forma síncrona para garantir que o novo intervalo seja criado
      if (dialToneOscillatorRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log("[SmartBell] Stopping previous dial tone before starting new one");
        }
        const oldInterval = dialToneOscillatorRef.current as any;
        if (oldInterval && typeof oldInterval === "number") {
          clearInterval(oldInterval);
        }
        dialToneOscillatorRef.current = null;
      }

      // Verificar se AudioContext está disponível
      if (typeof window === "undefined" || (!window.AudioContext && !(window as any).webkitAudioContext)) {
        return;
      }

      // Criar AudioContext se não existir
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (err) {
          // Silenciosamente falhar - áudio não é crítico
          return;
        }
      }

      const ctx = audioContextRef.current;
      
      if (!ctx) {
        return;
      }
      
      // Criar função para tocar o som de chamada (tuuu) - estilo interfone
      // Interfone real usa um tom único e característico
      const playTone = () => {
        try {
          // Verificar se contexto está suspenso e tentar resumir
          if (ctx.state === "suspended") {
            ctx.resume().catch(() => {
              // Ignore errors
            });
            return; // Não tocar se contexto está suspenso
          }
          
          if (ctx.state === "closed") {
            return;
          }
          
          const now = ctx.currentTime;
          
          // Interfone usa um tom único, grave e característico
          // Frequência típica de interfone residencial: ~600Hz (tom médio-grave)
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          // Tom único de interfone: 600Hz (tom médio-grave, característico)
          oscillator.frequency.value = 600;
          oscillator.type = "sine";

          // Envelope de volume (fade in/out suave para criar o "tuuu")
          // Duração: 0.6s de som com fade out suave
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.25, now + 0.1); // Fade in suave
          gainNode.gain.linearRampToValueAtTime(0.25, now + 0.5); // Mantém volume
          gainNode.gain.linearRampToValueAtTime(0, now + 0.6); // Fade out suave

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.start(now);
          oscillator.stop(now + 0.6);
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.error("[SmartBell] Error playing dial tone", err);
          }
        }
      };

      // Resumir contexto se estiver suspenso
      const startDialTone = () => {
        // Garantir que não há intervalo anterior rodando
        if (dialToneOscillatorRef.current) {
          if (process.env.NODE_ENV === "development") {
            console.log("[SmartBell] Clearing previous interval before starting new one");
          }
          clearInterval(dialToneOscillatorRef.current as any);
          dialToneOscillatorRef.current = null;
        }
        
        // Tocar imediatamente
        if (process.env.NODE_ENV === "development") {
          console.log("[SmartBell] Playing first dial tone");
        }
        playTone();

        // Repetir a cada 2 segundos (0.6s de som + 1.4s de silêncio)
        // Isso cria o padrão: tuuu... (pausa) ...tuuu... (pausa) ...tuuu...
        // Similar a um interfone residencial
        const intervalId = setInterval(() => {
          if (process.env.NODE_ENV === "development") {
            console.log("[SmartBell] Dial tone repeating...", {
              intervalId: intervalId,
              refValue: dialToneOscillatorRef.current,
              hasRef: !!dialToneOscillatorRef.current
            });
          }
          // Verificar se ainda temos o intervalo antes de tocar
          if (dialToneOscillatorRef.current === intervalId) {
            playTone();
          } else {
            if (process.env.NODE_ENV === "development") {
              console.warn("[SmartBell] Interval ID mismatch, stopping repetition");
            }
            clearInterval(intervalId);
          }
        }, 2000);

        // Armazenar interval ID para poder parar depois
        dialToneOscillatorRef.current = intervalId as any;
        
        if (process.env.NODE_ENV === "development") {
          console.log("[SmartBell] Dial tone started (repetitive pattern)", {
            intervalId: intervalId,
            refValue: dialToneOscillatorRef.current,
            type: typeof dialToneOscillatorRef.current
          });
        }
      };

      try {
        if (ctx.state === "suspended") {
          if (process.env.NODE_ENV === "development") {
            console.log("[SmartBell] AudioContext suspended, resuming...");
          }
          ctx.resume().then(() => {
            if (process.env.NODE_ENV === "development") {
              console.log("[SmartBell] AudioContext resumed, starting dial tone");
            }
            // Aguardar um pouco para garantir que o contexto está pronto
            setTimeout(() => {
              startDialTone();
            }, 100);
          }).catch((err) => {
            if (process.env.NODE_ENV === "development") {
              console.error("[SmartBell] Error resuming AudioContext", err);
            }
          });
        } else {
          startDialTone();
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[SmartBell] Error in playDialTone", err);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[SmartBell] Error in playDialTone", error);
      }
    }
  }, [stopDialTone]);

  const stopRingTone = useCallback(() => {
    if (ringToneOscillatorRef.current) {
      try {
        clearInterval(ringToneOscillatorRef.current as any);
        ringToneOscillatorRef.current = null;
      } catch (error) {
        // Ignore errors when stopping
      }
    }
  }, []);

  // Criar som de interfone tocando (ring tone) - som repetitivo
  const playRingTone = useCallback(() => {
    try {
      // Parar qualquer som anterior
      stopRingTone();

      // Verificar se AudioContext está disponível
      if (typeof window === "undefined" || (!window.AudioContext && !(window as any).webkitAudioContext)) {
        return;
      }

      // Criar AudioContext se não existir
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (err) {
          // Silenciosamente falhar - áudio não é crítico
          return;
        }
      }

      const ctx = audioContextRef.current;
      
      if (!ctx || ctx.state === "closed") {
        return;
      }
      
      // Criar função para tocar o som de interfone (mais realista)
      const playRing = () => {
        try {
          // Verificar se contexto está suspenso e tentar resumir
          if (ctx.state === "suspended") {
            ctx.resume().catch(() => {
              // Ignore errors
            });
            return; // Não tocar se contexto está suspenso
          }
          
          if (ctx.state === "closed") {
            return;
          }
          
          const now = ctx.currentTime;
          const oscillator1 = ctx.createOscillator();
          const oscillator2 = ctx.createOscillator();
          const gainNode = ctx.createGain();

          // Dois tons simultâneos para simular interfone (frequências típicas de interfone)
          oscillator1.frequency.value = 800; // Tom mais alto
          oscillator2.frequency.value = 1000; // Tom ainda mais alto para criar harmonia
          oscillator1.type = "sine";
          oscillator2.type = "sine";

          // Envelope de volume (fade in/out suave)
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1); // Fade in rápido
          gainNode.gain.linearRampToValueAtTime(0.2, now + 0.4); // Mantém volume
          gainNode.gain.linearRampToValueAtTime(0, now + 0.5); // Fade out suave

          oscillator1.connect(gainNode);
          oscillator2.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator1.start(now);
          oscillator2.start(now);
          oscillator1.stop(now + 0.5);
          oscillator2.stop(now + 0.5);
        } catch (err) {
          // Silenciosamente falhar - áudio não é crítico
        }
      };

      // Tocar imediatamente
      playRing();

      // Repetir a cada 2 segundos (0.5s de som + 1.5s de silêncio)
      const intervalId = setInterval(() => {
        playRing();
      }, 2000);

      // Armazenar interval ID para poder parar depois
      (ringToneOscillatorRef.current as any) = intervalId;
    } catch (error) {
      // Silenciosamente falhar - áudio não é crítico
    }
  }, [stopRingTone]);

  // Cleanup quando componente desmonta
  const cleanup = useCallback(() => {
    stopDialTone();
    stopRingTone();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, [stopDialTone, stopRingTone]);

  return {
    playDialTone,
    stopDialTone,
    playRingTone,
    stopRingTone,
    cleanup
  };
}


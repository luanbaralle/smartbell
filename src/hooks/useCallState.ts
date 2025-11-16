/**
 * Hook para gerenciar estado de chamadas de forma determinística
 * Baseado em especificação para evitar bugs e race conditions
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalCallState, CallState, SignalingEvent, CallRole } from "@/types/call-signaling";

const CALL_TIMEOUT_MS = 30000; // 30 segundos

interface UseCallStateOptions {
  userId: string;
  role: CallRole;
  onStateChange?: (callId: string, newState: CallState) => void;
}

export function useCallState({ userId, role, onStateChange }: UseCallStateOptions) {
  // Mapa de chamadas indexado por callId - single source of truth
  const [callsMap, setCallsMap] = useState<Map<string, LocalCallState>>(new Map());
  
  // Lock: apenas uma chamada ativa por vez
  const activeCallIdRef = useRef<string | null>(null);
  
  // Refs para evitar stale closures
  const callsMapRef = useRef(callsMap);
  const onStateChangeRef = useRef(onStateChange);
  
  useEffect(() => {
    callsMapRef.current = callsMap;
  }, [callsMap]);
  
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  /**
   * Verifica se o usuário está ocupado (em outra chamada)
   */
  const isBusy = useCallback((): boolean => {
    if (!activeCallIdRef.current) return false;
    const activeCall = callsMapRef.current.get(activeCallIdRef.current);
    return activeCall?.state === "ringing" || activeCall?.state === "in_call";
  }, []);

  /**
   * Limpa uma chamada completamente
   */
  const cleanupCall = useCallback((callId: string) => {
    setCallsMap((prev) => {
      const newMap = new Map(prev);
      const call = newMap.get(callId);
      
      if (call) {
        // Limpar timeout
        if (call.timeoutId) {
          clearTimeout(call.timeoutId);
        }
        
        // Fechar peer connection
        if (call.peerConnection) {
          call.peerConnection.close();
        }
        
        // Atualizar estado para ended
        newMap.set(callId, {
          ...call,
          state: "ended",
          timeoutId: undefined,
          peerConnection: undefined
        });
        
        // Remover do mapa após pequeno delay (para feedback visual)
        setTimeout(() => {
          setCallsMap((current) => {
            const updated = new Map(current);
            updated.delete(callId);
            return updated;
          });
        }, 2000);
      }
      
      // Limpar activeCallId se era a chamada ativa
      if (activeCallIdRef.current === callId) {
        activeCallIdRef.current = null;
      }
      
      return newMap;
    });
  }, []);

  /**
   * Cria uma nova chamada (caller)
   */
  const createCall = useCallback((callId: string, to: string): LocalCallState | null => {
    // Verificar se já existe chamada com esse callId
    if (callsMapRef.current.has(callId)) {
      console.warn(`[useCallState] Call ${callId} already exists, ignoring`);
      return callsMapRef.current.get(callId) || null;
    }

    const newCall: LocalCallState = {
      callId,
      state: "ringing",
      from: userId,
      to,
      role: "caller",
      createdAt: Date.now()
    };

    setCallsMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(callId, newCall);
      return newMap;
    });

    activeCallIdRef.current = callId;
    return newCall;
  }, [userId]);

  /**
   * Atualiza o estado de uma chamada
   */
  const updateCallState = useCallback((callId: string, newState: CallState) => {
    setCallsMap((prev) => {
      const newMap = new Map(prev);
      const call = newMap.get(callId);
      
      if (!call) {
        console.warn(`[useCallState] Call ${callId} not found, cannot update state`);
        return prev;
      }

      // Idempotência: se já está no estado desejado, ignorar
      if (call.state === newState) {
        return prev;
      }

      // Limpar timeout anterior se existir
      if (call.timeoutId) {
        clearTimeout(call.timeoutId);
      }

      const updatedCall: LocalCallState = {
        ...call,
        state: newState,
        timeoutId: undefined
      };

      newMap.set(callId, updatedCall);
      
      // Notificar mudança de estado
      if (onStateChangeRef.current) {
        onStateChangeRef.current(callId, newState);
      }

      return newMap;
    });
  }, []);

  /**
   * Handler para eventos de sinalização (idempotente)
   * Retorna evento de rejeição se usuário está ocupado, caso contrário retorna undefined
   */
  const handleSignalingEvent = useCallback((event: SignalingEvent): SignalingEvent | undefined => {
    const { type, callId, from, to } = event;
    
    console.log(`[useCallState] Handling ${type} for call ${callId}`, { from, to, role });

    // Ignorar eventos que não são para este usuário
    if (role === "caller" && to !== userId) return;
    if (role === "callee" && from !== userId && to !== userId) return;

    const existingCall = callsMapRef.current.get(callId);

    switch (type) {
      case "call.request": {
        // Se já existe chamada com esse callId, ignorar (idempotência)
        if (existingCall) {
          console.log(`[useCallState] Call ${callId} already exists, ignoring duplicate request`);
          return;
        }

        // Se está ocupado, rejeitar imediatamente
        if (isBusy()) {
          console.log(`[useCallState] User is busy, rejecting call ${callId}`);
          // Retornar evento de rejeição para ser enviado pelo componente
          return { type: "call.reject" as const, callId, from: userId, to: from, reason: "busy" as const, timestamp: Date.now() };
        }

        // Criar nova chamada
        const newCall: LocalCallState = {
          callId,
          state: "ringing",
          from,
          to,
          role: "callee",
          createdAt: Date.now()
        };

        setCallsMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(callId, newCall);
          return newMap;
        });

        activeCallIdRef.current = callId;
        break;
      }

      case "call.accept": {
        if (!existingCall) {
          // Chamada não existe localmente - criar estado mínimo
          const minimalCall: LocalCallState = {
            callId,
            state: "in_call",
            from,
            to,
            role: role === "caller" ? "caller" : "callee",
            createdAt: Date.now()
          };
          setCallsMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(callId, minimalCall);
            return newMap;
          });
          activeCallIdRef.current = callId;
        } else {
          // Idempotência: se já está in_call, ignorar
          if (existingCall.state === "in_call") {
            console.log(`[useCallState] Call ${callId} already in_call, ignoring duplicate accept`);
            return;
          }
          updateCallState(callId, "in_call");
        }
        break;
      }

      case "call.reject": {
        if (existingCall) {
          cleanupCall(callId);
        }
        break;
      }

      case "call.hangup": {
        if (existingCall) {
          cleanupCall(callId);
        }
        break;
      }

      case "call.status": {
        if (event.state === "ended" && existingCall) {
          cleanupCall(callId);
        } else if (existingCall && existingCall.state !== event.state) {
          updateCallState(callId, event.state);
        }
        break;
      }
    }
  }, [userId, role, isBusy, cleanupCall, updateCallState]);

  /**
   * Define timeout para uma chamada
   */
  const setCallTimeout = useCallback((callId: string, timeoutMs: number = CALL_TIMEOUT_MS) => {
    setCallsMap((prev) => {
      const newMap = new Map(prev);
      const call = newMap.get(callId);
      
      if (!call) return prev;

      // Limpar timeout anterior se existir
      if (call.timeoutId) {
        clearTimeout(call.timeoutId);
      }

      const timeoutId = setTimeout(() => {
        console.log(`[useCallState] Call ${callId} timed out`);
        cleanupCall(callId);
        
        // Enviar evento de hangup por timeout
        if (onStateChangeRef.current) {
          onStateChangeRef.current(callId, "ended");
        }
      }, timeoutMs);

      newMap.set(callId, {
        ...call,
        timeoutId
      });

      return newMap;
    });
  }, [cleanupCall]);

  /**
   * Obtém chamada por callId
   */
  const getCall = useCallback((callId: string): LocalCallState | undefined => {
    return callsMap.get(callId);
  }, [callsMap]);

  /**
   * Obtém todas as chamadas ativas (ringing ou in_call)
   */
  const getActiveCalls = useCallback((): LocalCallState[] => {
    return Array.from(callsMap.values()).filter(
      (call) => call.state === "ringing" || call.state === "in_call"
    );
  }, [callsMap]);

  /**
   * Cleanup ao desmontar componente
   */
  useEffect(() => {
    return () => {
      // Limpar todas as chamadas ao desmontar
      callsMapRef.current.forEach((call, callId) => {
        cleanupCall(callId);
      });
    };
  }, [cleanupCall]);

  return {
    callsMap,
    activeCallId: activeCallIdRef.current,
    isBusy,
    createCall,
    updateCallState,
    cleanupCall,
    handleSignalingEvent,
    setCallTimeout,
    getCall,
    getActiveCalls
  };
}


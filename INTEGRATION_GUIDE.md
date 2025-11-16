# Guia de Integração da Nova Arquitetura

## Status Atual

✅ **Estrutura base criada:**
- Tipos e interfaces (`src/types/call-signaling.d.ts`)
- Hook `useCallState` (`src/hooks/useCallState.ts`)
- Utilitários de sinalização (`src/lib/call-signaling.ts`)
- Versão de referência `DashboardClientV2` (`src/app/dashboard/DashboardClientV2.tsx`)

⏳ **Próximos passos:**
1. Integrar gradualmente no `DashboardClient` original
2. Refatorar `CallClient` (visitante)
3. Testar fluxo completo

## Estratégia de Integração Gradual

### Fase 1: Substituir lógica do modal no DashboardClient

A parte mais problemática é a lógica complexa de múltiplos `useEffect` que controlam o modal. Podemos substituir apenas essa parte:

```typescript
// ANTES: Múltiplos useEffects complexos
const [ringingCallId, setRingingCallId] = useState<string | null>(null);
const [incomingCallModalCallId, setIncomingCallModalCallId] = useState<string | null>(null);
// ... 4 useEffects diferentes controlando o modal

// DEPOIS: Usar useCallState
const callState = useCallState({
  userId: profile.id,
  role: "callee"
});

// Modal aparece baseado em estado determinístico
const activeIncomingCall = useMemo(() => {
  const activeCalls = callState.getActiveCalls();
  const ringingCall = activeCalls.find(call => call.state === "ringing");
  return ringingCall ? callMap[ringingCall.callId] : null;
}, [callState, callMap]);
```

### Fase 2: Integrar eventos de sinalização

Quando uma nova chamada pendente chega via Realtime:

```typescript
// No useEffect que recebe novas chamadas via Realtime
if (isNewCall && dashboardCall.status === "pending" && dashboardCall.type === "audio") {
  // Processar como call.request
  handleSignalingEvent({
    type: "call.request",
    callId: dashboardCall.id,
    from: dashboardCall.session_id || "visitor",
    to: profile.id,
    timestamp: Date.now()
  });
}
```

### Fase 3: Refatorar CallClient (visitante)

Similar ao DashboardClient, mas como "caller":
- Usar `useCallState` com `role: "caller"`
- Enviar `call.request` ao iniciar chamada
- Processar `call.accept`, `call.reject`, `call.hangup`

## Como Testar

1. **Teste isolado do DashboardClientV2:**
   - Temporariamente substituir import em `src/app/dashboard/page.tsx`
   - Testar recebimento de chamada
   - Verificar que modal aparece e desaparece corretamente

2. **Teste integrado:**
   - Integrar gradualmente no DashboardClient original
   - Manter funcionalidades existentes (mensagens, vídeo, etc.)
   - Testar fluxo completo visitante → morador

## Pontos de Atenção

1. **Compatibilidade com sistema existente:**
   - Manter integração com `useAudioCall` e `useVideoCall`
   - Não quebrar funcionalidades de mensagens
   - Manter UI existente

2. **Sincronização de estado:**
   - Estado no banco (`call.status`) vs estado local (`callState`)
   - Garantir que mudanças no banco sejam refletidas no estado local

3. **Cleanup:**
   - Limpar canais de sinalização ao desmontar
   - Limpar timeouts
   - Fechar peer connections

## Checklist de Integração

- [ ] Substituir lógica do modal no DashboardClient
- [ ] Integrar eventos de sinalização
- [ ] Testar recebimento de chamada
- [ ] Testar aceitar chamada
- [ ] Testar rejeitar chamada
- [ ] Testar encerrar chamada
- [ ] Refatorar CallClient (visitante)
- [ ] Testar fluxo completo end-to-end
- [ ] Remover código antigo/comentado
- [ ] Atualizar documentação


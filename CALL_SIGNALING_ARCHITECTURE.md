# Arquitetura de Sinalização de Chamadas - Implementação Determinística

## Visão Geral

Esta implementação segue uma especificação determinística para evitar bugs comuns como modais duplicados, race conditions e estados inconsistentes.

## Princípios Fundamentais

1. **callId como identificador único**: Cada tentativa de chamada tem um UUID único
2. **Estado determinístico**: UI baseada em `callsMap[callId].state`, não em eventos
3. **Idempotência**: Handlers ignoram eventos duplicados
4. **Single source of truth**: Estado da UI vem de `callsMap`, não de múltiplas variáveis booleanas
5. **Cleanup completo**: Ao encerrar chamada, limpar tudo (peerConnection, timers, listeners)

## Estrutura de Arquivos

```
src/
├── types/
│   └── call-signaling.d.ts          # Tipos para eventos de sinalização
├── hooks/
│   └── useCallState.ts               # Hook para gerenciar estado de chamadas
├── lib/
│   └── call-signaling.ts             # Utilitários para enviar/receber eventos
└── app/
    ├── bell/[houseId]/
    │   └── CallClient.tsx            # Cliente do visitante (caller)
    └── dashboard/
        └── DashboardClient.tsx       # Cliente do morador (callee)
```

## Fluxo de Eventos

### 1. Visitante inicia chamada (caller)

```typescript
// 1. Gerar callId único
const callId = crypto.randomUUID();

// 2. Criar chamada local
const call = createCall(callId, residentId);

// 3. Enviar call.request
sendSignalingEvent(channel, createSignalingEvent.request(callId, visitorId, residentId));

// 4. Mostrar modal "Chamando..." com timeout de 30s
setCallTimeout(callId, 30000);
showCallingModal(callId);
```

### 2. Morador recebe chamada (callee)

```typescript
// 1. Handler recebe call.request
handleSignalingEvent({
  type: "call.request",
  callId,
  from: visitorId,
  to: residentId
});

// 2. Verificar se está ocupado
if (isBusy()) {
  sendSignalingEvent(channel, createSignalingEvent.reject(callId, residentId, visitorId, "busy"));
  return;
}

// 3. Criar chamada local com state="ringing"
const call = createCall(callId, visitorId); // role="callee"

// 4. Mostrar modal de chamada recebida (idempotente - não criar se já existe)
if (!hasModalForCall(callId)) {
  showIncomingCallModal(callId);
  playRingTone();
}
```

### 3. Morador aceita chamada

```typescript
// 1. Enviar call.accept
sendSignalingEvent(channel, createSignalingEvent.accept(callId, residentId, visitorId));

// 2. Atualizar estado local para "in_call"
updateCallState(callId, "in_call");

// 3. Mudar conteúdo do modal (não fechar e reabrir)
updateModalContent(callId, "in_call");

// 4. Iniciar WebRTC handshake
startWebRTCHandshake(callId);
```

### 4. Encerrar chamada

```typescript
// 1. Enviar call.hangup
sendSignalingEvent(channel, createSignalingEvent.hangup(callId, userId, otherUserId, "user_end"));

// 2. Cleanup completo
cleanupCall(callId); // Fecha peerConnection, limpa timers, remove listeners

// 3. Mostrar feedback "Chamada encerrada"
showEndCallFeedback(callId);
```

## Regras Críticas

### Evitar Modais Duplicados

- **Nunca criar modal sem verificar se já existe**: `if (!hasModalForCall(callId)) { showModal() }`
- **Usar callId como chave**: Cada modal deve ter uma chave única baseada em callId
- **Não destruir componente do modal**: Controlar visibilidade por state, não por mount/unmount

### Evitar Race Conditions

- **Idempotência nos handlers**: Verificar estado atual antes de atualizar
- **Lock de chamada**: `activeCallIdRef` garante apenas uma chamada ativa
- **Verificar callId em todos os eventos**: Ignorar eventos com callId desconhecido ou já terminado

### Timeout

- **30 segundos por padrão**: Se call.request não for aceito em 30s, considerar "sem resposta"
- **Limpar timeout ao aceitar/rejeitar**: Evitar timeouts executando após chamada já ter sido respondida

### Cleanup

- **Ao desmontar componente**: Limpar todas as chamadas ativas
- **Ao encerrar chamada**: Fechar peerConnection, remover listeners, limpar timers
- **Delay para remover do mapa**: Manter no mapa por 2s após "ended" para feedback visual

## Integração com Sistema Existente

A nova arquitetura será integrada gradualmente:

1. ✅ Tipos e interfaces criados
2. ✅ Hook `useCallState` criado
3. ✅ Utilitários de sinalização criados
4. ⏳ Refatorar `CallClient` (visitante)
5. ⏳ Refatorar `DashboardClient` (morador)
6. ⏳ Integrar com hooks existentes (`useAudioCall`, `useVideoCall`)

## Debugging

Todos os eventos incluem logs com callId:

```typescript
console.log(`[useCallState] Handling ${type} for call ${callId}`, { from, to, role });
```

Isso facilita rastrear qual evento afetou qual chamada.

## Testes Recomendados

1. **Dois navegadores**: Simular visitante e morador em navegadores diferentes
2. **Rede lenta**: Testar com throttling de rede
3. **Reconexão**: Testar reload da página durante chamada
4. **Múltiplas chamadas**: Testar receber segunda chamada enquanto primeira está ativa
5. **Timeout**: Testar chamada não atendida após 30s


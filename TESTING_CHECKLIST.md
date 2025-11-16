# Checklist de Testes - Arquitetura Determinística

## ✅ Implementação Concluída

- ✅ Tipos e interfaces para eventos de sinalização
- ✅ Hook `useCallState` para gerenciar estado determinístico
- ✅ Utilitários de sinalização via Supabase Realtime
- ✅ DashboardClient refatorado com nova arquitetura
- ✅ CallClient refatorado com nova arquitetura

## 🧪 Testes a Realizar

### 1. Fluxo Normal - Chamada Aceita

**Cenário:** Visitante liga → Morador recebe → Morador aceita → Chamada ativa → Encerrar

**Passos:**
1. Abrir página do visitante (`/bell/[houseId]`)
2. Clicar em "Áudio" para iniciar chamada
3. Verificar que:
   - ✅ Dial tone começa a tocar
   - ✅ Status mostra "Aguardando resposta do morador..."
   - ✅ Chamada é criada no banco com status "pending"
4. No dashboard do morador:
   - ✅ Modal de "Chamada de Voz Recebida" aparece
   - ✅ Ring tone toca
   - ✅ Botão "Atender" fica disponível quando há offer pendente
5. Morador clica "Atender":
   - ✅ Modal fecha imediatamente
   - ✅ Overlay de "Chamada em Andamento" aparece
   - ✅ Ring tone para
   - ✅ Dial tone para (no visitante)
   - ✅ Status muda para "answered"
6. Durante a chamada:
   - ✅ Áudio funciona (testar falando)
   - ✅ Overlay permanece visível
   - ✅ Status mostra "Chamada conectada"
7. Encerrar chamada (qualquer lado):
   - ✅ Overlay desaparece
   - ✅ Status muda para "ended"
   - ✅ Feedback "Chamada encerrada" aparece

### 2. Fluxo - Chamada Rejeitada

**Cenário:** Visitante liga → Morador rejeita

**Passos:**
1. Visitante inicia chamada
2. Morador clica "Rejeitar"
3. Verificar que:
   - ✅ Modal fecha
   - ✅ Ring tone para
   - ✅ Status muda para "missed"
   - ✅ Visitante vê "Chamada recusada pelo morador"
   - ✅ Dial tone para

### 3. Fluxo - Timeout (30s sem resposta)

**Cenário:** Visitante liga → Morador não responde em 30s

**Passos:**
1. Visitante inicia chamada
2. Aguardar 30 segundos sem morador responder
3. Verificar que:
   - ✅ Dial tone para automaticamente
   - ✅ Status muda para "missed" ou "ended"
   - ✅ Feedback "Sem resposta" aparece

### 4. Fluxo - Múltiplas Chamadas

**Cenário:** Morador recebe segunda chamada enquanto primeira está ativa

**Passos:**
1. Primeira chamada em andamento
2. Visitante 2 inicia chamada
3. Verificar que:
   - ✅ Segunda chamada é rejeitada automaticamente com reason "busy"
   - ✅ Primeira chamada continua normalmente

### 5. Fluxo - Reconexão

**Cenário:** Recarregar página durante chamada

**Passos:**
1. Iniciar chamada
2. Recarregar página do visitante OU morador
3. Verificar que:
   - ✅ Estado é sincronizado corretamente
   - ✅ Não há modais duplicados
   - ✅ Chamada continua funcionando

### 6. Verificações de Bugs Anteriores

**Bug 1: Modal some e reaparece**
- ✅ Verificar que modal não fecha ao aceitar
- ✅ Verificar que modal não reaparece após aceitar
- ✅ Verificar que overlay aparece corretamente

**Bug 2: Dial tone não para**
- ✅ Verificar que dial tone para quando morador aceita
- ✅ Verificar que dial tone para quando morador rejeita
- ✅ Verificar que dial tone para quando chamada encerra

**Bug 3: Estado inconsistente após encerrar**
- ✅ Verificar que visitante vê "Chamada encerrada" quando morador encerra
- ✅ Verificar que não volta para estado "chamando"
- ✅ Verificar que dial tone não reinicia

## 🔍 Debugging

### Logs Úteis

Todos os eventos incluem logs com `callId`:

```javascript
// No console do navegador:
[DashboardClient] Call {callId} state changed to {state}
[CallClient] Received signaling event: {type} for call {callId}
```

### Verificar Estado

No console do navegador, você pode inspecionar:

```javascript
// Ver estado de uma chamada específica
callState.getCall(callId)

// Ver todas as chamadas ativas
callState.getActiveCalls()
```

## 📝 Notas

- A arquitetura usa `callId` como identificador único
- Estado é determinístico baseado em `callState.getCall(callId).state`
- Handlers são idempotentes (ignoram eventos duplicados)
- Timeout de 30s é configurado automaticamente
- Cleanup completo ao encerrar chamadas

## 🐛 Problemas Conhecidos

Nenhum problema conhecido no momento. Se encontrar bugs durante os testes, verificar:

1. Logs no console para rastrear eventos
2. Estado do `callState` usando `getCall(callId)`
3. Se canais de sinalização estão subscritos corretamente
4. Se eventos estão sendo enviados/recebidos corretamente


# Guia de Testes - SmartBell

## ✅ Checklist de Testes

### 1. Testar Service Worker
1. Abra o DevTools (F12)
2. Vá em Application → Service Workers
3. Verifique se o service worker está registrado e ativo
4. Verifique se há erros no console

### 2. Testar Push Notifications

#### Passo 1: Registrar Subscription
1. Faça login no dashboard (`/dashboard`)
2. Clique em "Ativar notificações"
3. Permita as notificações quando solicitado
4. Verifique no console se apareceu: `[SmartBell] Push subscription registered`
5. Verifique no Supabase se a subscription foi salva na tabela `push_subscriptions`

#### Passo 2: Testar Recebimento
1. Em outro navegador/dispositivo, acesse `/bell/[houseId]` (use o QR Code)
2. Inicie uma chamada (texto, áudio ou vídeo)
3. No primeiro navegador, você deve receber uma notificação push
4. Clique na notificação
5. Deve abrir diretamente em `/call/[callId]`

### 3. Testar Rota `/call/[id]`

#### Como Morador:
1. Acesse `/call/[id]` (substitua `[id]` por um ID de chamada real)
2. Verifique se:
   - A página carrega corretamente
   - Mostra informações da chamada
   - Botão "Atender Chamada" aparece se status for "pending"
   - Botões de Chat/Áudio/Vídeo aparecem após atender
   - Botões rápidos de resposta aparecem no chat

#### Como Visitante:
1. Acesse `/bell/[houseId]`
2. Inicie uma chamada
3. Verifique se:
   - Status muda em tempo real
   - Chat funciona
   - Áudio/Vídeo funcionam (se testado)

### 4. Testar Chat em Tempo Real

1. Abra duas abas/janelas:
   - Uma como morador em `/call/[id]`
   - Outra como visitante em `/bell/[houseId]`
2. Envie mensagens de ambos os lados
3. Verifique se aparecem em tempo real em ambos

### 5. Testar WebRTC (Áudio/Vídeo)

1. Como visitante, inicie uma chamada de áudio ou vídeo
2. Como morador, atenda a chamada
3. Clique em "Áudio" ou "Vídeo"
4. Verifique se:
   - A conexão é estabelecida
   - O áudio/vídeo funciona
   - É possível encerrar a chamada

## 🐛 Troubleshooting

### Notificações não chegam
1. Verifique se o service worker está ativo
2. Verifique se a subscription foi salva no banco
3. Verifique os logs do servidor (deve aparecer tentativas de envio)
4. Verifique se as chaves VAPID estão corretas no `.env.local`
5. Teste em HTTPS (push notifications requerem HTTPS em produção)

### Service Worker não registra
1. Limpe o cache do navegador
2. Verifique se `/service-worker.js` está acessível
3. Verifique o console para erros
4. Tente em modo anônimo

### Rota `/call/[id]` não carrega
1. Verifique se está autenticado
2. Verifique se o ID da chamada existe
3. Verifique se você é o dono da casa
4. Verifique os logs do servidor

### Chat não atualiza em tempo real
1. Verifique se o Supabase Realtime está habilitado
2. Verifique se há erros no console
3. Verifique a conexão com o Supabase

## 📊 Verificações no Supabase

### Tabela `push_subscriptions`
```sql
SELECT * FROM push_subscriptions;
```
Deve mostrar suas subscriptions registradas.

### Tabela `calls`
```sql
SELECT * FROM calls ORDER BY created_at DESC LIMIT 10;
```
Deve mostrar as chamadas criadas.

### Tabela `messages`
```sql
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;
```
Deve mostrar as mensagens enviadas.

## 🔍 Logs Úteis

### No Console do Navegador:
- `[SmartBell] Service worker registered` - Service worker OK
- `[SmartBell] Push subscription registered` - Push OK
- `[SmartBell] Call realtime subscribe` - Realtime OK

### No Servidor (Terminal):
- `[SmartBell] push notification error` - Erro ao enviar push
- `[SmartBell] create call error` - Erro ao criar chamada
- `[SmartBell] Web push send error` - Erro no web-push

## ✅ Teste Completo End-to-End

1. **Setup Inicial**
   - Morador faz login
   - Morador ativa notificações
   - Morador gera QR Code

2. **Visitante**
   - Escaneia QR Code
   - Inicia chamada de texto

3. **Morador**
   - Recebe notificação push
   - Clica na notificação
   - Abre em `/call/[id]`
   - Clica em "Atender Chamada"
   - Envia mensagem via chat
   - Usa botão rápido de resposta

4. **Verificação**
   - Visitante vê mensagem em tempo real
   - Status muda para "answered"
   - Chat funciona em ambos os lados

## 🎯 Próximos Testes Recomendados

- [ ] Testar em dispositivos móveis (iOS/Android)
- [ ] Testar em produção (HTTPS obrigatório)
- [ ] Testar com múltiplos dispositivos do mesmo usuário
- [ ] Testar chamadas de áudio/vídeo em diferentes redes
- [ ] Testar comportamento offline
- [ ] Testar expiração de subscriptions


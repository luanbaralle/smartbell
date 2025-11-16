# 🚀 Quick Start - SmartBell

## ✅ Você já completou:
- ✅ Instalou `web-push`
- ✅ Gerou chaves VAPID
- ✅ Adicionou ao `.env.local`
- ✅ Executou migration no Supabase

## 🎯 Próximos Passos para Testar

### 1. Iniciar o Servidor
```bash
npm run dev
```

### 2. Testar Push Notifications

**Como Morador:**
1. Acesse `http://localhost:3000`
2. Faça login com seu email
3. No dashboard, clique em **"Ativar notificações"**
4. Permita as notificações quando solicitado
5. Verifique no console: deve aparecer `[SmartBell] Push subscription registered`

**Como Visitante:**
1. Em outro navegador/dispositivo, acesse `/bell/[houseId]` (use o QR Code do dashboard)
2. Clique em "Iniciar Chamada" (texto, áudio ou vídeo)
3. **No primeiro navegador**, você deve receber uma notificação push
4. Clique na notificação
5. Deve abrir diretamente em `/call/[callId]`

### 3. Testar Interface de Chamada

**Na página `/call/[id]`:**
- ✅ Deve mostrar informações da chamada
- ✅ Botão "Atender Chamada" se status for "pending"
- ✅ Após atender, aparecem botões: Chat, Áudio, Vídeo
- ✅ Botões rápidos de resposta no chat
- ✅ Status atualiza em tempo real

### 4. Testar Chat em Tempo Real

1. Abra duas abas:
   - Morador: `/call/[id]`
   - Visitante: `/bell/[houseId]`
2. Envie mensagens de ambos os lados
3. Devem aparecer em tempo real

## 🔍 Verificações Rápidas

### Service Worker
- Abra DevTools (F12) → Application → Service Workers
- Deve estar registrado e ativo

### Push Subscription no Banco
```sql
SELECT * FROM push_subscriptions;
```
Deve mostrar sua subscription.

### Logs do Servidor
Ao criar uma chamada, deve aparecer:
- `[SmartBell] Push notification sent` (ou erro se houver problema)

## ⚠️ Problemas Comuns

### Notificação não chega
1. Verifique se permitiu notificações no navegador
2. Verifique se a subscription foi salva no banco
3. Verifique se as chaves VAPID estão corretas
4. **Importante**: Push notifications requerem HTTPS em produção (localhost funciona em dev)

### Service Worker não registra
1. Limpe cache do navegador (Ctrl+Shift+Delete)
2. Recarregue a página
3. Verifique console para erros

### Erro ao enviar push
- Verifique logs do servidor
- Verifique se `web-push` está instalado
- Verifique se as chaves VAPID estão corretas

## 📱 Testar em Dispositivo Móvel

1. Acesse `http://seu-ip-local:3000` no celular (mesma rede WiFi)
2. Faça login
3. Ative notificações
4. Teste recebimento de push

## 🎉 Tudo Funcionando?

Se tudo estiver OK:
- ✅ Notificações push funcionam
- ✅ Service worker registrado
- ✅ Chat em tempo real funciona
- ✅ Interface `/call/[id]` completa
- ✅ WebRTC pronto para uso

**Parabéns! O SmartBell está funcionando! 🎊**

Para mais detalhes, veja:
- `TESTING_GUIDE.md` - Guia completo de testes
- `IMPLEMENTATION_SUMMARY.md` - Resumo das implementações


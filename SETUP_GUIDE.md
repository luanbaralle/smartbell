# Guia de Configuração - SmartBell

## 🚀 Instalação Rápida

### 1. Instalar Dependência Necessária

```bash
npm install web-push
```

### 2. Gerar Chaves VAPID

Execute o comando para gerar as chaves VAPID:

```bash
npx web-push generate-vapid-keys
```

Isso gerará duas chaves:
- **Public Key** (use como `NEXT_PUBLIC_FIREBASE_VAPID_KEY`)
- **Private Key** (use como `VAPID_PRIVATE_KEY`)

### 3. Configurar Variáveis de Ambiente

Adicione ao arquivo `.env.local`:

```env
# VAPID Keys (obtidas no passo anterior)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=sua-chave-publica-aqui
VAPID_PRIVATE_KEY=sua-chave-privada-aqui

# Outras variáveis já existentes
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Executar Migrations no Supabase

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Execute o conteúdo de `supabase/migrations/0002_push_subscriptions.sql`

Ou via CLI:
```bash
supabase db push
```

### 5. Testar o Sistema

1. Inicie o servidor: `npm run dev`
2. Faça login no dashboard
3. Ative as notificações push
4. Em outro dispositivo/navegador, escaneie o QR Code
5. Inicie uma chamada
6. Verifique se a notificação chegou no primeiro dispositivo

## 📱 Funcionalidades Disponíveis

### Para Moradores
- ✅ Receber notificações push mesmo com app fechado
- ✅ Clicar na notificação abre diretamente em `/call/[id]`
- ✅ Interface completa com chat, áudio e vídeo
- ✅ Botões rápidos de resposta
- ✅ Status em tempo real

### Para Visitantes
- ✅ Escanear QR Code
- ✅ Iniciar chamada (texto, áudio ou vídeo)
- ✅ Chat em tempo real
- ✅ Ver status da chamada

## 🔧 Troubleshooting

### Notificações não funcionam
1. Verifique se as chaves VAPID estão configuradas
2. Verifique se o service worker está registrado (console do navegador)
3. Verifique se a permissão de notificações foi concedida
4. Verifique se a migration foi executada

### Service Worker não registra
1. Verifique se `/service-worker.js` está acessível
2. Verifique o console do navegador para erros
3. Limpe o cache do navegador e recarregue

### Push subscriptions não salvam
1. Verifique se a tabela `push_subscriptions` existe
2. Verifique se o usuário está autenticado
3. Verifique os logs do servidor

## 📚 Documentação Adicional

- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Resumo completo das implementações
- [README.md](./README.md) - Documentação principal do projeto


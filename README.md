# Smart Bell

Smart Bell é um sistema de interfone digital baseado em PWA que conecta visitantes e moradores através de QR Code, notificações push e comunicação em tempo real com chat, áudio e vídeo.

## ✨ Principais Recursos

- Acesso do visitante via QR Code (`/bell/[houseId]`)
- Chat em tempo real com envio de texto e mensagens de voz gravadas
- Chamadas de áudio e vídeo entre visitante e morador usando WebRTC
- Painel do morador com histórico de chamadas, mensagens e respostas rápidas
- Notificações push (Firebase Cloud Messaging) quando uma nova chamada é iniciada
- Armazenamento de áudios no Supabase Storage e logging completo de chamadas e mensagens

## 🛠️ Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS 4, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Realtime:** Supabase Realtime + WebRTC
- **Push Notifications:** Firebase Cloud Messaging
- **Deployment sugerido:** Vercel

## 📂 Estrutura de Pastas

```
smart-bell/
├── src/
│   ├── app/                     # Rotas (App Router)
│   │   ├── bell/[houseId]/      # Fluxo do visitante
│   │   ├── dashboard/           # Painel do morador
│   │   └── api/                 # API Routes (notify, calls, messages...)
│   ├── components/              # Componentes UI e WebRTC
│   ├── hooks/                   # Hooks (push, audio/video call, signaling)
│   ├── lib/                     # Helpers Supabase, FCM, WebRTC, storage
│   ├── types/                   # Definições de tipos globais
│   └── styles/                  # CSS global
├── supabase/migrations/         # Esquema inicial do banco
├── public/                      # Assets (manifest, ícones, service worker)
├── docs/                        # Documentação complementar
└── README.md
```

## ✅ Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com/) e projeto configurado
- Conta no [Firebase](https://firebase.google.com/) com Cloud Messaging habilitado
- Supabase CLI (opcional) para executar migrações

## 🔧 Configuração

1. **Instalação de dependências**

   ```bash
   npm install
   ```

2. **Variáveis de ambiente**

   Copie o arquivo `.env.example` para `.env.local` e preencha com suas credenciais:

   ```bash
   cp .env.example .env.local
   ```

   Campos importantes:

   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: credenciais do projeto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: chave service role (somente no servidor)
   - `NEXT_PUBLIC_FIREBASE_*`, `FCM_SERVER_KEY`: credenciais do Firebase Cloud Messaging
   - `NEXT_PUBLIC_APP_URL`: origem utilizada nos links de autenticação e push

3. **Migração do banco de dados**

   Utilize as migrações em `supabase/migrations/0001_initial.sql`. É possível executá-las via Supabase CLI ou diretamente pelo painel SQL.

4. **Executar o projeto**

   ```bash
    npm run dev
   ```

   Acesse:

   - `http://localhost:3000/bell/<houseId>` para simular o visitante
   - `http://localhost:3000/dashboard` para o painel do morador

## 🚀 Deploy

- **Frontend:** Deploy recomendado na Vercel (Next.js 15).
- **Backend:** Supabase hospeda banco, Realtime e Storage.
- **Variáveis Ambiente:** Configure as mesmas variáveis do `.env.local` na plataforma de deploy.
- **Service Worker:** Certifique-se de que `/service-worker.js` está acessível sem cache agressivo para receber atualizações.

## 🔒 Autenticação

- O morador acessa via **magic link** (Supabase Auth).
- Os tokens FCM são salvos na tabela `users` (campo `fcm_token`).
- Visitantes acessam sem autenticação; as permissões são controladas no banco com RLS liberando leitura/inserção onde apropriado.

## 🔔 Notificações Push

- `NotificationButton` registra o token usando `usePushNotifications`.
- Os tokens são salvos no Supabase através da server action `saveFcmToken`.
- Ao criar uma chamada (`/api/calls`), o servidor dispara push notificações via `sendPushNotification`.
- O `service-worker.js` trata eventos `push` e `notificationclick`.

## 🗂️ Logs e Histórico

- Tabela `calls` registra cada interação (tipo, status, timestamps, sessão WebRTC).
- Tabela `messages` armazena chat e mensagens de áudio/vídeo, vinculadas às chamadas.
- O dashboard consolida estatísticas básicas (atendidas, perdidas, pendentes) e mostra o histórico por residência.

## 🧪 Próximos Passos (roadmap)

- Suporte a múltiplos moradores por residência
- Gravação opcional das chamadas (áudio/vídeo)
- Métricas detalhadas (tempo de resposta médio, gráficos)
- Aplicativos nativos (FlutterFlow/React Native) reutilizando o backend
- Integrações com dispositivos IoT (Alexa/Google Home)

## 🤝 Contribuindo

Pull requests são bem-vindos! Antes de enviar, execute `npm run lint` e garanta que todas as verificações passam localmente.

---

Smart Bell © 2025 — Comunicações inteligentes para casas conectadas.


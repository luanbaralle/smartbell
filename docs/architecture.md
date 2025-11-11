# Arquitetura Smart Bell

## Visão Geral

Smart Bell é composto por um PWA (Next.js 15) conectado ao Supabase para autenticação, banco de dados, realtime e storage. A comunicação em tempo real utiliza WebRTC com sinalização via Supabase Realtime, enquanto as notificações push são entregues pelo Firebase Cloud Messaging (FCM).

```
Visitante (PWA) ──QR Code──▶ Next.js (Rota /bell/[houseId])
                                │
                                ├─ Supabase Realtime (chat, WebRTC signaling, status)
                                ├─ Supabase Storage (áudio/vídeo gravados)
                                └─ Firebase Cloud Messaging (push para moradores)

Morador (PWA /dashboard) ◀─────┘
```

## Principais Módulos

| Módulo              | Função                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| `src/app/bell`      | Fluxo do visitante: chat, chamada e envio de mídias.                   |
| `src/app/dashboard` | Painel do morador: histórico, notificações e resposta às chamadas.     |
| `src/app/api`       | Rotas REST (calls, messages, audio, video, notify).                    |
| `src/hooks`         | Hooks especializados (push, áudio/vídeo, WebRTC signaling).            |
| `src/lib`           | Integração Supabase, Firebase, Storage, utilitários.                   |
| `supabase`          | Esquema do banco (tabelas, índices, privilégios) + buckets de storage. |

## Fluxo do Visitante

1. Usuário acessa `/bell/[houseId]` via QR Code.
2. Página carrega informações da casa e abre um canal Realtime (`house:{id}`).
3. Ao iniciar uma chamada:
   - Cria um registro em `calls` (`status = pending`).
   - API `/api/calls` dispara push para o morador.
   - `useAudioCall` ou `useVideoCall` inicia oferta WebRTC e envia via canal `webrtc:{callId}`.
4. Mensagens de texto/áudio são persistidas em `messages` e replicadas via Supabase Realtime.
5. Desligar a chamada dispara sinal `hangup` e atualiza status/local UI.

## Fluxo do Morador

1. Painel `/dashboard` autentica via Supabase Auth (magic link).
2. Ao entrar, recupera:
   - Casas do morador (`houses.owner_id`).
   - Chamadas recentes (`calls`).
   - Histórico de mensagens (`messages`).
3. O botão “Ativar notificações” registra o token FCM e salva em `users.fcm_token`.
4. Supabase Realtime mantém card de chamadas e mensagens sincronizados.
5. Ao aceitar uma chamada (áudio/vídeo):
   - `useAudioCall`/`useVideoCall` usa oferta pendente do visitante.
   - Envia resposta WebRTC via canal `webrtc:{callId}`.
   - Atualiza status da chamada para `answered`, marcando `ended_at`.

## WebRTC Signaling

- **Canal:** `webrtc:{callId}`
- **Mensagens:** `{ type: 'offer' | 'answer' | 'candidate' | 'hangup', from: 'visitor' | 'resident', payload }`
- **Hooks:**
  - `useWebRTCSignaling`: abstrai assinatura/broadcast via Supabase Realtime.
  - `useAudioCall` / `useVideoCall`: gerenciam `RTCPeerConnection`, media streams e ciclo de vida.

Fluxo básico:

1. Visitante cria oferta (`createOffer`) e envia pelo canal.
2. Morador recebe oferta (armazenada em `pendingOffer` até aceitar).
3. Ao aceitar, morador cria resposta (`createAnswer`) e transmite.
4. ICE candidates são trocados pelo mesmo canal.
5. `hangup` encerra a conexão dos dois lados e reseta estado.

## Notificações Push

- **Registro:** `NotificationButton` → `usePushNotifications` → token salvo em `users`.
- **Envio:** API `/api/calls` chama `sendPushNotification` com `FCM_SERVER_KEY`.
- **Recepção:** `public/service-worker.js` trata evento `push` e direciona clique para `/dashboard`.

## Estrutura de Dados

### Tabelas

- `users` (id, email, fcm_token, role, timestamps) — espelha `auth.users`.
- `houses` (id, name, qr_code, owner_id, timestamps).
- `calls` (id, house_id, type, status, session_id, visitor_name, created_at, ended_at).
- `messages` (id, call_id, sender, content, audio_url, video_url, created_at).

### Buckets

- `audio-messages`: mensagens de voz gravadas; acesso público.
- `video-messages`: extensível para mensagens de vídeo (atualmente placeholders).

## PWA e Service Worker

- `manifest.json`: define metadados, ícones e comportamento standalone.
- `service-worker.js`: controla eventos `install`, `activate`, `push` e `notificationclick`.
- Registro realizado em `src/app/layout.tsx` através de `ServiceWorkerRegister`.

## Segurança e RLS

- `anon` pode inserir chamadas/mensagens (visitante).
- `authenticated` possui acesso completo aos registros vinculados.
- Real-Time e Storage dependem das regras padrão do Supabase; ajustes finos podem ser aplicados conforme necessidade.

## Métricas & Logging

- Histórico de chamadas renderizado no dashboard (ordem decrescente).
- Estatísticas agregadas (atendidas, perdidas, pendentes) calculadas no client.
- `ended_at` atualizado para chamadas respondidas/perdidas, permitindo análises futuras (tempo de resposta, duração, etc.).

## Próximos Aprimoramentos

- Multi-residência por morador, equipe de suporte.
- Gravação de chamadas WebRTC (armazenamento no Storage).
- Dashboards analíticos com gráficos (Supabase SQL + visualização).
- Integrações com dispositivos IoT (Alexa/Google Home).
- Aplicativos nativos usando a mesma infraestrutura (FlutterFlow / React Native).


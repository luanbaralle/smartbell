# Smart Bell

<div align="center">

**Sistema de interfone digital inteligente baseado em PWA**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

---

Smart Bell é um sistema completo de interfone digital que conecta visitantes e moradores através de QR Code, notificações push e comunicação em tempo real com chat, áudio e vídeo. Desenvolvido como Progressive Web App (PWA), oferece uma experiência nativa em dispositivos móveis e desktop.

## 📋 Índice

- [Principais Recursos](#-principais-recursos)
- [Stack Tecnológica](#-stack-tecnológica)
- [Arquitetura](#-arquitetura)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Pré-requisitos](#-pré-requisitos)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [Deploy](#-deploy)
- [Segurança](#-segurança)
- [Documentação Adicional](#-documentação-adicional)
- [Roadmap](#-roadmap)
- [Contribuindo](#-contribuindo)

## ✨ Principais Recursos

### Para Visitantes
- **Acesso via QR Code**: Escaneie o QR Code da residência para iniciar uma comunicação instantânea
- **Chat em Tempo Real**: Envie mensagens de texto e áudio gravadas diretamente para o morador
- **Chamadas de Áudio e Vídeo**: Faça chamadas WebRTC de alta qualidade com o morador
- **Interface Intuitiva**: Design moderno e responsivo, otimizado para dispositivos móveis
- **Acesso Sem Autenticação**: Não é necessário criar conta ou fazer login

### Para Moradores
- **Painel de Controle**: Dashboard completo com histórico de todas as chamadas e mensagens
- **Notificações Push**: Receba notificações instantâneas quando houver uma nova chamada
- **Múltiplas Residências**: Gerencie várias propriedades em um único painel
- **Estatísticas em Tempo Real**: Visualize chamadas atendidas, perdidas e pendentes
- **QR Codes Personalizados**: Gere QR Codes únicos para cada residência
- **Autenticação por Magic Link**: Login seguro sem necessidade de senha

### Funcionalidades Técnicas
- **PWA Completo**: Instalável em dispositivos móveis e desktop
- **WebRTC**: Comunicação peer-to-peer de áudio e vídeo sem servidores intermediários
- **Supabase Realtime**: Sincronização em tempo real de mensagens e status
- **Armazenamento de Mídia**: Áudios e vídeos armazenados no Supabase Storage
- **Service Worker**: Funcionalidade offline e notificações push
- **TypeScript**: Código type-safe e manutenível

## 🛠️ Stack Tecnológica

### Frontend
- **[Next.js 15](https://nextjs.org/)** - Framework React com App Router
- **[React 18](https://react.dev/)** - Biblioteca UI
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Framework CSS utilitário
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes UI reutilizáveis
- **[Lucide React](https://lucide.dev/)** - Ícones modernos
- **[Jotai](https://jotai.org/)** - Gerenciamento de estado

### Backend & Infraestrutura
- **[Supabase](https://supabase.com/)** - Backend-as-a-Service
  - PostgreSQL - Banco de dados relacional
  - Supabase Auth - Autenticação e autorização
  - Supabase Realtime - Sincronização em tempo real
  - Supabase Storage - Armazenamento de arquivos
- **[Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)** - Notificações push
- **[WebRTC](https://webrtc.org/)** - Comunicação peer-to-peer de áudio/vídeo

### Ferramentas de Desenvolvimento
- **[ESLint](https://eslint.org/)** - Linter JavaScript/TypeScript
- **[Prettier](https://prettier.io/)** - Formatador de código
- **[Zod](https://zod.dev/)** - Validação de schemas

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Visitante     │
│   (PWA Mobile)  │
└────────┬────────┘
         │ QR Code
         ▼
┌─────────────────────────────────────┐
│         Next.js 15 (Vercel)         │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │ /bell/[id]   │  │ /dashboard  │ │
│  │ (Visitante)  │  │ (Morador)   │ │
│  └──────┬───────┘  └──────┬──────┘ │
│         │                 │         │
│  ┌──────▼─────────────────▼──────┐ │
│  │      API Routes               │ │
│  │  /api/calls, /api/messages   │ │
│  └──────┬─────────────────┬──────┘ │
└─────────┼─────────────────┼─────────┘
          │                 │
    ┌─────▼─────┐    ┌──────▼──────┐
    │ Supabase  │    │  Firebase   │
    │           │    │      FCM     │
    │ • Database│    │              │
    │ • Realtime│    │  Push Notif  │
    │ • Storage │    │              │
    │ • Auth    │    │              │
    └───────────┘    └──────────────┘
```

### Fluxo de Comunicação

1. **Visitante escaneia QR Code** → Acessa `/bell/[houseId]`
2. **Inicia chamada** → Cria registro em `calls` (status: pending)
3. **Sistema envia notificação push** → Morador recebe alerta
4. **WebRTC signaling** → Conexão peer-to-peer estabelecida via Supabase Realtime
5. **Comunicação em tempo real** → Chat, áudio e vídeo sincronizados
6. **Armazenamento** → Mensagens e mídias salvas no Supabase

## 📂 Estrutura do Projeto

```
smart-bell/
├── src/
│   ├── app/                          # App Router (Next.js 15)
│   │   ├── api/                      # API Routes
│   │   │   ├── audio/                # Upload de áudios
│   │   │   ├── calls/                # CRUD de chamadas
│   │   │   ├── houses/               # Gerenciamento de residências
│   │   │   ├── messages/             # CRUD de mensagens
│   │   │   ├── notify/               # Envio de notificações
│   │   │   ├── video/                # Upload de vídeos
│   │   │   └── webrtc/               # Signaling WebRTC
│   │   ├── auth/
│   │   │   └── callback/             # Callback de autenticação
│   │   ├── bell/
│   │   │   └── [houseId]/            # Interface do visitante
│   │   │       ├── CallClient.tsx    # Cliente de chamadas
│   │   │       └── page.tsx          # Página principal
│   │   ├── dashboard/                # Painel do morador
│   │   │   ├── DashboardClient.tsx   # Cliente do dashboard
│   │   │   ├── actions.ts            # Server actions
│   │   │   └── page.tsx              # Página principal
│   │   ├── layout.tsx                # Layout raiz
│   │   └── page.tsx                  # Página inicial (login)
│   ├── components/                   # Componentes React
│   │   ├── ui/                       # Componentes shadcn/ui
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── textarea.tsx
│   │   ├── AudioCall.tsx             # Componente de chamada de áudio
│   │   ├── AudioRecorder.tsx         # Gravador de áudio
│   │   ├── ChatWindow.tsx            # Janela de chat
│   │   ├── NotificationButton.tsx   # Botão de notificações
│   │   ├── QRDisplay.tsx             # Exibição de QR Code
│   │   ├── ServiceWorkerRegister.tsx # Registro de service worker
│   │   ├── SignInCard.tsx            # Card de login
│   │   ├── StatusBadge.tsx           # Badge de status
│   │   └── VideoCall.tsx             # Componente de chamada de vídeo
│   ├── hooks/                        # Custom hooks
│   │   ├── useAudioCall.ts           # Hook para chamadas de áudio
│   │   ├── usePushNotifications.ts   # Hook para notificações push
│   │   ├── useVideoCall.ts           # Hook para chamadas de vídeo
│   │   └── useWebRTCSignaling.ts     # Hook para signaling WebRTC
│   ├── lib/                          # Bibliotecas e utilitários
│   │   ├── repository/              # Repositórios de dados
│   │   │   ├── calls.ts
│   │   │   ├── houses.ts
│   │   │   ├── messages.ts
│   │   │   ├── users.ts
│   │   │   └── index.ts
│   │   ├── audio.ts                  # Utilitários de áudio
│   │   ├── env.ts                    # Validação de variáveis de ambiente
│   │   ├── fcm.ts                    # Integração Firebase Cloud Messaging
│   │   ├── qrcode.ts                 # Geração de QR Codes
│   │   ├── realtime.ts               # Configuração Supabase Realtime
│   │   ├── schemas.ts                # Schemas Zod
│   │   ├── storage.ts                # Upload para Supabase Storage
│   │   ├── supabaseAdmin.ts          # Cliente Supabase admin
│   │   ├── supabaseClient.ts         # Cliente Supabase público
│   │   ├── utils.ts                  # Funções utilitárias
│   │   └── webrtc.ts                 # Utilitários WebRTC
│   ├── types/                        # Definições TypeScript
│   │   ├── database.ts               # Tipos do banco de dados
│   │   └── index.d.ts                # Tipos globais
│   └── styles/
│       └── globals.css               # Estilos globais
├── public/                           # Arquivos estáticos
│   ├── icons/                       # Ícones do PWA
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── firebase-messaging-sw.js     # Service worker Firebase
│   ├── manifest.json                # Manifest do PWA
│   └── service-worker.js            # Service worker principal
├── supabase/
│   └── migrations/
│       └── 0001_initial.sql         # Migração inicial do banco
├── docs/                             # Documentação
│   └── architecture.md              # Documentação de arquitetura
├── scripts/                          # Scripts utilitários
│   ├── test-supabase-connection.js  # Teste de conexão Supabase
│   └── test-supabase-curl.sh        # Teste via cURL
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md
```

## ✅ Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js 18+** e **npm** (ou yarn/pnpm)
- Conta no [Supabase](https://supabase.com/) com projeto criado
- Conta no [Firebase](https://firebase.google.com/) com Cloud Messaging habilitado
- **Git** para controle de versão
- **Supabase CLI** (opcional, para migrações locais)

## 🔧 Configuração

### 1. Clone o Repositório

```bash
git clone https://github.com/luanbaralle/smartbell.git
cd smartbell
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure as Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Firebase Cloud Messaging
NEXT_PUBLIC_FIREBASE_API_KEY=sua-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=seu-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=seu-vapid-key
FCM_SERVER_KEY=sua-server-key

# Aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Como Obter as Credenciais

**Supabase:**
1. Acesse [supabase.com](https://supabase.com/) e crie um projeto
2. Vá em Settings → API
3. Copie `URL` e `anon public key`
4. Para `service_role_key`, copie a chave em Settings → API (mantenha segura!)

**Firebase:**
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um projeto ou selecione existente
3. Vá em Project Settings → General
4. Role até "Your apps" e adicione uma Web app
5. Copie as credenciais do Firebase config
6. Para FCM Server Key: Project Settings → Cloud Messaging → Server key

### 4. Configure o Banco de Dados

Execute a migração SQL no Supabase:

1. Acesse o painel do Supabase
2. Vá em SQL Editor
3. Cole o conteúdo de `supabase/migrations/0001_initial.sql`
4. Execute a query

Ou use o Supabase CLI:

```bash
supabase db push
```

### 5. Configure o Storage

Os buckets `audio-messages` e `video-messages` são criados automaticamente pela migração. Verifique em Storage → Buckets no painel do Supabase.

### 6. Execute o Projeto

```bash
npm run dev
```

A aplicação estará disponível em:
- **Página inicial (Login)**: `http://localhost:3000`
- **Interface do visitante**: `http://localhost:3000/bell/<houseId>`
- **Dashboard do morador**: `http://localhost:3000/dashboard`

## 🚀 Uso

### Para Moradores

1. **Acesse a aplicação** em `http://localhost:3000`
2. **Faça login** com seu email (magic link será enviado)
3. **Acesse o dashboard** após autenticação
4. **Crie uma residência** (se ainda não tiver)
5. **Copie o QR Code** e exiba na entrada da residência
6. **Ative as notificações push** clicando no botão de notificações
7. **Monitore as chamadas** em tempo real no dashboard

### Para Visitantes

1. **Escaneie o QR Code** da residência
2. **Acesse a interface** que será aberta automaticamente
3. **Inicie uma chamada** escolhendo entre:
   - Chat de texto
   - Chamada de áudio
   - Chamada de vídeo
4. **Envie mensagens** ou faça chamadas diretamente
5. **Aguarde resposta** do morador

## 📦 Deploy

### Vercel (Recomendado)

1. **Conecte seu repositório** à Vercel
2. **Configure as variáveis de ambiente** no painel da Vercel:
   - Adicione todas as variáveis do `.env.local`
   - Certifique-se de marcar `NEXT_PUBLIC_*` como públicas
3. **Configure o domínio** em Settings → Domains
4. **Atualize `NEXT_PUBLIC_APP_URL`** com o domínio de produção
5. **Deploy automático** será feito a cada push na branch main

### Outras Plataformas

O projeto pode ser deployado em qualquer plataforma que suporte Next.js:
- **Netlify**
- **Railway**
- **Render**
- **AWS Amplify**

**Importante:** Configure todas as variáveis de ambiente na plataforma escolhida.

### Service Worker

Certifique-se de que o service worker (`/service-worker.js`) está acessível e não está sendo bloqueado por cache agressivo. Na Vercel, isso é configurado automaticamente.

## 🔒 Segurança

### Autenticação

- **Moradores**: Autenticação via Supabase Auth com magic links (sem senha)
- **Visitantes**: Acesso público controlado por RLS (Row Level Security)

### Row Level Security (RLS)

O banco de dados utiliza RLS para garantir segurança:

- **Usuários autenticados**: Acesso completo aos seus próprios dados
- **Usuários anônimos**: Podem apenas criar chamadas e mensagens (visitantes)
- **Service Role**: Usado apenas no servidor para operações administrativas

### Variáveis de Ambiente

- **Nunca commite** arquivos `.env.local` ou `.env`
- **Mantenha segura** a `SUPABASE_SERVICE_ROLE_KEY`
- **Use variáveis de ambiente** na plataforma de deploy

### WebRTC

- Comunicação peer-to-peer criptografada
- Signaling seguro via Supabase Realtime
- Sem servidores intermediários de mídia

## 📚 Documentação Adicional

- **[Arquitetura](./docs/architecture.md)** - Documentação detalhada da arquitetura do sistema
- **[Supabase Docs](https://supabase.com/docs)** - Documentação do Supabase
- **[Next.js Docs](https://nextjs.org/docs)** - Documentação do Next.js
- **[WebRTC Guide](https://webrtc.org/getting-started/overview)** - Guia do WebRTC

## 🧪 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento

# Build
npm run build        # Cria build de produção
npm run start        # Inicia servidor de produção

# Qualidade de Código
npm run lint         # Executa ESLint
npm run format       # Formata código com Prettier
```

## 🗺️ Roadmap

### Próximas Funcionalidades

- [ ] **Suporte a múltiplos moradores** por residência
- [ ] **Gravação de chamadas** (áudio/vídeo) com armazenamento
- [ ] **Métricas detalhadas** com gráficos e análises
- [ ] **Tempo de resposta médio** e estatísticas avançadas
- [ ] **Aplicativos nativos** (iOS/Android) usando React Native
- [ ] **Integrações IoT** com Alexa e Google Home
- [ ] **Modo escuro** completo
- [ ] **Internacionalização** (i18n) multi-idioma
- [ ] **Histórico de áudios** com player integrado
- [ ] **Respostas rápidas** pré-configuradas

### Melhorias Técnicas

- [ ] Testes automatizados (Jest + Playwright)
- [ ] CI/CD completo
- [ ] Monitoramento e logging avançado
- [ ] Otimização de performance
- [ ] Cache inteligente de mídias

## 🤝 Contribuindo

Contribuições são bem-vindas! Siga estes passos:

1. **Fork** o projeto
2. **Crie uma branch** para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra um Pull Request**

### Padrões de Código

- Use TypeScript para type safety
- Siga as convenções do ESLint
- Execute `npm run lint` antes de commitar
- Formate o código com `npm run format`
- Adicione comentários em código complexo
- Mantenha componentes pequenos e reutilizáveis

### Reportar Bugs

Use as [GitHub Issues](https://github.com/luanbaralle/smartbell/issues) para reportar bugs. Inclua:
- Descrição detalhada do problema
- Passos para reproduzir
- Comportamento esperado vs. atual
- Screenshots (se aplicável)
- Informações do ambiente (OS, navegador, versão)

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Autores

- **Luan Baralle** - [GitHub](https://github.com/luanbaralle)

## 🙏 Agradecimentos

- [Supabase](https://supabase.com/) pela infraestrutura backend
- [Vercel](https://vercel.com/) pela plataforma de deploy
- [shadcn](https://ui.shadcn.com/) pelos componentes UI
- Comunidade open source

---

<div align="center">

**Smart Bell © 2025** — Comunicações inteligentes para casas conectadas.

[Documentação](./docs/architecture.md) • [Issues](https://github.com/luanbaralle/smartbell/issues) • [Pull Requests](https://github.com/luanbaralle/smartbell/pulls)

</div>

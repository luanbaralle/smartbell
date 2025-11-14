import { SignInCard } from "@/components/SignInCard";
import { Bell, ShieldCheck, Sparkles, Waves } from "lucide-react";

const heroHighlights = [
  {
    title: "Chamadas em tempo real",
    description: "Áudio e vídeo WebRTC com baixa latência e ruído reduzido automaticamente.",
    icon: Waves
  },
  {
    title: "Segurança reforçada",
    description: "Supabase Auth + FCM garantem autenticação sólida e notificações confiáveis.",
    icon: ShieldCheck
  }
];

const metrics = [
  { value: "280+", label: "Residências conectadas" },
  { value: "1.4k", label: "Chamadas diárias" },
  { value: "12 s", label: "Tempo médio de resposta" }
];

const featureCards = [
  {
    pill: "WebRTC",
    title: "Audio & vídeo cristalinos",
    description:
      "Chamadas com fallback inteligente, gravação opcional e cancelamento de eco integrado."
  },
  {
    pill: "Segurança",
    title: "Autenticação Supabase",
    description:
      "Sessões seguras com magic link ou senha, controle de acesso granular e logs completos."
  },
  {
    pill: "PWA + Push",
    title: "Alerts imediatos",
    description:
      "FCM com service worker dedicado, notificações com deep link e toque sonoro no dashboard."
  }
];

const panelHighlights = [
  "Timeline de chamadas com status em tempo real",
  "Respostas rápidas e gravação de áudio pelo navegador",
  "Canal WebRTC com monitoramento de qualidade",
  "Notificações push sincronizadas com Supabase Realtime"
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0B1120] py-16 px-4 text-slate-50">
      <div className="mx-auto max-w-6xl space-y-16">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-950 via-[#0E1527] to-[#0B1120] shadow-[0_40px_140px_-60px_rgba(8,15,31,1)]" id="inicio">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.25),transparent_40%)] opacity-70" />

          <div className="relative grid gap-12 px-8 py-12 lg:grid-cols-[1.05fr_420px] lg:items-center">
            <section className="space-y-8 text-slate-100">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
                <Sparkles className="h-4 w-4 text-primary" />
                Smart Bell OS
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-primary shadow-lg shadow-primary/40">
                    <Bell className="h-6 w-6" />
                  </div>
                  <span className="text-sm">Interfone PWA · WebRTC · Push Notifications</span>
                </div>
                <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                  A campainha digital com experiência de aplicativo premium.
                </h1>
                <p className="text-base text-slate-300 sm:text-lg">
                  Visitantes escaneiam o QR Code, chamam pelo PWA e você atende em tempo real com
                  chat, áudio ou vídeo. Tudo sincronizado via Supabase e notificações pelo Firebase.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {heroHighlights.map(({ title, description, icon: Icon }) => (
                  <article
                    key={title}
                    className="rounded-3xl border border-white/15 bg-white/10 p-5 text-left shadow-[0_30px_120px_-45px_rgba(56,189,248,0.65)]"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-base font-semibold text-white">{title}</p>
                    <p className="text-sm text-slate-300">{description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="flex justify-center" id="login">
              <div className="w-full max-w-sm">
                <SignInCard />
              </div>
            </section>
          </div>
        </div>

        <section className="rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
                Operação em números
              </p>
              <p className="text-lg text-slate-200">
                Supabase + FCM garantem monitoramento em tempo real, com logs persistentes e push
                instantâneo para moradores.
              </p>
            </div>
            <div className="grid flex-1 gap-6 sm:grid-cols-3">
              {metrics.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center"
                >
                  <p className="text-3xl font-semibold text-white">{value}</p>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-[32px] border border-white/5 bg-gradient-to-br from-[#10172b] via-[#0d1426] to-[#0b1324] p-10 shadow-[0_30px_120px_-60px_rgba(11,17,32,1)] lg:grid-cols-3">
          {featureCards.map((card) => (
            <article key={card.title} className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-6">
              <span className="inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-primary">
                {card.pill}
              </span>
              <h3 className="text-lg font-semibold text-white">{card.title}</h3>
              <p className="text-sm text-slate-300">{card.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-10 rounded-[32px] border border-white/10 bg-[#0c1324] p-10 lg:grid-cols-[1fr,0.9fr]">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Prévia do painel
            </p>
            <h2 className="text-3xl font-semibold text-white">
              Monitore chamadas, mensagens e push em um cockpit único.
            </h2>
            <ul className="space-y-3 text-sm text-slate-300">
              {panelHighlights.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-[0_40px_140px_-70px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Dashboard • Preview</span>
              <span>Tempo real</span>
            </div>
            <div className="mt-4 space-y-4">
              {[1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">Chamada #{index} · Casa Alpha</p>
                    <span className="text-xs text-primary">Conectando</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    WebRTC em andamento · visitante ouvindo toque inteligente.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-[#0d1426] px-6 py-8 text-sm text-slate-400 lg:flex-row lg:items-center lg:justify-between">
          <p>© {new Date().getFullYear()} Smart Bell OS · Interfone inteligente com Supabase.</p>
          <div className="flex gap-6 text-xs uppercase tracking-[0.3em] text-slate-500">
            <a href="#inicio" className="hover:text-white">
              Produto
            </a>
            <a href="#login" className="hover:text-white">
              Login
            </a>
            <a href="mailto:suporte@smartbell.com" className="hover:text-white">
              Suporte
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}


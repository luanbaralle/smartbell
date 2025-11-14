import { SignInCard } from "@/components/SignInCard";
import { Sparkles, Waves, ShieldCheck, Bell } from "lucide-react";

const benefits = [
  {
    title: "WebRTC em tempo real",
    description: "Audiovisual com baixa latência, fallback automático e cancelamento de eco."
  },
  {
    title: "Segurança Supabase + FCM",
    description: "Sessões criptografadas, Realtime e push confiável em todos os dispositivos."
  },
  {
    title: "PWA + Push Notifications",
    description: "Instale como app, receba alertas instantâneos e atenda de qualquer lugar."
  }
];

const metrics = [
  { value: "280+", label: "Residências conectadas" },
  { value: "1.4k", label: "Chamadas/dia" },
  { value: "12 s", label: "Tempo médio de resposta" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0B1120] text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-24 lg:px-8">
        <section className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr]" id="inicio">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
              <Sparkles className="h-4 w-4 text-primary" />
              Smart Bell OS
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-slate-400">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                Interfone WebRTC · Push · PWA
              </div>
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-[3.4rem]">
                Campainha digital com experiência SaaS premium.
              </h1>
              <p className="text-lg text-slate-300">
                Visitantes chamam via QR code. Você recebe push instantâneo, atende por chat, áudio
                ou vídeo e registra tudo no Supabase. Design inspirado em produtos como Linear e
    Vercel.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#login"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  Acessar painel
                </a>
                <span className="text-sm text-slate-400">
                  Sem instalação. Funciona como PWA em todos os devices.
                </span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map(({ title, description }) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-sm text-slate-400">{description}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="flex justify-center" id="login">
            <SignInCard />
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur lg:grid-cols-3">
          {metrics.map(({ value, label }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-[#0d1424] p-6 text-center">
              <p className="text-3xl font-semibold text-white">{value}</p>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{label}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#10172b] via-[#0d1426] to-[#0b1324] p-10 shadow-[0_30px_120px_-60px_rgba(11,17,32,1)] lg:grid-cols-3">
          {[
            {
              icon: Waves,
              title: "WebRTC premium",
              description: "Audio/video HD com fallback automático e monitoramento de qualidade."
            },
            {
              icon: ShieldCheck,
              title: "Segurança Supabase + FCM",
              description:
                "Sessões com refresh automático, policies seguras e logs persistentes no PostgreSQL."
            },
            {
              icon: Sparkles,
              title: "PWA pronta para push",
              description: "Instale o dashboard, receba notificações e toque de campainha instantâneo."
            }
          ].map(({ icon: Icon, title, description }) => (
            <article key={title} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-slate-300">{description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 rounded-[32px] border border-white/10 bg-[#0d1426] p-10 lg:grid-cols-[1fr,0.95fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Preview do painel</p>
            <h2 className="text-3xl font-semibold text-white">
              Timeline, notificações e chamadas em um cockpit minimalista.
            </h2>
            <ul className="space-y-3 text-sm text-slate-300">
              {[
                "Histórico de chamadas com status em tempo real",
                "Respostas rápidas e memo de voz via navegador",
                "Integração direta com Supabase Realtime",
                "Push instantâneo com service worker dedicado"
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-[0_40px_140px_-70px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Dashboard · Smart Bell OS</span>
              <span>Tempo real</span>
            </div>
            <div className="mt-5 space-y-4">
              {[1, 2, 3].map((index) => (
                <div key={index} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between text-white">
                    <p className="font-medium">Chamada #{index} · Casa Alfa</p>
                    <span className="text-xs text-primary">Conectando</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    WebRTC sincronizado · visitante ouvindo toque inteligente.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-[#0d1426] px-6 py-8 text-sm text-slate-400 lg:flex-row lg:items-center lg:justify-between">
          <p>© {new Date().getFullYear()} Smart Bell OS · Interfone SaaS com Supabase.</p>
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


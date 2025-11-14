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

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.28),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(148,163,184,0.08)_35%,transparent_70%)] blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-6 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-10">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Smart Bell OS
              </span>
              <span className="hidden h-4 w-px bg-white/10 sm:block" />
              <span>Interfone PWA · Notificações push · WebRTC</span>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 text-slate-400">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-lg shadow-primary/40">
                  <Bell className="h-6 w-6" />
                </div>
                <span className="text-sm">Versão Beta · 2025</span>
              </div>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                O interfone digital que transforma visitas em experiências premium.
              </h1>
              <p className="text-lg text-slate-300 sm:text-xl">
                Visitantes escaneiam o QR Code, batem à porta e você atende pelo dashboard com chat,
                áudio ou vídeo instantâneo. Tudo com registro no Supabase e notificações via Firebase.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {heroHighlights.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="group rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_30px_120px_-45px_rgba(56,189,248,0.65)] transition hover:-translate-y-1 hover:border-primary/40"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-base font-semibold text-white">{title}</p>
                  <p className="text-sm text-slate-400">{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="flex justify-center">
            <div className="w-full max-w-md">
              <SignInCard />
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-white/5 bg-gradient-to-br from-white/5 via-white/0 to-white/5 p-8 shadow-[0_35px_150px_-60px_rgba(59,130,246,0.7)] backdrop-blur">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Operação em números
              </p>
              <p className="text-lg text-slate-300">
                Supabase + FCM garantem monitoramento em tempo real, com logs persistentes e push
                instantâneo para moradores.
              </p>
            </div>
            <div className="grid flex-1 gap-6 sm:grid-cols-3">
              {metrics.map(({ value, label }) => (
                <div key={label} className="rounded-2xl border border-white/10 p-4 text-center">
                  <p className="text-3xl font-semibold text-white">{value}</p>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}


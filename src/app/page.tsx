import { SignInCard } from "@/components/SignInCard";
import { Bell, ShieldCheck, Sparkles, Waves } from "lucide-react";

const highlights = [
  {
    title: "Chamadas em tempo real",
    description: "Áudio e vídeo via WebRTC com baixa latência e qualidade cristalina.",
    icon: Waves
  },
  {
    title: "Segurança reforçada",
    description: "Autenticação Supabase + FCM garantindo alertas confiáveis 24/7.",
    icon: ShieldCheck
  }
];

const stats = [
  { label: "Residências conectadas", value: "280+" },
  { label: "Chamadas diárias", value: "1.4k" },
  { label: "Tempo médio de resposta", value: "12s" }
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_55%)]" />
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-br from-primary/10 via-slate-900/40 to-slate-950/80 blur-[120px] lg:block" />

      <div className="relative z-10 grid min-h-screen gap-12 px-6 py-12 lg:grid-cols-2 lg:px-16">
        <section className="flex flex-col justify-between">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              <Sparkles className="h-4 w-4 text-primary" />
              Nova geração de interfones
            </span>

            <div className="space-y-6">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-lg shadow-primary/30">
                  <Bell className="h-7 w-7" />
                </div>
                Smart Bell OS
              </div>
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                Interfone digital com experiência de aplicativo premium.
              </h1>
              <p className="text-lg text-slate-400 sm:text-xl">
                Visitantes chamam pelo QR Code. Moradores atendem via PWA com notificações push,
                chat, áudio e vídeo em tempo real — tudo em um único painel.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_120px_-40px_rgba(59,130,246,0.6)]"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-base font-semibold text-white">{title}</p>
                  <p className="text-sm text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-6 rounded-3xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent p-6 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
              Operação em números
            </p>
            <div className="grid gap-6 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label}>
                  <p className="text-3xl font-semibold text-white">{item.value}</p>
                  <p className="text-sm text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-xl">
            <SignInCard />
          </div>
        </section>
      </div>
    </main>
  );
}


import { SignInCard } from "@/components/SignInCard";
import { Bell } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="mb-12 text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/20">
            <Bell className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-100 mb-3">
            Smart Bell
          </h1>
          <p className="text-xl text-slate-400 font-light">
            Interfone digital inteligente
          </p>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Conecte visitantes e moradores com notificações push e comunicação em tempo real
          </p>
        </div>
      </div>
      <SignInCard />
    </main>
  );
}


import { SignInCard } from "@/components/SignInCard";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-100">
          Smart Bell
        </h1>
        <p className="mt-2 text-lg text-slate-400">
          Interfone digital inteligente
        </p>
      </div>
      <SignInCard />
    </main>
  );
}


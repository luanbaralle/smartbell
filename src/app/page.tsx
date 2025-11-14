import { SignInCard } from "@/components/SignInCard";

export default function HomePage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 text-slate-900"
      style={{ backgroundColor: "#f5f7fa" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(180deg,rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[size:120px_120px]" />

      <div className="relative z-10 w-full max-w-4xl">
        <h1 className="mb-5 text-center text-2xl font-semibold tracking-tight text-slate-700">
          Smart Bell OS · Residents
        </h1>
        <SignInCard />
      </div>
    </main>
  );
}


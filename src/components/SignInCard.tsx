"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  LogIn,
  ShieldCheck,
  UserPlus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loginWithPassword, registerWithPassword } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

type SignInCardProps = {
  errorMessage?: string | null;
};

type AuthMode = "login" | "register";

type Feedback =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

export function SignInCard({ errorMessage }: SignInCardProps = {}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm: ""
  });
  const [feedback, setFeedback] = useState<Feedback>(() =>
    errorMessage ? { type: "error", message: errorMessage } : null
  );
  const [isPending, startTransition] = useTransition();

  const isRegister = mode === "register";

  const isSubmitDisabled = useMemo(() => {
    if (!form.email.trim() || form.password.length < 6) {
      return true;
    }
    if (isRegister && form.password !== form.confirm) {
      return true;
    }
    return isPending;
  }, [form, isRegister, isPending]);

  const setField =
    (field: keyof typeof form) =>
    (value: string) => {
      setForm((current) => ({ ...current, [field]: value }));
      setFeedback(null);
    };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    startTransition(async () => {
      try {
        if (mode === "login") {
          await loginWithPassword({
            email: form.email.trim(),
            password: form.password
          });
          setFeedback({
            type: "success",
            message: "Login realizado com sucesso! Redirecionando..."
          });
          router.push("/dashboard");
          router.refresh();
          return;
        }

        const result = await registerWithPassword({
          email: form.email.trim(),
          password: form.password
        });

        if (result.requiresEmailConfirmation) {
          setFeedback({
            type: "success",
            message:
              "Conta criada! Enviamos um e-mail de confirmação para você continuar."
          });
        } else {
          setFeedback({
            type: "success",
            message: "Conta criada! Redirecionando para o painel..."
          });
          router.push("/dashboard");
          router.refresh();
        }

        setMode("login");
        setForm({
          email: form.email.trim(),
          password: "",
          confirm: ""
        });
      } catch (error) {
        console.error(error);
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível concluir a ação. Tente novamente."
        });
      }
    });
  };

  const tabs: { id: AuthMode; label: string; description: string; icon: typeof LogIn }[] =
    [
      {
        id: "login",
        label: "Entrar",
        description: "Já sou morador",
        icon: LogIn
      },
      {
        id: "register",
        label: "Criar conta",
        description: "Primeiro acesso",
        icon: UserPlus
      }
    ];

  return (
    <Card className="w-full max-w-md border border-white/10 bg-gradient-to-br from-[#111b2f] via-[#0b1324] to-[#101626] text-slate-100 shadow-[0_45px_140px_-60px_rgba(15,23,42,1)]">
      <CardHeader className="space-y-6 pb-3">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
          <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
          Painel exclusivo
        </div>
        <div className="space-y-2">
          <CardTitle className="text-[1.9rem] font-semibold leading-snug text-white">
            Acesse o Smart Bell OS
          </CardTitle>
          <CardDescription className="text-base text-slate-400">
            Autenticação segura, sincronizada ao Supabase. Controle visitas, chamadas e push em um
            único lugar.
          </CardDescription>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
          {tabs.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id);
                setFeedback(null);
              }}
              className={cn(
                "group flex flex-col rounded-xl px-4 py-3 text-left transition-all",
                mode === id
                  ? "bg-white text-slate-900 shadow-inner shadow-primary/10"
                  : "text-slate-200 hover:bg-white/10"
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon className={cn("h-4 w-4", mode === id ? "text-primary" : "text-slate-400")} />
                <span className={mode === id ? "text-slate-900" : ""}>{label}</span>
              </div>
              <span
                className={cn(
                  "text-xs",
                  mode === id ? "text-slate-500" : "text-slate-500 group-hover:text-slate-300"
                )}
              >
                {description}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3">
            <label className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
              E-mail
            </label>
            <Input
              type="email"
              placeholder="nome@smartbell.com"
              value={form.email}
              onChange={(event) => setField("email")(event.target.value)}
              disabled={isPending}
              className="h-12 border-white/10 bg-white/5 text-base text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-primary/40"
              autoComplete="email"
              required
            />
          </div>

          <div className="grid gap-3">
            <label className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
              Senha
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(event) => setField("password")(event.target.value)}
              disabled={isPending}
              className="h-12 border-white/10 bg-white/5 text-base text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-primary/40"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={6}
              required
            />
            <p className="text-xs text-slate-500">
              Use ao menos 6 caracteres. Dica: combine letras, números e símbolos.
            </p>
          </div>

          {isRegister && (
            <div className="grid gap-3">
              <label className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
                Confirmar senha
              </label>
              <Input
                type="password"
                placeholder="Digite novamente"
                value={form.confirm}
                onChange={(event) => setField("confirm")(event.target.value)}
                disabled={isPending}
                className="h-12 border-white/10 bg-white/5 text-base text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-primary/40"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
          )}

          <Button
            type="submit"
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-primary/90"
            disabled={isSubmitDisabled}
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processando...
              </>
            ) : (
              <>
                {mode === "login" ? (
                  <>
                    <LogIn className="h-4 w-4" />
                    Entrar agora
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Criar minha conta
                  </>
                )}
              </>
            )}
          </Button>
        </form>

        {feedback && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/30 bg-red-500/10 text-red-200"
            )}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="flex-1 leading-relaxed">{feedback.message}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 border-t border-white/5 pt-4 text-xs text-slate-400">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="leading-relaxed">
            Seus dados são protegidos com Supabase Auth, criptografia e notificações seguras via
            Firebase.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <button
            type="button"
            className="text-primary/90 underline-offset-4 transition hover:text-primary"
            onClick={() => router.push("/dashboard?mode=login")}
          >
            Esqueceu a senha?
          </button>
          <span className="text-slate-500">Suporte 24/7 · suporte@smartbell.com</span>
        </div>
      </CardFooter>
    </Card>
  );
}



"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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

const tabs: { id: AuthMode; label: string }[] = [
  { id: "login", label: "Login" },
  { id: "register", label: "Sign Up" }
];

const socialProviders = [
  { id: "google", label: "Continue with Google", icon: "G" },
  { id: "apple", label: "Continue with Apple", icon: "" },
  { id: "binance", label: "Continue with Binance", icon: "◇" },
  { id: "wallet", label: "Continue with Wallet", icon: "↗" }
];

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
            message: "Conta criada! Enviamos um e-mail de confirmação para você continuar."
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

  return (
    <Card className="mx-auto w-full max-w-xl rounded-[28px] border border-[#e3e6ed] bg-white shadow-[0px_40px_80px_rgba(15,23,42,0.08)]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-center rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-500">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id);
                setFeedback(null);
              }}
              className={cn(
                "flex-1 rounded-full px-4 py-1 text-sm transition",
                mode === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <CardTitle className="text-center text-lg font-semibold text-slate-800">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 px-8 pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600">Email address</label>
            <Input
              type="email"
              placeholder="Enter your email address"
              value={form.email}
              onChange={(event) => setField("email")(event.target.value)}
              disabled={isPending}
              className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <label className="font-medium">Password</label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => router.push("/dashboard?mode=login")}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(event) => setField("password")(event.target.value)}
              disabled={isPending}
              className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={6}
              required
            />
          </div>

          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Confirm password</label>
              <Input
                type="password"
                placeholder="Confirm your password"
                value={form.confirm}
                onChange={(event) => setField("confirm")(event.target.value)}
                disabled={isPending}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
          )}

          <Button
            type="submit"
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 text-sm font-semibold text-white shadow-inner shadow-slate-600/40"
            disabled={isSubmitDisabled}
          >
            {isPending ? "Processing..." : mode === "login" ? "Log In" : "Create account"}
          </Button>
        </form>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          OR
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="space-y-2">
          {socialProviders.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              className="flex h-10 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 transition hover:border-slate-300"
            >
              <span className="text-base">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
              feedback.type === "success"
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-rose-100 bg-rose-50 text-rose-600"
            )}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <p className="flex-1 leading-relaxed">{feedback.message}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-6 rounded-b-[28px] border-t border-slate-100 bg-slate-50 px-8 py-6 text-center text-sm text-slate-500">
        <p>
          Don’t have an account yet?{" "}
          <button
            type="button"
            className="font-semibold text-slate-800 hover:text-slate-900"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
        <p className="text-xs text-slate-400">Smart Bell OS · Residents portal</p>
      </CardFooter>
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Mail, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sendMagicLink, loginWithPassword } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

type SignInCardProps = {
  errorMessage?: string | null;
};

type AuthMode = "magic" | "password";

export function SignInCard({ errorMessage }: SignInCardProps = {}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage || null);

  const handleMagicLinkSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || isPending) return;

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        await sendMagicLink(email.trim());
        setSuccess(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível enviar o link. Tente novamente."
        );
      }
    });
  };

  const handlePasswordSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim() || isPending) return;

    setError(null);

    startTransition(async () => {
      try {
        await loginWithPassword({
          email: email.trim(),
          password: password
        });
        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Credenciais inválidas. Verifique e-mail e senha."
        );
      }
    });
  };

  return (
    <Card className="w-full max-w-md shadow-lg animate-fade-in">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
          <Bell className="h-8 w-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl font-bold">Smart Bell</CardTitle>
        <CardDescription className="text-base">
          Entre com seu email para acessar o painel de controle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError(null);
              setSuccess(false);
            }}
            className={cn(
              "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              mode === "password"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setError(null);
              setSuccess(false);
            }}
            className={cn(
              "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              mode === "magic"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Link Mágico
          </button>
        </div>

        {success && mode === "magic" ? (
          <div className="space-y-4 text-center">
            <div className="rounded-lg border border-success/20 bg-success/10 p-4">
              <p className="text-sm font-medium text-success">
                Link enviado com sucesso!
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Verifique seu email e clique no link para acessar o painel.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSuccess(false);
                setEmail("");
              }}
            >
              Enviar novo link
            </Button>
          </div>
        ) : mode === "magic" ? (
          <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="seu@email.com"
                className="h-12"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                disabled={isPending}
                required
                autoComplete="email"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={!email.trim() || isPending}
            >
              {isPending ? "Enviando..." : "Enviar Link Mágico"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Enviaremos um link de acesso seguro para seu email
            </p>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  className="h-12 pl-10"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  disabled={isPending}
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Sua senha"
                  className="h-12 pl-10"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  disabled={isPending}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={!email.trim() || !password.trim() || isPending}
            >
              {isPending ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Ou use o link mágico para acesso sem senha
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

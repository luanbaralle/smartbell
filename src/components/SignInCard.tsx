"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sendMagicLink } from "@/app/dashboard/actions";

type SignInCardProps = {
  errorMessage?: string | null;
};

export function SignInCard({ errorMessage }: SignInCardProps = {}) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage || null);

  const handleSubmit = (event: React.FormEvent) => {
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
        {success ? (
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
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
          </form>
        )}
        <p className="text-sm text-muted-foreground text-center">
          Enviaremos um link de acesso seguro para seu email
        </p>
      </CardContent>
    </Card>
  );
}

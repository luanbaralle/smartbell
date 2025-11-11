"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestMagicLink } from "@/app/dashboard/actions";

export function SignInCard() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        await requestMagicLink(email);
        setFeedback("Verifique sua caixa de entrada para acessar o painel.");
      } catch (error) {
        console.error(error);
        setFeedback("Não foi possível enviar o link. Tente novamente.");
      }
    });
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Acessar painel do morador</CardTitle>
        <CardDescription>
          Informe seu e-mail para receber um link mágico de autenticação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300" htmlFor="email">
            E-mail
          </label>
          <Input
            id="email"
            type="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isPending}
          />
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={handleSubmit}
          disabled={isPending || !email}
        >
          <Mail className="mr-2 h-4 w-4" />
          Receber link de acesso
        </Button>
        {feedback && <p className="text-xs text-slate-400">{feedback}</p>}
      </CardContent>
    </Card>
  );
}


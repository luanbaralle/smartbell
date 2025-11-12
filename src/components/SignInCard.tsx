"use client";

import { useState, useTransition } from "react";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestMagicLink } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

export function SignInCard() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) return;
    
    startTransition(async () => {
      try {
        await requestMagicLink(email.trim());
        setFeedback({
          type: "success",
          message: "Link de acesso enviado! Verifique sua caixa de entrada."
        });
        setEmail("");
      } catch (error) {
        console.error(error);
        setFeedback({
          type: "error",
          message: "Não foi possível enviar o link. Verifique o e-mail e tente novamente."
        });
      }
    });
  };

  return (
    <Card className="w-full max-w-md border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl shadow-2xl">
      <CardHeader className="space-y-2 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-100">
              Acessar painel
            </CardTitle>
            <CardDescription className="text-slate-400">
              Entre com seu e-mail
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label 
              className="text-sm font-medium text-slate-300" 
              htmlFor="email"
            >
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFeedback(null);
              }}
              disabled={isPending}
              className="h-12 text-base"
              autoFocus
            />
          </div>
          
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            disabled={isPending || !email.trim()}
          >
            {isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Receber link de acesso
              </>
            )}
          </Button>
        </form>
        
        {feedback && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-sm",
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            )}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="flex-1">{feedback.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export function SignInCard() {
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
        <form className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="seu@email.com"
              className="h-12"
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            Enviar Link Mágico
          </Button>
        </form>
        <p className="text-sm text-muted-foreground text-center">
          Enviaremos um link de acesso seguro para seu email
        </p>
      </CardContent>
    </Card>
  );
}

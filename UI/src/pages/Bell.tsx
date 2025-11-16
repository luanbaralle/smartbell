import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "@/components/ChatWindow";
import { Bell as BellIcon, Phone, Video, MessageSquare } from "lucide-react";
import { useState } from "react";

const Bell = () => {
  const [activeMode, setActiveMode] = useState<"idle" | "chat" | "audio" | "video">("idle");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in">
        {/* Header Card */}
        <Card className="shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-primary" />
          <CardHeader className="text-center space-y-4 bg-gradient-card">
            <div className="mx-auto h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow animate-pulse-glow">
              <BellIcon className="h-10 w-10 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl mb-2">Bem-vindo!</CardTitle>
              <CardDescription className="text-base">
                Escolha como deseja se comunicar com o morador
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        {/* Action Buttons */}
        {activeMode === "idle" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            <Button
              onClick={() => setActiveMode("chat")}
              className="h-32 flex-col gap-3 bg-card hover:bg-accent/10 text-foreground border-2 border-primary/20 hover:border-primary/40 transition-all shadow-md hover:shadow-lg"
              variant="outline"
            >
              <MessageSquare className="h-8 w-8 text-primary" />
              <div className="text-center">
                <p className="font-semibold">Chat</p>
                <p className="text-xs text-muted-foreground">Mensagem de texto</p>
              </div>
            </Button>

            <Button
              onClick={() => setActiveMode("audio")}
              className="h-32 flex-col gap-3 bg-card hover:bg-accent/10 text-foreground border-2 border-primary/20 hover:border-primary/40 transition-all shadow-md hover:shadow-lg"
              variant="outline"
            >
              <Phone className="h-8 w-8 text-primary" />
              <div className="text-center">
                <p className="font-semibold">Áudio</p>
                <p className="text-xs text-muted-foreground">Chamada de voz</p>
              </div>
            </Button>

            <Button
              onClick={() => setActiveMode("video")}
              className="h-32 flex-col gap-3 bg-card hover:bg-accent/10 text-foreground border-2 border-primary/20 hover:border-primary/40 transition-all shadow-md hover:shadow-lg"
              variant="outline"
            >
              <Video className="h-8 w-8 text-primary" />
              <div className="text-center">
                <p className="font-semibold">Vídeo</p>
                <p className="text-xs text-muted-foreground">Chamada com vídeo</p>
              </div>
            </Button>
          </div>
        )}

        {/* Chat Window */}
        {activeMode === "chat" && (
          <div className="space-y-4 animate-fade-in">
            <ChatWindow />
            <Button
              onClick={() => setActiveMode("idle")}
              variant="outline"
              className="w-full"
            >
              Voltar
            </Button>
          </div>
        )}

        {/* Audio Call */}
        {activeMode === "audio" && (
          <Card className="shadow-lg animate-fade-in">
            <CardContent className="py-12 text-center space-y-6">
              <div className="mx-auto h-24 w-24 rounded-full bg-gradient-primary flex items-center justify-center animate-pulse-glow">
                <Phone className="h-12 w-12 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xl font-semibold mb-2">Chamada de Áudio</p>
                <p className="text-muted-foreground">Aguardando resposta do morador...</p>
              </div>
              <Button
                onClick={() => setActiveMode("idle")}
                variant="destructive"
                className="w-full max-w-xs"
              >
                Encerrar Chamada
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Video Call */}
        {activeMode === "video" && (
          <Card className="shadow-lg animate-fade-in">
            <CardContent className="py-12 text-center space-y-6">
              <div className="mx-auto h-24 w-24 rounded-full bg-gradient-primary flex items-center justify-center animate-pulse-glow">
                <Video className="h-12 w-12 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xl font-semibold mb-2">Chamada de Vídeo</p>
                <p className="text-muted-foreground">Aguardando resposta do morador...</p>
              </div>
              <Button
                onClick={() => setActiveMode("idle")}
                variant="destructive"
                className="w-full max-w-xs"
              >
                Encerrar Chamada
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Sistema Smart Bell • Aguarde a resposta do morador
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Bell;

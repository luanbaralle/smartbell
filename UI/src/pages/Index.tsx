import { SignInCard } from "@/components/SignInCard";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="relative z-10 w-full max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Smart Bell
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Sistema inteligente de interfone digital com comunicação em tempo real
          </p>
        </div>

        <div className="flex justify-center">
          <SignInCard />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 animate-fade-in">
          <div className="text-center p-6 rounded-lg bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="font-semibold mb-2">Acesso via QR Code</h3>
            <p className="text-sm text-muted-foreground">
              Visitantes escaneiam o código e iniciam comunicação instantânea
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="font-semibold mb-2">Chat em Tempo Real</h3>
            <p className="text-sm text-muted-foreground">
              Mensagens de texto e áudio sincronizadas instantaneamente
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📞</span>
            </div>
            <h3 className="font-semibold mb-2">Áudio e Vídeo</h3>
            <p className="text-sm text-muted-foreground">
              Chamadas WebRTC de alta qualidade sem intermediários
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

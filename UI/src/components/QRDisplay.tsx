import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Share2 } from "lucide-react";

interface QRDisplayProps {
  houseId: string;
  houseName: string;
}

export function QRDisplay({ houseId, houseName }: QRDisplayProps) {
  const bellUrl = `${window.location.origin}/bell/${houseId}`;

  return (
    <Card className="overflow-hidden shadow-lg">
      <CardHeader className="bg-gradient-card">
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          QR Code da Residência
        </CardTitle>
        <CardDescription>
          Visitantes podem escanear este código para tocar a campainha
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-card rounded-lg border-2 border-primary/20 shadow-md">
            <div className="h-64 w-64 bg-muted rounded-lg flex items-center justify-center">
              <QrCode className="h-32 w-32 text-muted-foreground" />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-center">{houseName}</p>
          <p className="text-xs text-muted-foreground text-center break-all">
            {bellUrl}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Baixar
          </Button>
          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

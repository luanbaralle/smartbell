"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { House } from "@/types";

interface QRDisplayProps {
  house: House;
}

export function QRDisplay({ house }: QRDisplayProps) {
  // Use consistent URL to avoid hydration mismatch
  // Use useState to ensure client-side rendering for URL
  const [bellUrl, setBellUrl] = useState<string>("");

  useEffect(() => {
    // Only set URL on client side to avoid hydration mismatch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (typeof window !== "undefined" ? window.location.origin : "");
    setBellUrl(baseUrl ? `${baseUrl}/bell/${house.id}` : `/bell/${house.id}`);
  }, [house.id]);

  const handleDownload = () => {
    // Implementar download do QR Code
    const svg = document.querySelector(`#qr-${house.id} svg`);
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `qr-code-${house.name}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QR Code - ${house.name}`,
          text: `Escaneie este QR Code para tocar a campainha de ${house.name}`,
          url: bellUrl,
        });
      } catch (err) {
        // Usuário cancelou ou erro
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copiar para clipboard
      navigator.clipboard.writeText(bellUrl);
      alert("Link copiado para a área de transferência!");
    }
  };

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
            <div id={`qr-${house.id}`} className="h-64 w-64 flex items-center justify-center bg-white rounded-lg p-2">
              {bellUrl ? (
                <QRCodeSVG
                  value={bellUrl}
                  size={256}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div className="h-64 w-64 flex items-center justify-center text-muted-foreground">
                  Carregando...
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-center">{house.name}</p>
          <p className="text-xs text-muted-foreground text-center break-all">
            {bellUrl || "Carregando URL..."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Baixar
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

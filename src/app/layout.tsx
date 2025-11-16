import type { Metadata } from "next";
import { ReactNode } from "react";

import "../styles/globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Smart Bell",
  description:
    "Interfone digital com QR Code, notificações push e comunicação em tempo real.",
  applicationName: "Smart Bell",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  viewport:
    "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}


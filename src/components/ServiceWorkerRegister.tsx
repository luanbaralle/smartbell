"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NEXT_PUBLIC_SKIP_SW === "true"
    ) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/service-worker.js");
        console.info("[SmartBell] Service worker registered");
      } catch (error) {
        console.error("[SmartBell] Service worker registration failed", error);
      }
    };

    register();
  }, []);

  return null;
}


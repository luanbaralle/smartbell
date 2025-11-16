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
        // Try to register service worker
        const registration = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/"
        });
        
        console.info("[SmartBell] Service worker registered", registration.scope);

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.info("[SmartBell] New service worker available");
              }
            });
          }
        });

        // Also register /sw.js for compatibility
        try {
          await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        } catch (swError) {
          // Ignore if /sw.js fails, it's just for compatibility
          console.debug("[SmartBell] /sw.js registration skipped", swError);
        }
      } catch (error) {
        console.error("[SmartBell] Service worker registration failed", error);
      }
    };

    register();
  }, []);

  return null;
}


"use client";

import { useCallback, useState } from "react";
import { getFirebaseMessaging } from "@/lib/fcm";
import { getToken, isSupported } from "firebase/messaging";

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = useCallback(async () => {
    if (!(await isSupported())) {
      setError("Dispositivo não suporta notificações push.");
      return null;
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      setError("Firebase Messaging não configurado.");
      return null;
    }

    try {
      setIsLoading(true);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Permissão de notificações não concedida.");
        return null;
      }

      const registration = await navigator.serviceWorker.ready;

      const fcmToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (!fcmToken) {
        setError("Não foi possível obter token de notificações.");
        return null;
      }

      setToken(fcmToken);
      setError(null);
      return fcmToken;
    } catch (err) {
      console.error("[SmartBell] push subscription error", err);
      setError("Erro ao registrar notificações.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { token, isLoading, error, subscribe };
}


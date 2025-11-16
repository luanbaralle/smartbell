"use client";

import { useCallback, useEffect, useState } from "react";
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentPushSubscription,
  type PushSubscription
} from "@/lib/webpush";

export function usePushNotifications() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Check support on mount
  useEffect(() => {
    setIsSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window
    );
  }, []);

  // Load existing subscription on mount
  useEffect(() => {
    if (!isSupported) return;

    const loadSubscription = async () => {
      try {
        const current = await getCurrentPushSubscription();
        if (current) {
          setSubscription(current);
        }
      } catch (err) {
        console.error("[SmartBell] Load subscription error", err);
      }
    };

    loadSubscription();
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Dispositivo não suporta notificações push.");
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const pushSubscription = await subscribeToPushNotifications();

      if (!pushSubscription) {
        setError("Não foi possível obter subscription de notificações.");
        return null;
      }

      // Register subscription on server
      const response = await fetch("/api/push/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          endpoint: pushSubscription.endpoint,
          p256dh: pushSubscription.keys.p256dh,
          auth: pushSubscription.keys.auth
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao registrar subscription no servidor");
      }

      setSubscription(pushSubscription);
      return pushSubscription;
    } catch (err) {
      console.error("[SmartBell] Push subscription error", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao registrar notificações.";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;

    try {
      setIsLoading(true);
      setError(null);

      // Remove from server
      await fetch(`/api/push/register?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
        method: "DELETE"
      }).catch((err) => {
        console.warn("[SmartBell] Server unsubscribe error", err);
      });

      // Unsubscribe locally
      await unsubscribeFromPushNotifications();
      setSubscription(null);
      return true;
    } catch (err) {
      console.error("[SmartBell] Push unsubscribe error", err);
      setError("Erro ao cancelar notificações.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  return {
    subscription,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    isSupported,
    isSubscribed: subscription !== null
  };
}


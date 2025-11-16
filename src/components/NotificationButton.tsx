"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type NotificationButtonProps = {
  onSubscribed?: () => Promise<void> | void;
};

export function NotificationButton({ onSubscribed }: NotificationButtonProps) {
  const {
    subscribe,
    unsubscribe,
    isSubscribed,
    isLoading,
    error,
    isSupported
  } = usePushNotifications();
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setFeedback(error);
        const clearTimer = setTimeout(() => setFeedback(null), 5000);
        return () => clearTimeout(clearTimer);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleClick = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        setFeedback("Notificações desativadas");
        setTimeout(() => setFeedback(null), 3000);
      }
    } else {
      const result = await subscribe();
      if (result) {
        setFeedback("Notificações ativadas!");
        await onSubscribed?.();
        setTimeout(() => setFeedback(null), 3000);
      }
    }
  };

  if (!isSupported) {
    return (
      <div className="space-y-2">
        <Button disabled variant="outline">
          <Bell className="mr-2 h-4 w-4" />
          Notificações não suportadas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant={isSubscribed ? "default" : "outline"}
      >
        {isSubscribed ? (
          <>
            <Bell className="mr-2 h-4 w-4" />
            Notificações ativas
          </>
        ) : (
          <>
            <BellOff className="mr-2 h-4 w-4" />
            Ativar notificações
          </>
        )}
      </Button>
      {feedback && (
        <p className="text-xs text-slate-400 animate-in fade-in">{feedback}</p>
      )}
    </div>
  );
}


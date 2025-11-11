"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type NotificationButtonProps = {
  onToken?: (token: string) => Promise<void> | void;
};

export function NotificationButton({ onToken }: NotificationButtonProps) {
  const { subscribe, token, isLoading, error } = usePushNotifications();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleClick = async () => {
    const result = await subscribe();
    if (result) {
      setFeedback("Notificações ativadas!");
      await onToken?.(result);
    } else if (error) {
      setFeedback(error);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={isLoading || !!token}>
        <Bell className="mr-2 h-4 w-4" />
        {token ? "Notificações ativas" : "Ativar notificações"}
      </Button>
      {feedback && <p className="text-xs text-slate-400">{feedback}</p>}
    </div>
  );
}


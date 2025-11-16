"use client";

import React, { RefObject, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Mic } from "lucide-react";
import type { Message } from "@/types";
import { cn, formatDate } from "@/lib/utils";

type ChatWindowProps = {
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  isSending?: boolean;
  disabled?: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

function ChatWindowComponent({
  messages,
  onSendMessage,
  isSending = false,
  disabled = false,
  textareaRef
}: ChatWindowProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  // useImperativeHandle handles null/undefined refs gracefully
  useImperativeHandle(
    textareaRef,
    () => internalRef.current as HTMLTextAreaElement,
    []
  );

  async function handleSubmit() {
    if (!text.trim()) return;
    try {
      setError(null);
      await onSendMessage(text.trim());
      setText("");
    } catch (err) {
      console.error(err);
      setError("Não foi possível enviar a mensagem.");
    }
  }

  const handleSend = () => {
    handleSubmit();
  };

  // Memoize the messages list to prevent ScrollArea from re-rendering unnecessarily
  const messagesContent = useMemo(() => {
    if (messages.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Nenhuma mensagem ainda</p>
          <p className="text-xs mt-1">Envie uma mensagem para iniciar a conversa</p>
        </div>
      );
    }
    return messages.map((message) => {
                const isVisitor = !message.sender;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      isVisitor ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2 space-y-2",
                        isVisitor
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.content && (
                        <p className="text-sm">{message.content}</p>
                      )}
                      {message.audio_url && (
                        <audio controls className="w-full">
                          <source src={message.audio_url} type="audio/webm" />
                          Seu navegador não suporta áudio embutido.
                        </audio>
                      )}
                      <p className="text-xs opacity-70 mt-1">
                        {formatDate(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              });
  }, [messages]);

  return (
    <Card className="flex flex-col h-[500px] shadow-lg">
      <CardHeader className="bg-gradient-card border-b">
        <CardTitle className="text-lg">Mensagens</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messagesContent}
          </div>
        </div>
        
        <div className="p-4 border-t bg-card">
          {error && (
            <div className="mb-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button 
              size="icon" 
              variant="outline"
              className="shrink-0"
              disabled={disabled}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite sua mensagem..."
              className="flex-1"
              disabled={disabled || isSending}
              ref={internalRef as any}
            />
            <Button 
              size="icon"
              onClick={handleSend}
              className="shrink-0 bg-gradient-primary"
              disabled={disabled || isSending || !text.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Memoize ChatWindow to prevent unnecessary re-renders that cause ScrollArea ref issues
// Use shallow comparison - only re-render if messages array reference changes
export const ChatWindow = React.memo(ChatWindowComponent);

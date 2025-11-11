"use client";

import { RefObject, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Message } from "@/types";
import { cn, formatDate } from "@/lib/utils";

type ChatWindowProps = {
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  isSending?: boolean;
  disabled?: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement>;
};

export function ChatWindow({
  messages,
  onSendMessage,
  isSending = false,
  disabled = false,
  textareaRef
}: ChatWindowProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

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

  return (
    <div className="flex h-full min-h-[320px] flex-col gap-4">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-md border border-slate-800 bg-slate-900/40 p-3">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhuma mensagem enviada ainda.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex flex-col gap-1 rounded-md border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-100 shadow",
              message.audio_url && "space-y-2"
            )}
          >
            {message.content && <p>{message.content}</p>}
            {message.audio_url && (
              <audio controls className="w-full">
                <source src={message.audio_url} type="audio/webm" />
                Seu navegador não suporta áudio embutido.
              </audio>
            )}
            <span className="text-xs text-slate-500">
              {formatDate(message.created_at)}
            </span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Textarea
          placeholder="Escreva uma mensagem..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={disabled || isSending}
          ref={internalRef}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            Pressione Enter para enviar.
          </span>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || isSending}
          >
            Enviar
          </Button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Mic } from "lucide-react";
import { useState } from "react";

interface Message {
  id: string;
  content: string;
  sender: "visitor" | "resident";
  timestamp: Date;
}

interface ChatWindowProps {
  messages?: Message[];
  onSendMessage?: (message: string) => void;
}

export function ChatWindow({ messages = [], onSendMessage }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  return (
    <Card className="flex flex-col h-[500px] shadow-lg">
      <CardHeader className="bg-gradient-card border-b">
        <CardTitle className="text-lg">Mensagens</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhuma mensagem ainda</p>
                <p className="text-xs mt-1">Envie uma mensagem para iniciar a conversa</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === "visitor" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.sender === "visitor"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t bg-card">
          <div className="flex gap-2">
            <Button 
              size="icon" 
              variant="outline"
              className="shrink-0"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Digite sua mensagem..."
              className="flex-1"
            />
            <Button 
              size="icon"
              onClick={handleSend}
              className="shrink-0 bg-gradient-primary"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

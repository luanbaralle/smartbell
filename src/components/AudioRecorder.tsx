"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type AudioRecorderProps = {
  onSave: (blob: Blob) => Promise<void>;
  disabled?: boolean;
};

export function AudioRecorder({ onSave, disabled = false }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
    };
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm"
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        await onSave(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Não foi possível acessar o microfone.");
    }
  }

  async function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
          variant={isRecording ? "outline" : "default"}
        >
          {isRecording ? "Parar gravação" : "Gravar áudio"}
        </Button>
        {isRecording && <span className="text-sm text-red-400">Gravando...</span>}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}


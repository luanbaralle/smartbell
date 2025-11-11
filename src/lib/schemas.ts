import { z } from "zod";

export const createCallSchema = z.object({
  houseId: z.string().uuid(),
  type: z.enum(["text", "audio", "video"]),
  sessionId: z.string().optional(),
  visitorName: z.string().max(120).optional()
});

export const createMessageSchema = z
  .object({
    callId: z.string().uuid(),
    sender: z.string().uuid().optional(),
    content: z.string().trim().min(1).max(500).optional(),
    audioUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional()
  })
  .superRefine((data, ctx) => {
    if (!data.content && !data.audioUrl && !data.videoUrl) {
      ctx.addIssue({
        code: "custom",
        message: "Mensagem precisa de texto, áudio ou vídeo."
      });
    }
  });


import { Buffer } from "node:buffer";

import { supabaseAdminClient } from "@/lib/supabaseAdmin";

export async function uploadAudioBlob({
  houseId,
  blob,
  filename
}: {
  houseId: string;
  blob: Blob;
  filename: string;
}) {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const path = `${houseId}/${filename}`;

  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client não configurado.");
  }

  const { data, error } = await supabaseAdminClient.storage
    .from("audio-messages")
    .upload(path, buffer, {
      contentType: blob.type,
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    console.error("[SmartBell] audio upload failed", error);
    throw new Error("Erro ao enviar mensagem de áudio.");
  }

  const { data: publicUrl } = supabaseAdminClient.storage
    .from("audio-messages")
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}

export async function uploadVideoBlob({
  houseId,
  blob,
  filename
}: {
  houseId: string;
  blob: Blob;
  filename: string;
}) {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const path = `${houseId}/${filename}`;

  if (!supabaseAdminClient) {
    throw new Error("Supabase admin client não configurado.");
  }

  const { data, error } = await supabaseAdminClient.storage
    .from("video-messages")
    .upload(path, buffer, {
      contentType: blob.type,
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    console.error("[SmartBell] video upload failed", error);
    throw new Error("Erro ao enviar vídeo.");
  }

  const { data: publicUrl } = supabaseAdminClient.storage
    .from("video-messages")
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}


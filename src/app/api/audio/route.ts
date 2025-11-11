import { NextResponse } from "next/server";

import { uploadAudioBlob } from "@/lib/storage";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const houseId = formData.get("houseId");

  if (!(file instanceof Blob) || typeof houseId !== "string") {
    return NextResponse.json(
      { message: "Dados inválidos para upload de áudio." },
      { status: 400 }
    );
  }

  try {
    const url = await uploadAudioBlob({
      houseId,
      blob: file,
      filename: `${Date.now()}-${file.name || "audio.webm"}`
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[SmartBell] audio upload error", error);
    return NextResponse.json(
      { message: "Erro ao fazer upload do áudio." },
      { status: 500 }
    );
  }
}


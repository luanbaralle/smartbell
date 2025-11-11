export const canUseMediaRecorder = () =>
  typeof window !== "undefined" && "MediaRecorder" in window;

export async function requestMicrophonePermission() {
  if (typeof navigator === "undefined") return null;
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    console.error("[SmartBell] Microphone permission denied", error);
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}


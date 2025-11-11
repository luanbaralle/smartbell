"use client";

import dynamic from "next/dynamic";

const QRCode = dynamic(async () => (await import("qrcode.react")).QRCodeSVG, {
  ssr: false,
  loading: () => <div className="h-40 w-40 animate-pulse rounded-xl bg-slate-800" />
});

type QRDisplayProps = {
  value: string;
  label?: string;
};

export function QRDisplay({ value, label }: QRDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <QRCode value={value} size={160} />
      </div>
      {label && (
        <span className="text-sm font-medium text-slate-300">{label}</span>
      )}
    </div>
  );
}


import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, type Messaging } from "firebase/messaging";
import { env } from "@/lib/env";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let firebaseApp: FirebaseApp | undefined;

export const getFirebaseApp = () => {
  if (!firebaseApp) {
    if (getApps().length) {
      firebaseApp = getApps()[0];
    } else {
      firebaseApp = initializeApp(firebaseConfig);
    }
  }
  return firebaseApp;
};

export const getFirebaseMessaging = (): Messaging | null => {
  if (typeof window === "undefined" || !firebaseConfig.apiKey) return null;
  try {
    const app = getFirebaseApp();
    return getMessaging(app);
  } catch (error) {
    console.error("[SmartBell] Failed to initialize Firebase messaging", error);
    return null;
  }
};

type PushMessageInput = {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
};

export async function sendPushNotification({
  tokens,
  title,
  body,
  data
}: PushMessageInput) {
  if (!tokens.length) return;
  const serverKey = env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.warn("[SmartBell] FCM server key não configurado.");
    return;
  }

  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${serverKey}`
    },
    body: JSON.stringify({
      registration_ids: tokens,
      notification: {
        title,
        body
      },
      data
    })
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[SmartBell] FCM send error", text);
    throw new Error("Falha ao enviar notificação push.");
  }
}


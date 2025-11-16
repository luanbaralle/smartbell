/**
 * Server-side Web Push utilities using VAPID
 * This requires the 'web-push' npm package
 */

import { env } from "@/lib/env";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: {
    call_id?: string;
    house_id?: string;
    type?: "call" | "chat" | "audio" | "video";
    url?: string;
    [key: string]: string | undefined;
  };
  icon?: string;
  badge?: string;
}

/**
 * Send push notification to a single subscription
 * Uses web-push library (must be installed: npm install web-push)
 */
async function sendWebPushNotification(
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    // Dynamic import of web-push (only if available)
    const webpush = await import("web-push").catch(() => null) as any;
    
    if (!webpush) {
      console.warn("[SmartBell] web-push library not installed. Install with: npm install web-push");
      return false;
    }

    const vapidPublicKey = env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn("[SmartBell] VAPID keys not configured");
      return false;
    }

    // Set VAPID details
    webpush.setVapidDetails(
      `mailto:${env.NEXT_PUBLIC_APP_URL || "noreply@smartbell.app"}`,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Convert keys from base64 to base64url format (web-push expects base64url)
    // The keys come from the frontend as base64, we need to convert to base64url
    const p256dhBuffer = Buffer.from(subscription.keys.p256dh, "base64");
    const authBuffer = Buffer.from(subscription.keys.auth, "base64");

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: p256dhBuffer.toString("base64url"),
        auth: authBuffer.toString("base64url")
      }
    };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192.png",
      badge: payload.badge || "/icons/icon-192.png",
      data: payload.data || {},
      vibrate: [200, 100, 200],
      tag: payload.data?.call_id || "default",
      requireInteraction: payload.data?.type === "call"
    });

    await webpush.sendNotification(pushSubscription, notificationPayload);
    return true;
  } catch (error: any) {
    // Handle expired/invalid subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.warn("[SmartBell] Push subscription expired or invalid", subscription.endpoint);
      // Optionally delete expired subscription from database
      if (supabaseAdminClient) {
        await supabaseAdminClient
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      }
    } else {
      console.error("[SmartBell] Web push send error", error);
    }
    return false;
  }
}

/**
 * Send push notification to all subscriptions of a user
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<number> {
  if (!supabaseAdminClient) {
    console.warn("[SmartBell] Supabase admin client not configured");
    return 0;
  }

  const { data: subscriptions, error } = await supabaseAdminClient
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return 0;
  }

  let successCount = 0;
  const promises = subscriptions.map(async (sub) => {
    const subData = sub as any;
    const success = await sendWebPushNotification(
      {
        endpoint: subData.endpoint,
        keys: {
          p256dh: subData.p256dh,
          auth: subData.auth
        }
      },
      payload
    );
    if (success) successCount++;
  });

  await Promise.allSettled(promises);
  return successCount;
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<number> {
  let totalSent = 0;
  for (const userId of userIds) {
    const sent = await sendPushToUser(userId, payload);
    totalSent += sent;
  }
  return totalSent;
}


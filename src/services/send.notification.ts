import webpush from "./push.service";
import { prisma } from "../prisma";

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  url?: string;
  sound?: string;
  vibrate?: number[];
}

export const sendNotification = async (
  userIds: string[],
  notificationData: NotificationPayload | string
) => {
  if (!userIds.length) return;

  // Remove duplicates
  const uniqueUserIds = [...new Set(userIds)];

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId: {
        in: uniqueUserIds,
      },
    },
  });

  if (!subscriptions.length) return;

  // Convert to proper notification object if string is passed
  let payload: NotificationPayload;
  
  if (typeof notificationData === "string") {
    // Try to parse as JSON first (for backward compatibility with existing calls)
    try {
      const parsed = JSON.parse(notificationData);
      if (typeof parsed === "object" && parsed.title && parsed.body) {
        payload = parsed;
      } else {
        // If parsed but not a valid notification object, treat as plain text body
        payload = {
          title: "Ride NITT",
          body: notificationData,
        };
      }
    } catch {
      // If not JSON, treat as plain text body
      payload = {
        title: "Ride NITT",
        body: notificationData,
      };
    }
  } else {
    payload = notificationData;
  }

  // Set defaults and proper paths for icons
  const finalPayload = {
    title: payload.title || "Ride NITT",
    body: payload.body,
    icon: payload.icon || "/icons/logo.png",
    badge: payload.badge || "/icons/logo.png",
    tag: payload.tag || "ride-nitt-notification",
    requireInteraction: payload.requireInteraction ?? false,
    url: payload.url || "/",
    vibrate: payload.vibrate || [200, 100, 200],
  } as any;

  // Only add sound if explicitly provided
  if (payload.sound) {
    finalPayload.sound = payload.sound;
  }

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        if (sub.endpoint.startsWith("ExponentPushToken") || sub.endpoint.startsWith("ExpoPushToken")) {
          // Route to Expo Push Notifications API
          const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Accept-encoding": "gzip, deflate",
            },
            body: JSON.stringify({
              to: sub.endpoint,
              title: finalPayload.title,
              body: finalPayload.body,
              data: { url: finalPayload.url },
              sound: "default",
            }),
          });

          if (!response.ok) {
            const errResult = await response.json().catch(() => ({}));
            console.error("Expo push notification failed response:", errResult);
          }
        } else {
          // Standard web push
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify(finalPayload)
          );
        }
      } catch (err: any) {
        // Clean up invalid subscriptions for web push
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          });
        } else {
          console.error("Push error:", err);
        }
      }
    })
  );
};
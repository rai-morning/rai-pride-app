import { auth } from "@/lib/firebase";
import { getMessaging, getToken, isSupported, Messaging } from "firebase/messaging";
import app from "@/lib/firebase";

let messagingInstance: Messaging | null = null;
let pushInitialized = false;

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("User is not authenticated");
  return user.getIdToken();
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  if (!(await isSupported())) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function initPushNotifications(): Promise<void> {
  if (pushInitialized) return;
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (!("serviceWorker" in navigator)) return;

  const messaging = await getMessagingInstance();
  if (!messaging) return;

  if (Notification.permission !== "granted") return;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return;

  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) return;

  const idToken = await getIdToken();
  const res = await fetch("/api/push/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`push token registration failed: ${res.status} ${detail}`);
  }
  pushInitialized = true;
}

export async function getPushDebugState(): Promise<{
  notificationSupported: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  serviceWorkerSupported: boolean;
  serviceWorkerReady: boolean;
  messagingSupported: boolean;
  vapidConfigured: boolean;
  runningStandalone: boolean;
  appBadgeApiSupported: boolean;
}> {
  const notificationSupported = typeof window !== "undefined" && "Notification" in window;
  const notificationPermission = notificationSupported ? Notification.permission : "unsupported";
  const serviceWorkerSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const serviceWorkerReady = serviceWorkerSupported
    ? !!(await navigator.serviceWorker.ready.catch(() => null))
    : false;
  const messagingSupported = await isSupported().catch(() => false);
  const vapidConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
  const runningStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const appBadgeApiSupported =
    typeof navigator !== "undefined" &&
    ("setAppBadge" in navigator || "clearAppBadge" in navigator);

  return {
    notificationSupported,
    notificationPermission,
    serviceWorkerSupported,
    serviceWorkerReady,
    messagingSupported,
    vapidConfigured,
    runningStandalone,
    appBadgeApiSupported,
  };
}

export async function sendPushToUser(params: {
  toUserId: string;
  type: "like" | "album_request" | "dm";
  senderName?: string;
  message?: string;
  badgeCount?: number;
}): Promise<void> {
  const idToken = await getIdToken();
  const res = await fetch("/api/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`push send failed: ${res.status} ${detail}`);
  }
}

"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { initPushNotifications } from "@/lib/push";

export default function PWASetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      initPushNotifications().catch((err) => {
        console.warn("[PWASetup] push init failed:", err);
      });
    });
    return () => unsub();
  }, []);

  return null;
}

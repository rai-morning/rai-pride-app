"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPushDebugState, initPushNotifications } from "@/lib/push";

export default function NotificationsSettingsPage() {
  const router = useRouter();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [requesting, setRequesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [debugInfo, setDebugInfo] = useState<{
    notificationSupported: boolean;
    notificationPermission: NotificationPermission | "unsupported";
    serviceWorkerSupported: boolean;
    serviceWorkerReady: boolean;
    messagingSupported: boolean;
    vapidConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    getPushDebugState()
      .then((info) => setDebugInfo(info))
      .catch(() => setDebugInfo(null));
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      alert("このブラウザは通知に対応していません");
      return;
    }
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        await initPushNotifications();
        setStatusMessage("通知を有効化しました");
        const info = await getPushDebugState().catch(() => null);
        if (info) setDebugInfo(info);
      } else {
        setStatusMessage("通知が許可されていません");
      }
    } catch (err) {
      setStatusMessage(`設定に失敗: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition" aria-label="戻る">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-[#00f5ff] neon-text-cyan">通知設定</h1>
      </header>
      <div className="w-full max-w-[480px] mx-auto px-4 py-6 space-y-3">
        <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl p-4">
          <p className="text-sm text-white font-medium mb-1">プッシュ通知</p>
          <p className="text-xs text-[#8888aa] mb-3">
            PWAインストール後、通知を許可するとアイコンバッジ表示に対応します。
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#9aa7b1]">
              現在:{" "}
              <span className="text-white">
                {permission === "granted" ? "許可" : permission === "denied" ? "拒否" : "未設定"}
              </span>
            </p>
            <button
              type="button"
              onClick={requestPermission}
              disabled={requesting || permission === "granted"}
              className="h-9 px-4 rounded-lg text-xs font-medium border border-[#00f5ff]/40 text-[#00f5ff] bg-[#00f5ff]/10 disabled:opacity-50"
            >
              {requesting ? "確認中..." : permission === "granted" ? "許可済み" : "通知を許可"}
            </button>
          </div>
          {statusMessage && (
            <p className="text-[11px] text-[#9aa7b1] mt-2 break-words">{statusMessage}</p>
          )}
        </div>

        <div className="bg-[#12121f] border border-[#00f5ff]/25 rounded-xl p-4">
          <p className="text-sm text-white font-medium mb-2">通知ステータス</p>
          <div className="space-y-1.5 text-[11px] text-[#9aa7b1]">
            <p>通知API対応: {debugInfo?.notificationSupported ? "OK" : "NG"}</p>
            <p>通知許可: {debugInfo ? String(debugInfo.notificationPermission) : "-"}</p>
            <p>Service Worker対応: {debugInfo?.serviceWorkerSupported ? "OK" : "NG"}</p>
            <p>Service Worker準備完了: {debugInfo?.serviceWorkerReady ? "OK" : "NG"}</p>
            <p>Firebase Messaging対応: {debugInfo?.messagingSupported ? "OK" : "NG"}</p>
            <p>VAPIDキー設定: {debugInfo?.vapidConfigured ? "OK" : "NG"}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

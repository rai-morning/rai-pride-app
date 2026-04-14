"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initPushNotifications } from "@/lib/push";

export default function NotificationsSettingsPage() {
  const router = useRouter();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
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
      }
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
        </div>
      </div>
    </main>
  );
}

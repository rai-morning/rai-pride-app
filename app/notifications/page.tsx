"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getLikesReceived, getLikesSent, Like } from "@/lib/likes";
import { getProfileViewers, ProfileView } from "@/lib/profileViews";
import { markAllRead } from "@/lib/notifications";
import { isOnline } from "@/lib/online";
import { Timestamp } from "firebase/firestore";
import BottomNav from "@/components/BottomNav";
import HamburgerMenuButton from "@/components/HamburgerMenuButton";

type Tab = "received" | "sent" | "views";

type UserCard = {
  uid: string;
  name: string;
  age: number;
  images: string[];
  online: boolean;
  timestamp: Timestamp | null;
};

function formatTime(ts: Timestamp | null): string {
  if (!ts) return "";
  const d = ts.toDate();
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}時間前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function enrichUser(uid: string, ts: Timestamp | null): Promise<UserCard | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid,
      name: data.name ?? "Unknown",
      age: data.age ?? 0,
      images: data.images ?? [],
      online: isOnline(data.lastOnline),
      timestamp: ts,
    };
  } catch {
    return null;
  }
}

function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authLoading, setAuthLoading] = useState(true);
  const [myUid, setMyUid] = useState("");
  const initialTab = (searchParams.get("tab") as Tab) ?? "received";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const [receivedCards, setReceivedCards] = useState<UserCard[]>([]);
  const [sentCards, setSentCards] = useState<UserCard[]>([]);
  const [viewCards, setViewCards] = useState<UserCard[]>([]);

  const [loadingReceived, setLoadingReceived] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);
  const [loadingViews, setLoadingViews] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.replace("/auth/login"); return; }
      setMyUid(u.uid);
      setAuthLoading(false);
      // ページを開いたら通知を既読にする
      markAllRead(u.uid);
      loadReceived(u.uid);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // タブ切り替え時にデータをロード
  useEffect(() => {
    if (!myUid) return;
    if (activeTab === "sent" && sentCards.length === 0 && !loadingSent) loadSent(myUid);
    if (activeTab === "views" && viewCards.length === 0 && !loadingViews) loadViews(myUid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, myUid]);

  const loadReceived = async (uid: string) => {
    setLoadingReceived(true);
    try {
      const likes = await getLikesReceived(uid);
      const cards = await Promise.all(likes.map((l) => enrichUser(l.fromUserId, l.createdAt)));
      setReceivedCards(cards.filter((c): c is UserCard => c !== null));
    } finally {
      setLoadingReceived(false);
    }
  };

  const loadSent = async (uid: string) => {
    setLoadingSent(true);
    try {
      const likes = await getLikesSent(uid);
      const cards = await Promise.all(likes.map((l) => enrichUser(l.toUserId, l.createdAt)));
      setSentCards(cards.filter((c): c is UserCard => c !== null));
    } finally {
      setLoadingSent(false);
    }
  };

  const loadViews = async (uid: string) => {
    setLoadingViews(true);
    try {
      const views = await getProfileViewers(uid);
      const cards = await Promise.all(
        views.map((v: ProfileView) => enrichUser(v.viewerId, v.viewedAt))
      );
      setViewCards(cards.filter((c): c is UserCard => c !== null));
    } finally {
      setLoadingViews(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-4 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "received", label: "いいね受信", count: receivedCards.length },
    { key: "sent",     label: "いいね送信", count: sentCards.length },
    { key: "views",    label: "足跡",       count: viewCards.length },
  ];

  const isLoading =
    (activeTab === "received" && loadingReceived) ||
    (activeTab === "sent" && loadingSent) ||
    (activeTab === "views" && loadingViews);

  const currentCards =
    activeTab === "received" ? receivedCards :
    activeTab === "sent" ? sentCards : viewCards;

  const emptyMessages: Record<Tab, { title: string; sub: string }> = {
    received: { title: "まだいいねがありません", sub: "プロフィールを充実させてみましょう" },
    sent:     { title: "まだいいねを送っていません", sub: "気になるユーザーにいいねを送ってみましょう" },
    views:    { title: "まだ誰も見ていません", sub: "あなたのプロフィールが閲覧されると表示されます" },
  };

  return (
    <>
      <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col pb-16">
        {/* ヘッダー */}
        <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center shrink-0">
          <h1 className="text-base font-bold text-[#00f5ff] neon-text-cyan flex-1">通知</h1>
          <HamburgerMenuButton />
        </header>

        {/* タブ */}
        <div className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 flex gap-1 shrink-0">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-3 text-xs font-medium transition-all relative ${
                activeTab === key
                  ? "text-[#ff2d78]"
                  : "text-[#8888aa] hover:text-white"
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                {label}
                {count !== undefined && count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    activeTab === key
                      ? "bg-[#ff2d78]/20 text-[#ff2d78]"
                      : "bg-[#8888aa]/20 text-[#8888aa]"
                  }`}>
                    {count}
                  </span>
                )}
              </span>
              {activeTab === key && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-[#ffe45e] to-[#ffb800] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 px-4 py-4 w-full max-w-[480px] mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : currentCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-[#12121f] border border-[#ff2d78]/20 rounded-full flex items-center justify-center mb-4">
                {activeTab === "views" ? (
                  <svg className="w-8 h-8 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
              </div>
              <p className="text-white font-medium mb-1">{emptyMessages[activeTab].title}</p>
              <p className="text-[#8888aa] text-sm">{emptyMessages[activeTab].sub}</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#ff2d78]/10 bg-[#12121f] border border-[#ff2d78]/20 rounded-2xl overflow-hidden">
              {currentCards.map((card) => (
                <li key={card.uid}>
                  <button
                    onClick={() => router.push(`/profile/${card.uid}`)}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#1a1a2e] active:bg-[#1f1f34] transition text-left"
                  >
                    {/* 小さい正方形のメイン画像 */}
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#0d0d1a] border border-[#ff2d78]/20 shrink-0">
                      {card.images[0] ? (
                        <Image src={card.images[0]} alt={card.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-6 h-6 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{card.name}</p>
                          {card.online && <span className="shrink-0 text-[10px] text-green-400 font-medium">●</span>}
                        </div>
                        <span className="text-[#8888aa] text-[10px] shrink-0">{formatTime(card.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[#8888aa] text-xs">{card.age}歳</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#ff2d78]/30 text-[#ff2d78]">
                          {activeTab === "received" ? "いいね受信" : activeTab === "sent" ? "いいね送信" : "閲覧"}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  );
}

// useSearchParams を Suspense でラップしてエクスポート
export default function NotificationsPageWrapper() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-4 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <NotificationsPage />
    </Suspense>
  );
}

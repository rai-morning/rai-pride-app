"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { subscribeConversations, Conversation } from "@/lib/conversations";

type ConvWithUser = Conversation & {
  otherName: string;
  otherImage: string;
  otherUid: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [conversations, setConversations] = useState<ConvWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/auth/login");
      } else {
        setUser(currentUser);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const unsub = subscribeConversations(user.uid, async (convs) => {
      const enriched = await Promise.all(
        convs.map(async (conv) => {
          const otherUid = conv.participants.find((id) => id !== user.uid) ?? "";
          let otherName = "Unknown";
          let otherImage = "";
          if (otherUid) {
            const snap = await getDoc(doc(db, "users", otherUid));
            if (snap.exists()) {
              const data = snap.data();
              otherName = data.name ?? "Unknown";
              otherImage = data.images?.[0] ?? "";
            }
          }
          return { ...conv, otherName, otherImage, otherUid };
        })
      );
      setConversations(enriched);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  function formatTime(ts: Conversation["lastMessageAt"]): string {
    if (!ts) return "";
    const date = ts.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "今";
    if (diffMin < 60) return `${diffMin}分前`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}時間前`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}日前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white flex flex-col">
      {/* ヘッダー */}
      <header className="bg-[#1a1f2e] border-b border-gray-700 px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-700 transition"
            aria-label="戻る"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-white">メッセージ</h1>
        </div>
      </header>

      {/* ボディ */}
      <div className="flex-1 w-full max-w-[480px] mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-300 font-medium mb-1">メッセージがありません</p>
            <p className="text-gray-500 text-sm">近くのユーザーにメッセージを送ってみましょう</p>
            <button
              onClick={() => router.push("/home")}
              className="mt-5 h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
            >
              ユーザーを探す
            </button>
          </div>
        ) : (
          <ul>
            {conversations.map((conv) => {
              const unread = conv.unreadCount[user?.uid ?? ""] ?? 0;
              return (
                <li key={conv.id}>
                  <button
                    onClick={() => router.push(`/messages/${conv.otherUid}`)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#1a1f2e] active:bg-[#1f2535] transition border-b border-gray-800"
                  >
                    {/* アバター */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#252b3b] border border-gray-700 shrink-0">
                      {conv.otherImage ? (
                        <Image
                          src={conv.otherImage}
                          alt={conv.otherName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* テキスト */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm font-semibold truncate ${unread > 0 ? "text-white" : "text-gray-200"}`}>
                          {conv.otherName}
                        </span>
                        <span className="text-gray-500 text-xs shrink-0 ml-2">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs truncate ${unread > 0 ? "text-gray-200 font-medium" : "text-gray-500"}`}>
                          {conv.lastMessage || "メッセージはありません"}
                        </span>
                        {unread > 0 && (
                          <span className="ml-2 shrink-0 min-w-[20px] h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

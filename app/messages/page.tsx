"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { subscribeConversations, Conversation } from "@/lib/conversations";
import HamburgerMenuButton from "@/components/HamburgerMenuButton";

type ConvWithUser = Conversation & {
  otherName: string;
  otherImage: string;
  otherUid: string;
};

function highlight(text: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const escapedQuery = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "ig");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark key={`${part}-${i}`} className="bg-[#00f5ff]/25 text-[#00f5ff] rounded px-0.5">
        {part}
      </mark>
    ) : (
      <React.Fragment key={`${part}-${i}`}>{part}</React.Fragment>
    )
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [conversations, setConversations] = useState<ConvWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
    const unsub = subscribeConversations(
      user.uid,
      async (convs) => {
        try {
          const enriched = await Promise.all(
            convs.map(async (conv) => {
              const otherUid = conv.participants.find((id) => id !== user.uid) ?? "";
              let otherName = "Unknown";
              let otherImage = "";
              if (otherUid) {
                try {
                  const snap = await getDoc(doc(db, "users", otherUid));
                  if (snap.exists()) {
                    const data = snap.data();
                    otherName = data.name ?? "Unknown";
                    otherImage = data.images?.[0] ?? "";
                  }
                } catch {
                  // 相手プロフィール読込失敗時は会話だけ表示
                }
              }
              return { ...conv, otherName, otherImage, otherUid };
            })
          );
          setConversations(enriched);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setConversations([]);
        setLoading(false);
      }
    );
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

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((conv) => {
        const q = searchQuery.toLowerCase();
        return (
          conv.otherName.toLowerCase().includes(q) ||
          (conv.lastMessage ?? "").toLowerCase().includes(q)
        );
      })
    : conversations;

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-4 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <>
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col pb-16">
      {/* ヘッダー */}
      <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition" aria-label="戻る">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-[#00f5ff] neon-text-cyan">メッセージ</h1>
        </div>
        <HamburgerMenuButton />
      </header>

      {/* 検索欄 */}
      {!loading && (
        <div className="bg-[#12121f] px-4 py-2.5 border-b border-[#00f5ff]/30 w-full max-w-[480px] mx-auto self-center">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00f5ff] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="名前・メッセージを検索..."
              className="w-full bg-[#12121f] text-white text-sm border border-[#00f5ff] rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:border-[#00f5ff] focus:ring-2 focus:ring-[#00f5ff]/20 placeholder-[#9aa7b1] transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-[#00f5ff]/20 hover:bg-[#00f5ff]/35 transition" aria-label="検索クリア">
                <svg className="w-3 h-3 text-[#00f5ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ボディ */}
      <div className="flex-1 w-full max-w-[480px] mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-[#12121f] border border-[#ff2d78]/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-white font-medium mb-1">メッセージがありません</p>
            <p className="text-[#8888aa] text-sm">近くのユーザーにメッセージを送ってみましょう</p>
            <button onClick={() => router.push("/home")}
              className="mt-5 h-10 px-6 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] hover:opacity-90 text-white text-sm font-medium rounded-xl transition">
              ユーザーを探す
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-14 h-14 bg-[#12121f] border border-[#ff2d78]/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
            </div>
            <p className="text-white font-medium mb-1">該当するメッセージが見つかりません</p>
            <p className="text-[#8888aa] text-sm">「<span className="text-white">{searchQuery}</span>」に一致する結果がありません</p>
            <button onClick={() => setSearchQuery("")}
              className="mt-5 h-9 px-5 bg-[#12121f] border border-[#ff2d78]/20 hover:border-[#ff2d78]/50 text-[#8888aa] text-sm font-medium rounded-xl transition">
              検索をクリア
            </button>
          </div>
        ) : (
          <ul>
            {filteredConversations.map((conv) => {
              const unread = conv.unreadCount[user?.uid ?? ""] ?? 0;
              const lastMsg = conv.lastMessage || "メッセージはありません";
              return (
                <li key={conv.id}>
                  <button onClick={() => router.push(`/messages/${conv.otherUid}`)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#12121f] active:bg-[#1a1a2e] transition border-b border-[#ff2d78]/10">
                    {/* アバター */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#12121f] border border-[#ff2d78]/20 shrink-0">
                      {conv.otherImage ? (
                        <Image src={conv.otherImage} alt={conv.otherName} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-6 h-6 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* テキスト */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm font-semibold truncate ${unread > 0 ? "text-white" : "text-gray-200"}`}>
                          {highlight(conv.otherName, searchQuery)}
                        </span>
                        <span className="text-[#8888aa] text-xs shrink-0 ml-2">{formatTime(conv.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs truncate ${unread > 0 ? "text-gray-200 font-medium" : "text-[#8888aa]"}`}>
                          {highlight(lastMsg, searchQuery)}
                        </span>
                        {unread > 0 && (
                          <span className="ml-2 shrink-0 min-w-[20px] h-5 bg-[#ff2d78] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
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
    </>
  );
}

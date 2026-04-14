"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  getOrCreateConversation,
  subscribeMessages,
  sendMessage,
  markAsRead,
  Message,
} from "@/lib/conversations";
import { getBlockedUsers } from "@/lib/block";
import HamburgerMenuButton from "@/components/HamburgerMenuButton";

type OtherUser = {
  name: string;
  image: string;
};

export default function ChatPage() {
  const params = useParams();
  const otherUid = params.userId as string;
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    (async () => {
      const [snap, blockedList] = await Promise.all([
        getDoc(doc(db, "users", otherUid)),
        getBlockedUsers(user.uid),
      ]);
      if (snap.exists()) {
        const data = snap.data();
        setOtherUser({ name: data.name ?? "Unknown", image: data.images?.[0] ?? "" });
      }
      setIsBlocked(blockedList.includes(otherUid));
      const convId = await getOrCreateConversation(user.uid, otherUid);
      setConversationId(convId);
      await markAsRead(convId, user.uid);
    })();
  }, [user, otherUid]);

  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribeMessages(conversationId, (msgs) => {
      setMessages(isBlocked ? msgs.filter((m) => m.senderId !== otherUid) : msgs);
    });
    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversationId || !user) return;
    markAsRead(conversationId, user.uid);
  }, [conversationId, user, messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !conversationId || !user) return;
    const msg = text.trim();
    setText("");
    setSending(true);
    try {
      await sendMessage(conversationId, user.uid, { text: msg }, otherUid);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const uploadChatImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "uibxdch7");
    const response = await fetch("https://api.cloudinary.com/v1_1/dcp0seihk/image/upload", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("画像アップロードに失敗しました");
    const data = await response.json();
    return data.secure_url as string;
  };

  const handlePickImage = () => {
    if (isBlocked || sending || sendingImage) return;
    imageInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !conversationId || !user || isBlocked) return;
    setSendingImage(true);
    try {
      const imageUrl = await uploadChatImage(file);
      await sendMessage(conversationId, user.uid, { imageUrl }, otherUid);
    } catch (err) {
      console.error("画像送信失敗:", err);
      alert("画像の送信に失敗しました");
    } finally {
      setSendingImage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend();
  };

  function formatTime(ts: Message["createdAt"]): string {
    if (!ts) return "";
    const d = ts.toDate();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-4 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="h-dvh bg-[#0a0a0f] text-white flex flex-col">

      {/* ヘッダー */}
      <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition shrink-0" aria-label="戻る">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-[#12121f] border border-[#ff2d78]/20 shrink-0">
            {otherUser?.image ? (
              <Image src={otherUser.image} alt={otherUser.name} fill className="object-cover" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
          <span className="text-white font-semibold text-sm truncate">{otherUser?.name ?? "..."}</span>
        </div>

        <button onClick={() => router.push(`/profile/${otherUid}`)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition shrink-0" aria-label="プロフィールを見る">
          <svg className="w-5 h-5 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
        <HamburgerMenuButton />
      </header>

      {/* ブロック済みバナー */}
      {isBlocked && (
        <div className="bg-red-900/20 border-b border-red-800/50 px-4 py-2 flex items-center gap-2 shrink-0">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <p className="text-red-400 text-xs">このユーザーをブロックしています。メッセージの送受信ができません。</p>
        </div>
      )}

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <p className="text-[#8888aa] text-sm">まだメッセージがありません</p>
            {!isBlocked && <p className="text-[#8888aa]/60 text-xs mt-1">最初のメッセージを送ってみましょう</p>}
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.senderId === user?.uid;
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const showTime =
            !prevMsg || !prevMsg.createdAt || !msg.createdAt ||
            msg.createdAt.toDate().getTime() - prevMsg.createdAt.toDate().getTime() > 5 * 60 * 1000;

          return (
            <div key={msg.id}>
              {showTime && msg.createdAt && (
                <div className="flex justify-center my-3">
                  <span className="text-[#8888aa] text-[10px] bg-[#0a0a0f] border border-[#ff2d78]/10 px-2 py-0.5 rounded-full">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {!isMe && (
                  <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#12121f] border border-[#ff2d78]/20 shrink-0 mb-0.5">
                    {otherUser?.image ? (
                      <Image src={otherUser.image} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                  isMe
                    ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] text-white rounded-br-sm"
                    : "bg-[#12121f] text-gray-100 rounded-bl-sm border border-[#ff2d78]/20"
                }`}>
                  {msg.isDeleted ? (
                    <span className="italic text-gray-400">このメッセージは削除されました</span>
                  ) : (
                    <div className="space-y-2">
                      {msg.imageUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(msg.imageUrl, "_blank", "noopener,noreferrer")}
                          className="block relative w-48 h-48 rounded-xl overflow-hidden border border-white/20"
                        >
                          <Image src={msg.imageUrl} alt="送信画像" fill className="object-cover" unoptimized />
                        </button>
                      )}
                      {msg.text && <p>{msg.text}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <div className="bg-[#12121f] border-t border-[#ff2d78]/20 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 max-w-[480px] mx-auto">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <button
            type="button"
            onClick={handlePickImage}
            disabled={isBlocked || sending || sendingImage}
            className="w-10 h-10 bg-[#0d0d1a] border border-[#ff2d78]/20 hover:border-[#00f5ff] disabled:opacity-30 disabled:cursor-not-allowed text-[#00f5ff] rounded-full flex items-center justify-center transition shrink-0"
            aria-label="画像を送信"
          >
            {sendingImage ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          <input
            ref={inputRef} type="text" value={text}
            onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown}
            disabled={isBlocked || sendingImage}
            placeholder={isBlocked ? "ブロック中のためメッセージを送れません" : "メッセージを入力..."}
            className="flex-1 bg-[#0d0d1a] text-white text-sm placeholder-[#8888aa] border border-[#ff2d78]/20 focus:border-[#00f5ff] disabled:opacity-40 disabled:cursor-not-allowed rounded-full px-4 py-2.5 outline-none transition"
          />
          <button onClick={handleSend} disabled={!text.trim() || sending || isBlocked || sendingImage}
            className="w-10 h-10 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] hover:opacity-90 active:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition shrink-0"
            aria-label="送信">
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

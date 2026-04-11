"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Community,
  CommunityMember,
  getCommunityMembers,
  getUserCommunityIds,
  joinCommunity,
  leaveCommunity,
} from "@/lib/communities";
import HamburgerMenuButton from "@/components/HamburgerMenuButton";

const CATEGORY_COLOR: Record<string, string> = {
  体型: "bg-blue-600/20 text-blue-300 border-blue-500/40",
  趣味: "bg-purple-600/20 text-purple-300 border-purple-500/40",
  その他: "bg-gray-600/20 text-gray-300 border-gray-500/40",
};

export default function CommunityDetailPage() {
  const params = useParams();
  const communityId = params.communityId as string;
  const router = useRouter();

  const [myUid, setMyUid] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) { router.replace("/auth/login"); return; }
      setMyUid(u.uid);
      setAuthLoading(false);
      loadAll(u.uid);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async (uid: string) => {
    setLoading(true);
    try {
      const [snap, memberList, joinedIds] = await Promise.all([
        getDoc(doc(db, "communities", communityId)),
        getCommunityMembers(communityId),
        getUserCommunityIds(uid),
      ]);
      if (snap.exists()) {
        setCommunity({ id: snap.id, ...(snap.data() as Omit<Community, "id">) });
      }
      setMembers(memberList);
      setJoined(joinedIds.includes(communityId));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!myUid || toggling || !community) return;
    setToggling(true);
    try {
      if (joined) {
        await leaveCommunity(myUid, communityId);
        setJoined(false);
        setCommunity((c) => c ? { ...c, memberCount: Math.max(0, c.memberCount - 1) } : c);
        setMembers((prev) => prev.filter((m) => m.uid !== myUid));
      } else {
        await joinCommunity(myUid, communityId);
        setJoined(true);
        setCommunity((c) => c ? { ...c, memberCount: c.memberCount + 1 } : c);
        // 自分を一覧に追加
        const snap = await getDoc(doc(db, "users", myUid));
        if (snap.exists()) {
          const data = snap.data();
          setMembers((prev) => [
            ...prev,
            { uid: myUid, name: data.name ?? "", age: data.age ?? 0, images: data.images ?? [] },
          ]);
        }
      }
    } finally {
      setToggling(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!community) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a0f1e] px-6 text-center">
        <p className="text-gray-300 font-medium mb-4">コミュニティが見つかりません</p>
        <button onClick={() => router.back()}
          className="h-10 px-6 bg-blue-600 text-white text-sm rounded-xl">戻る</button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white flex flex-col">
      {/* ヘッダー */}
      <header className="bg-[#1a1f2e] border-b border-gray-700 px-4 h-14 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-700 transition"
          aria-label="戻る">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-white flex-1 truncate">{community.name}</h1>
        <HamburgerMenuButton />
      </header>

      <div className="flex-1 w-full max-w-[480px] mx-auto px-4 py-5 space-y-5 pb-10">
        {/* コミュニティ情報カード */}
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-2xl px-4 py-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <h2 className="text-white font-bold text-lg">{community.name}</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLOR[community.category] ?? CATEGORY_COLOR["その他"]}`}>
                  {community.category}
                </span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{community.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {community.memberCount}人のメンバー
            </span>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`h-9 px-5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                joined
                  ? "bg-transparent border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400"
                  : "bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {toggling ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : joined ? "脱退する" : "参加する"}
            </button>
          </div>
        </div>

        {/* メンバー一覧 */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-3">
            メンバー
            <span className="ml-2 text-blue-400 font-normal">{members.length}人</span>
          </h3>

          {members.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-gray-500 text-sm">まだメンバーがいません</p>
              <p className="text-gray-600 text-xs mt-1">最初に参加してみましょう！</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {members.map((m) => (
                <button
                  key={m.uid}
                  onClick={() => router.push(`/profile/${m.uid}`)}
                  className="bg-[#1a1f2e] border border-gray-700 rounded-2xl overflow-hidden text-left active:scale-95 transition-transform"
                >
                  {/* 画像 */}
                  <div className="relative w-full aspect-[3/4] bg-[#252b3b]">
                    {m.images[0] ? (
                      <Image
                        src={m.images[0]}
                        alt={m.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    {/* 自分バッジ */}
                    {m.uid === myUid && (
                      <div className="absolute top-2 left-2 bg-blue-600/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                        あなた
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-white text-sm font-semibold truncate">{m.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{m.age}歳</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Community,
  Category,
  getCommunities,
  getUserCommunityIds,
  joinCommunity,
  leaveCommunity,
  ensureDefaultCommunities,
} from "@/lib/communities";
import HamburgerMenuButton from "@/components/HamburgerMenuButton";

const CATEGORY_ORDER: Category[] = ["体型", "趣味", "その他"];

const CATEGORY_COLOR: Record<Category, string> = {
  体型: "bg-[#ff2d78]/10 text-[#ff2d78] border-[#ff2d78]/30",
  趣味: "bg-[#bf00ff]/10 text-[#bf00ff] border-[#bf00ff]/30",
  その他: "bg-[#8888aa]/10 text-[#8888aa] border-[#8888aa]/30",
};

export default function CommunitiesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<Category | "すべて">("すべて");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) { router.replace("/auth/login"); return; }
      setUser(u);
      setAuthLoading(false);
      loadAll(u.uid);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async (uid: string) => {
    setLoading(true);
    try {
      await ensureDefaultCommunities();
      const [comms, ids] = await Promise.all([getCommunities(), getUserCommunityIds(uid)]);
      setCommunities(comms);
      setJoinedIds(new Set(ids));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (communityId: string) => {
    if (!user || togglingId) return;
    setTogglingId(communityId);
    try {
      if (joinedIds.has(communityId)) {
        await leaveCommunity(user.uid, communityId);
        setJoinedIds((prev) => { const s = new Set(prev); s.delete(communityId); return s; });
        setCommunities((prev) => prev.map((c) => c.id === communityId ? { ...c, memberCount: Math.max(0, c.memberCount - 1) } : c));
      } else {
        await joinCommunity(user.uid, communityId);
        setJoinedIds((prev) => { const s = new Set(prev); s.add(communityId); return s; });
        setCommunities((prev) => prev.map((c) => c.id === communityId ? { ...c, memberCount: c.memberCount + 1 } : c));
      }
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = activeCategory === "すべて" ? communities : communities.filter((c) => c.category === activeCategory);
  const grouped = CATEGORY_ORDER.reduce<Record<Category, Community[]>>(
    (acc, cat) => { acc[cat] = filtered.filter((c) => c.category === cat); return acc; },
    { 体型: [], 趣味: [], その他: [] }
  );

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
      <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition" aria-label="戻る">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-[#00f5ff] neon-text-cyan flex-1">コミュニティ</h1>
        <span className="text-[#8888aa] text-xs">{joinedIds.size}件参加中</span>
        <HamburgerMenuButton />
      </header>

      {/* カテゴリタブ */}
      <div className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 flex gap-2 overflow-x-auto shrink-0 py-2">
        {(["すべて", ...CATEGORY_ORDER] as const).map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`shrink-0 h-8 px-4 rounded-full text-xs font-medium transition border ${
              activeCategory === cat
                ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white"
                : "bg-[#0d0d1a] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/50"
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* ボディ */}
      <div className="flex-1 px-4 py-4 w-full max-w-[480px] mx-auto space-y-6 pb-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat];
            if (items.length === 0) return null;
            return (
              <section key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${CATEGORY_COLOR[cat]}`}>
                    {cat}
                  </span>
                  <span className="text-[#8888aa] text-xs">{items.length}件</span>
                </div>
                <div className="space-y-2.5">
                  {items.map((community) => {
                    const joined = joinedIds.has(community.id);
                    const toggling = togglingId === community.id;
                    return (
                      <div key={community.id} className="bg-[#12121f] border border-[#ff2d78]/20 rounded-2xl px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <button onClick={() => router.push(`/communities/${community.id}`)}
                                className="text-white font-semibold text-sm hover:text-[#00f5ff] transition truncate">
                                {community.name}
                              </button>
                              {joined && (
                                <span className="shrink-0 text-[10px] bg-[#ff2d78]/10 text-[#ff2d78] border border-[#ff2d78]/30 px-1.5 py-0.5 rounded-full">
                                  参加中
                                </span>
                              )}
                            </div>
                            <p className="text-[#8888aa] text-xs leading-relaxed mb-2">{community.description}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-[#8888aa] text-xs flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {community.memberCount}人
                              </span>
                              <button onClick={() => router.push(`/communities/${community.id}`)}
                                className="text-[#00f5ff] text-xs hover:underline">
                                メンバーを見る →
                              </button>
                            </div>
                          </div>

                          {/* 参加/脱退ボタン */}
                          <button onClick={() => handleToggle(community.id)} disabled={toggling}
                            className={`shrink-0 h-9 px-4 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 disabled:opacity-50 ${
                              joined
                                ? "bg-transparent border-[#ff2d78]/30 text-[#8888aa] hover:border-red-500 hover:text-red-400"
                                : "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white hover:opacity-90"
                            }`}>
                            {toggling ? (
                              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : joined ? "脱退" : "参加"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </main>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import BottomNav from "@/components/BottomNav";
import HamburgerMenuButton from "@/components/HamburgerMenuButton";

type Position = "top" | "bottom" | "versatile" | "side";

type ProfileData = {
  name: string;
  age: number;
  height: number;
  weight: number;
  position: Position;
  bodyType?: "細い" | "スジ筋" | "普通" | "筋肉質" | "ポチャ";
  hairStyle?: "坊主" | "短髪" | "前髪" | "パーマ" | "ロング";
  preferredAge?: "歳上好き" | "歳下好き" | "同世代" | "なんでも";
  livingArea?: string;
  bio: string;
  instagramId?: string;
  tiktokId?: string;
  xId?: string;
  profileImages?: string[];
  faceImages?: string[];
  bodyImages?: string[];
  albumVisibilityMode?: string;
  mainImage?: string;
  images: string[];
};

const POSITION_LABEL: Record<Position, string> = {
  top: "Top",
  bottom: "Bottom",
  versatile: "Versatile",
  side: "Side",
};

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const getDisplayImages = (p: ProfileData): string[] => {
    const profile = p.profileImages ?? p.images ?? [];
    const main = p.mainImage ?? profile[0] ?? "";
    return Array.from(new Set([main, ...profile].filter(Boolean)));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) { router.replace("/auth/login"); return; }
      setUser(u);
      setAuthLoading(false);
      loadProfile(u.uid);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async (uid: string) => {
    setProfileLoading(true);
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          ...data,
          livingArea: data.livingArea ?? data.hobby ?? "",
        } as ProfileData);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = modalIndex !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalIndex]);

  if (authLoading || profileLoading) {
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
          <h1 className="text-base font-bold text-[#00f5ff] neon-text-cyan">マイプロフィール</h1>
          <HamburgerMenuButton />
        </header>

        <div className="flex-1 px-4 py-5 space-y-5 w-full max-w-[480px] mx-auto">

          {!profile ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-[#12121f] border border-[#ff2d78]/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">プロフィールが未作成です</p>
              <p className="text-[#8888aa] text-sm mb-6">プロフィールを作成して他のユーザーに見つけてもらいましょう</p>
              <button onClick={() => router.push("/profile/edit")}
                className="h-11 px-8 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition">
                プロフィールを作成する
              </button>
            </div>
          ) : (
            <>
              {/* 名前・年齢 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {profile.name}
                    <span className="ml-2 text-lg font-normal text-[#8888aa]">{profile.age}歳</span>
                  </p>
                  <p className="text-[#8888aa] text-xs mt-0.5">{user?.email}</p>
                </div>
                <button onClick={() => router.push("/profile/edit")}
                  className="h-9 px-4 bg-[#0d0d1a] hover:bg-[#1a1a2e] border border-[#ff2d78]/20 hover:border-[#ff2d78]/50 text-[#8888aa] hover:text-white text-xs font-medium rounded-xl transition flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  編集
                </button>
              </div>

              {/* 画像グリッド */}
              {getDisplayImages(profile).length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {getDisplayImages(profile).map((src, i) => (
                    <button key={i} onClick={() => setModalIndex(i)}
                      className="relative aspect-square rounded-xl overflow-hidden bg-[#12121f] border border-[#ff2d78]/20 active:scale-95 transition-transform">
                      <Image src={src} alt={`写真 ${i + 1}`} fill className="object-cover" unoptimized />
                      {src === (profile.mainImage ?? getDisplayImages(profile)[0]) && (
                        <span className="absolute bottom-1.5 left-1.5 bg-[#ff2d78]/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">メイン</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="w-full aspect-[3/2] bg-[#12121f] border border-dashed border-[#ff2d78]/20 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <svg className="w-10 h-10 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-[#8888aa] text-xs">写真が未設定です</p>
                </div>
              )}

              {/* 身長・体重・ポジション */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "身長", value: `${profile.height} cm` },
                  { label: "体重", value: `${profile.weight} kg` },
                  { label: "ポジション", value: POSITION_LABEL[profile.position] },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl px-3 py-3 text-center">
                    <p className="text-[#8888aa] text-xs mb-1">{label}</p>
                    <p className="text-white text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              {/* 体型・髪型・好み年齢 */}
              {(profile.bodyType || profile.hairStyle || profile.preferredAge) && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "体型", value: profile.bodyType },
                    { label: "髪型", value: profile.hairStyle },
                    { label: "好み年齢", value: profile.preferredAge },
                  ]
                    .filter((item) => Boolean(item.value))
                    .map(({ label, value }) => (
                      <div key={label} className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl px-3 py-3 text-center">
                        <p className="text-[#8888aa] text-xs mb-1">{label}</p>
                        <p className="text-white text-sm font-semibold">{value}</p>
                      </div>
                    ))}
                </div>
              )}

              {/* 生活地域 */}
              {profile.livingArea && (
                <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl px-4 py-4">
                  <p className="text-[#8888aa] text-xs font-medium mb-1.5">生活地域</p>
                  <p className="text-white text-sm leading-relaxed">{profile.livingArea}</p>
                </div>
              )}

              {/* 自己紹介 */}
              {profile.bio && (
                <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl px-4 py-4">
                  <p className="text-[#8888aa] text-xs font-medium mb-1.5">自己紹介</p>
                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}

              {/* SNS */}
              {(profile.instagramId || profile.tiktokId || profile.xId) && (
                <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl px-4 py-4">
                  <p className="text-[#8888aa] text-xs font-medium mb-2">SNS</p>
                  <div className="space-y-2 text-sm">
                    {profile.instagramId && (
                      <p className="text-white">
                        <span className="text-[#8888aa] mr-2">Instagram:</span>@{profile.instagramId}
                      </p>
                    )}
                    {profile.tiktokId && (
                      <p className="text-white">
                        <span className="text-[#8888aa] mr-2">TikTok:</span>@{profile.tiktokId}
                      </p>
                    )}
                    {profile.xId && (
                      <p className="text-white">
                        <span className="text-[#8888aa] mr-2">X:</span>@{profile.xId}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-[#12121f] border border-[#00f5ff]/25 rounded-xl px-4 py-4">
                <p className="text-[#00f5ff] text-xs font-medium mb-1.5">顔・体アルバム公開設定</p>
                <p className="text-[#9aa7b1] text-sm">相互承認で同時公開</p>
              </div>

              {/* 編集ボタン */}
              <button onClick={() => router.push("/profile/edit")}
                className="w-full h-12 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] hover:opacity-90 active:opacity-80 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                プロフィールを編集する
              </button>
            </>
          )}
        </div>
      </main>

      {/* 画像モーダル */}
      {modalIndex !== null && profile && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setModalIndex(null)}>
          <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Image src={getDisplayImages(profile)[modalIndex]} alt={`写真 ${modalIndex + 1}`} fill className="object-contain" unoptimized priority />
            <button onClick={() => setModalIndex(null)}
              className="absolute top-5 right-5 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center z-10">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {modalIndex > 0 && (
              <button onClick={(e) => { e.stopPropagation(); setModalIndex((i) => (i! > 0 ? i! - 1 : i)); }}
                className="absolute left-0 top-0 w-1/3 h-full z-10" />
            )}
            {modalIndex < getDisplayImages(profile).length - 1 && (
              <button onClick={(e) => { e.stopPropagation(); setModalIndex((i) => (i! < getDisplayImages(profile).length - 1 ? i! + 1 : i)); }}
                className="absolute right-0 top-0 w-1/3 h-full z-10" />
            )}
            {getDisplayImages(profile).length > 1 && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 pointer-events-none z-10">
                {getDisplayImages(profile).map((_, i) => (
                  <span key={i} className={`block h-1.5 rounded-full transition-all ${i === modalIndex ? "w-6 bg-[#ff2d78]" : "w-1.5 bg-white/30"}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </>
  );
}

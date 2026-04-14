"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { blockUser, getBlockedUsers, reportUser } from "@/lib/block";
import { muteUser, unmuteUser, getMutedUsers } from "@/lib/mute";
import { recordProfileView } from "@/lib/profileViews";
import { isOnline } from "@/lib/online";
import { sendLike, removeLike, hasLiked } from "@/lib/likes";
import { addNotification } from "@/lib/notifications";
import { addFavorite, hasFavorited, removeFavorite } from "@/lib/favorites";
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
  lastOnline: Timestamp | null;
};

const POSITION_LABEL: Record<Position, string> = {
  top: "Top",
  bottom: "Bottom",
  versatile: "Versatile",
  side: "Side",
};

const REPORT_REASONS = [
  "不適切な画像",
  "スパム・宣伝",
  "嫌がらせ・ハラスメント",
  "なりすまし",
  "その他",
];

export default function ProfileDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [isBlocked, setIsBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [muting, setMuting] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriting, setFavoriting] = useState(false);

  // 通報モーダル
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  // 画像モーダル
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const modalTouchStartX = useRef<number | null>(null);

  const getDisplayImages = (profileData: ProfileData): string[] => {
    const profile = profileData.profileImages ?? profileData.images ?? [];
    const main = profileData.mainImage ?? profile[0] ?? "";
    return Array.from(new Set([main, ...profile].filter(Boolean)));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/auth/login");
      } else {
        setCurrentUser(u);
        setAuthLoading(false);
        fetchAll(u.uid);
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async (myUid: string) => {
    try {
      const [snap, blocked, muted, liked, favorited] = await Promise.all([
        getDoc(doc(db, "users", userId)),
        getBlockedUsers(myUid),
        getMutedUsers(myUid),
        hasLiked(myUid, userId),
        hasFavorited(myUid, userId),
      ]);
      if (!snap.exists()) { setNotFound(true); return; }
      const data = snap.data();
      setProfile({
        ...data,
        livingArea: data.livingArea ?? data.hobby ?? "",
        lastOnline: data.lastOnline ?? null,
      } as ProfileData);
      setIsBlocked(blocked.includes(userId));
      setIsMuted(muted.includes(userId));
      setIsLiked(liked);
      setIsFavorited(favorited);
      recordProfileView(myUid, userId);
    } catch (err) {
      console.error("[ProfileDetail] 取得エラー:", err);
      setFetchError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleLike = async () => {
    if (!currentUser) return;
    setLiking(true);
    try {
      if (isLiked) {
        await removeLike(currentUser.uid, userId);
        setIsLiked(false);
      } else {
        await sendLike(currentUser.uid, userId);
        await addNotification(userId, "like", currentUser.uid);
        setIsLiked(true);
      }
    } catch (err) {
      console.error("いいね失敗:", err);
    } finally {
      setLiking(false);
    }
  };

  const handleFavorite = async () => {
    if (!currentUser) return;
    setFavoriting(true);
    try {
      if (isFavorited) {
        await removeFavorite(currentUser.uid, userId);
        setIsFavorited(false);
      } else {
        await addFavorite(currentUser.uid, userId);
        setIsFavorited(true);
      }
    } catch (err) {
      console.error("お気に入り失敗:", err);
    } finally {
      setFavoriting(false);
    }
  };

  const handleMute = async () => {
    if (!currentUser) return;
    setMuting(true);
    try {
      if (isMuted) {
        await unmuteUser(currentUser.uid, userId);
        setIsMuted(false);
      } else {
        await muteUser(currentUser.uid, userId);
        setIsMuted(true);
      }
    } catch (err) {
      console.error("ミュート失敗:", err);
      alert("操作に失敗しました");
    } finally {
      setMuting(false);
    }
  };

  const handleBlock = async () => {
    if (!currentUser) return;
    setBlocking(true);
    try {
      await blockUser(currentUser.uid, userId);
      router.replace("/home");
    } catch (err) {
      console.error("ブロック失敗:", err);
      alert("ブロックに失敗しました");
    } finally {
      setBlocking(false);
    }
  };

  const handleReport = async () => {
    if (!currentUser || !reportReason) return;
    setReporting(true);
    try {
      await reportUser(currentUser.uid, userId, reportReason);
      setReportDone(true);
    } catch (err) {
      console.error("通報失敗:", err);
      alert("通報に失敗しました");
    } finally {
      setReporting(false);
    }
  };

  const modalPrev = () => setModalIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  const modalNext = (total: number) => setModalIndex((i) => (i !== null && i < total - 1 ? i + 1 : i));
  const handleModalTouchStart = (e: React.TouchEvent) => { modalTouchStartX.current = e.touches[0].clientX; };
  const handleModalTouchEnd = (e: React.TouchEvent, total: number) => {
    if (modalTouchStartX.current === null) return;
    const diff = modalTouchStartX.current - e.changedTouches[0].clientX;
    if (diff > 40) modalNext(total);
    else if (diff < -40) modalPrev();
    modalTouchStartX.current = null;
  };

  useEffect(() => {
    document.body.style.overflow = modalIndex !== null || reportOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalIndex, reportOpen]);

  if (authLoading || (!profile && !notFound && !fetchError)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-4 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f] px-6 text-center">
        <p className="text-white font-medium mb-2">読み込みに失敗しました</p>
        <p className="text-red-400 text-xs mb-6 font-mono">{fetchError}</p>
        <div className="flex gap-3">
          <button onClick={() => { setFetchError(""); if (currentUser) fetchAll(currentUser.uid); }}
            className="h-10 px-6 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] text-white text-sm font-medium rounded-xl transition">
            再試行
          </button>
          <button onClick={() => router.back()}
            className="h-10 px-6 bg-[#12121f] border border-[#ff2d78]/20 text-[#8888aa] text-sm font-medium rounded-xl transition">
            戻る
          </button>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f] px-6 text-center">
        <p className="text-white font-medium mb-2">ユーザーが見つかりません</p>
        <p className="text-[#8888aa] text-sm mb-6">このプロフィールは存在しないか削除されました</p>
        <button onClick={() => router.back()}
          className="h-10 px-6 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] text-white text-sm font-medium rounded-xl transition">
          戻る
        </button>
      </main>
    );
  }

  const p = profile!;
  const online = isOnline(p.lastOnline);
  const displayImages = getDisplayImages(p);

  return (
    <>
      <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

        {/* ヘッダー */}
        <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center gap-3 shrink-0">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition" aria-label="戻る">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-white flex-1 truncate">{p.name}</h1>
          <div className="flex items-center gap-1">
            {/* 通報ボタン */}
            <button onClick={() => { setReportOpen(true); setReportDone(false); setReportReason(""); }}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition" aria-label="通報">
              <svg className="w-5 h-5 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 9.136A2 2 0 006.64 14H18a2 2 0 001.94-1.515l1.06-4.243A1 1 0 0020.04 7H6.28" />
              </svg>
            </button>
            <HamburgerMenuButton />
          </div>
        </header>

        {/* ブロック済みバナー */}
        {isBlocked && (
          <div className="bg-red-900/20 border-b border-red-800/50 px-4 py-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <p className="text-red-400 text-xs">このユーザーをブロックしています。一部情報のみ表示されています。</p>
          </div>
        )}

        {/* コンテンツ */}
        <div className="flex-1 px-4 py-5 space-y-5 w-full max-w-[480px] mx-auto pb-10">

          {/* 名前・年齢・オンライン */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl font-bold text-white">
                {p.name}
                <span className="ml-2 text-lg font-normal text-[#8888aa]">{p.age}歳</span>
              </p>
              {online && (
                <span className="flex items-center gap-1 bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-medium px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                  オンライン
                </span>
              )}
            </div>
          </div>

          {/* 画像 */}
          {!isBlocked && (
            displayImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {displayImages.map((src, i) => (
                  <button key={i} onClick={() => setModalIndex(i)}
                    className="relative aspect-square rounded-xl overflow-hidden bg-[#0d0d1a] border border-[#ff2d78]/20 active:scale-95 transition-transform"
                    aria-label={`写真 ${i + 1} を拡大`}>
                    <Image src={src} alt={`${p.name} の写真 ${i + 1}`} fill className="object-cover" unoptimized />
                    {src === (p.mainImage ?? displayImages[0]) && (
                      <span className="absolute bottom-1.5 left-1.5 bg-[#ff2d78]/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                        メイン
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="w-full aspect-[3/2] bg-[#12121f] border border-[#ff2d78]/20 rounded-2xl flex items-center justify-center">
                <svg className="w-12 h-12 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )
          )}

          {/* 身長・体重・ポジション */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "身長", value: `${p.height} cm`, hidden: false },
              { label: "体重", value: `${p.weight} kg`, hidden: false },
              { label: "ポジション", value: POSITION_LABEL[p.position], hidden: isBlocked },
            ]
              .filter((item) => !item.hidden)
              .map(({ label, value }) => (
                <div key={label} className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl px-3 py-3 text-center">
                  <p className="text-[#8888aa] text-xs mb-1">{label}</p>
                  <p className="text-white text-sm font-semibold">{value}</p>
                </div>
              ))}
          </div>

          {/* 体型・髪型・好み年齢 */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "体型", value: p.bodyType, hidden: isBlocked },
              { label: "髪型", value: p.hairStyle, hidden: isBlocked },
              { label: "好み年齢", value: p.preferredAge, hidden: isBlocked },
            ]
              .filter((item) => !item.hidden && Boolean(item.value))
              .map(({ label, value }) => (
                <div key={label} className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl px-3 py-3 text-center">
                  <p className="text-[#8888aa] text-xs mb-1">{label}</p>
                  <p className="text-white text-sm font-semibold">{value}</p>
                </div>
              ))}
          </div>

          {/* 生活地域・自己紹介 */}
          {!isBlocked && p.livingArea && (
            <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl px-4 py-4">
              <p className="text-[#8888aa] text-xs font-medium mb-1.5">生活地域</p>
              <p className="text-white text-sm leading-relaxed">{p.livingArea}</p>
            </div>
          )}
          {!isBlocked && p.bio && (
            <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl px-4 py-4">
              <p className="text-[#8888aa] text-xs font-medium mb-1.5">自己紹介</p>
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{p.bio}</p>
            </div>
          )}

          {!isBlocked && (p.instagramId || p.tiktokId || p.xId) && (
            <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl px-4 py-4">
              <p className="text-[#8888aa] text-xs font-medium mb-2">SNS</p>
              <div className="space-y-2 text-sm">
                {p.instagramId && (
                  <p className="text-white">
                    <span className="text-[#8888aa] mr-2">Instagram:</span>@{p.instagramId}
                  </p>
                )}
                {p.tiktokId && (
                  <p className="text-white">
                    <span className="text-[#8888aa] mr-2">TikTok:</span>@{p.tiktokId}
                  </p>
                )}
                {p.xId && (
                  <p className="text-white">
                    <span className="text-[#8888aa] mr-2">X:</span>@{p.xId}
                  </p>
                )}
              </div>
            </div>
          )}

          {!isBlocked && (
            <div className="bg-[#12121f] border border-[#00f5ff]/25 rounded-xl px-4 py-4">
              <p className="text-[#00f5ff] text-xs font-medium mb-1.5">顔・体アルバム公開設定</p>
              <p className="text-[#9aa7b1] text-sm">相互承認で同時公開</p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3 pt-1">
            {!isBlocked && (
              <>
                {/* メッセージボタン */}
                <button onClick={() => router.push(`/messages/${userId}`)}
                  className="w-full h-12 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] hover:opacity-90 active:opacity-80 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  メッセージ
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleLike} disabled={liking}
                    className={`h-11 rounded-xl border transition flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 ${
                      isLiked
                        ? "bg-[#ff2d78]/20 border-[#ff2d78] text-[#ff2d78]"
                        : "bg-[#12121f] border-[#ff2d78]/30 text-[#8888aa] hover:border-[#ff2d78] hover:text-[#ff2d78]"
                    }`}
                    aria-label={isLiked ? "いいね解除" : "いいね"}>
                    {liking ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    )}
                    {isLiked ? "いいね済み" : "いいね"}
                  </button>
                  <button onClick={handleFavorite} disabled={favoriting}
                    className={`h-11 rounded-xl border transition flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 ${
                      isFavorited
                        ? "bg-[#bf00ff]/20 border-[#bf00ff] text-[#bf00ff]"
                        : "bg-[#12121f] border-[#bf00ff]/30 text-[#8888aa] hover:border-[#bf00ff] hover:text-[#bf00ff]"
                    }`}
                    aria-label={isFavorited ? "お気に入り解除" : "お気に入り登録"}>
                    {favoriting ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill={isFavorited ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 3 13.274 3 10.5a4.5 4.5 0 018.145-2.579L12 9.17l.855-1.249A4.5 4.5 0 0121 10.5c0 2.774-1.688 4.86-3.989 7.007a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.218l-.022.012-.007.004-.003.001a.75.75 0 01-.704 0l-.003-.001z" />
                      </svg>
                    )}
                    {isFavorited ? "お気に入り済み" : "お気に入り"}
                  </button>
                </div>
              </>
            )}

            {/* ミュートボタン */}
            {!isBlocked && (
              <button onClick={handleMute} disabled={muting}
                className={`w-full h-12 border rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                  isMuted
                    ? "bg-yellow-900/20 border-yellow-600/50 text-yellow-400 hover:bg-yellow-900/30"
                    : "bg-[#12121f] border-[#ff2d78]/20 hover:border-yellow-500/60 hover:bg-yellow-900/10 text-[#8888aa] hover:text-yellow-400"
                }`}>
                {muting ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    {isMuted
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l6 6m0-6l-6 6" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m-2 0l2 2" />
                    }
                  </svg>
                )}
                {muting ? "処理中..." : isMuted ? "ミュート解除" : "ミュートする"}
              </button>
            )}

            {/* ブロック / ブロック済み */}
            {isBlocked ? (
              <div className="w-full h-12 bg-[#12121f] border border-[#ff2d78]/10 rounded-xl flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span className="text-[#8888aa] text-sm">ブロック済み</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (confirm(`${p.name}さんをブロックしますか？\nブロックするとこのユーザーがホーム画面に表示されなくなります。`)) {
                    handleBlock();
                  }
                }}
                disabled={blocking}
                className="w-full h-12 bg-[#12121f] border border-[#ff2d78]/20 hover:border-red-500/60 hover:bg-red-900/20 text-[#8888aa] hover:text-red-400 disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-2">
                {blocking ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                )}
                {blocking ? "処理中..." : "ブロックする"}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* 画像モーダル */}
      {modalIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setModalIndex(null)}>
          <div className="relative w-full h-full flex items-center justify-center"
            onTouchStart={handleModalTouchStart}
            onTouchEnd={(e) => handleModalTouchEnd(e, displayImages.length)}
            onClick={(e) => e.stopPropagation()}>
            <Image src={displayImages[modalIndex]} alt={`${p.name} の写真 ${modalIndex + 1}`} fill className="object-contain" unoptimized priority />
            <button onClick={() => setModalIndex(null)}
              className="absolute top-5 right-5 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center z-10" aria-label="閉じる">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {displayImages.length > 1 && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 pointer-events-none z-10">
                {displayImages.map((_, i) => (
                  <span key={i} className={`block h-1.5 rounded-full transition-all duration-200 ${i === modalIndex ? "w-6 bg-[#ff2d78]" : "w-1.5 bg-white/30"}`} />
                ))}
              </div>
            )}
            {modalIndex > 0 && (
              <button onClick={(e) => { e.stopPropagation(); modalPrev(); }}
                className="absolute left-0 top-0 w-1/3 h-full z-10" aria-label="前の画像" />
            )}
            {modalIndex < displayImages.length - 1 && (
              <button onClick={(e) => { e.stopPropagation(); modalNext(displayImages.length); }}
                className="absolute right-0 top-0 w-1/3 h-full z-10" aria-label="次の画像" />
            )}
          </div>
        </div>
      )}

      {/* 通報モーダル */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={() => setReportOpen(false)}>
          <div className="w-full max-w-[480px] bg-[#12121f] border border-[#ff2d78]/20 rounded-t-2xl px-5 pt-5 pb-8"
            onClick={(e) => e.stopPropagation()}>
            {reportDone ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-1">通報を受け付けました</p>
                <p className="text-[#8888aa] text-sm mb-5">ご報告ありがとうございます。内容を確認いたします。</p>
                <button onClick={() => setReportOpen(false)}
                  className="h-10 px-8 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] text-white text-sm font-medium rounded-xl transition">
                  閉じる
                </button>
              </div>
            ) : (
              <>
                <div className="w-10 h-1 bg-[#ff2d78]/30 rounded-full mx-auto mb-5" />
                <h2 className="text-white font-bold text-base mb-1">{p.name}さんを通報</h2>
                <p className="text-[#8888aa] text-xs mb-4">通報理由を選択してください</p>
                <div className="space-y-2 mb-5">
                  {REPORT_REASONS.map((reason) => (
                    <button key={reason} onClick={() => setReportReason(reason)}
                      className={`w-full h-11 rounded-xl text-sm text-left px-4 border transition ${
                        reportReason === reason
                          ? "bg-[#ff2d78]/10 border-[#ff2d78]/60 text-[#ff2d78]"
                          : "bg-[#0d0d1a] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/40"
                      }`}>
                      {reason}
                    </button>
                  ))}
                </div>
                <button onClick={handleReport} disabled={!reportReason || reporting}
                  className="w-full h-12 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2">
                  {reporting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {reporting ? "送信中..." : "通報する"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

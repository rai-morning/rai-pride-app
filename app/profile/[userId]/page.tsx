"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { blockUser, getBlockedUsers, reportUser } from "@/lib/block";

type Position = "top" | "bottom" | "versatile";

type ProfileData = {
  name: string;
  age: number;
  height: number;
  weight: number;
  position: Position;
  hobby: string;
  bio: string;
  images: string[];
};

const POSITION_LABEL: Record<Position, string> = {
  top: "Top",
  bottom: "Bottom",
  versatile: "Versatile",
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

  // 通報モーダル
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  // 画像モーダル
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const modalTouchStartX = useRef<number | null>(null);

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
      console.log("[ProfileDetail] 取得対象 userId:", userId);
      const [snap, blocked] = await Promise.all([
        getDoc(doc(db, "users", userId)),
        getBlockedUsers(myUid),
      ]);
      console.log("[ProfileDetail] exists:", snap.exists());
      if (!snap.exists()) {
        setNotFound(true);
        return;
      }
      setProfile(snap.data() as ProfileData);
      setIsBlocked(blocked.includes(userId));
    } catch (err) {
      console.error("[ProfileDetail] 取得エラー:", err);
      setFetchError(err instanceof Error ? err.message : String(err));
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

  // 画像モーダル操作
  const modalPrev = () => setModalIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  const modalNext = (total: number) =>
    setModalIndex((i) => (i !== null && i < total - 1 ? i + 1 : i));
  const handleModalTouchStart = (e: React.TouchEvent) => {
    modalTouchStartX.current = e.touches[0].clientX;
  };
  const handleModalTouchEnd = (e: React.TouchEvent, total: number) => {
    if (modalTouchStartX.current === null) return;
    const diff = modalTouchStartX.current - e.changedTouches[0].clientX;
    if (diff > 40) modalNext(total);
    else if (diff < -40) modalPrev();
    modalTouchStartX.current = null;
  };

  useEffect(() => {
    document.body.style.overflow =
      modalIndex !== null || reportOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalIndex, reportOpen]);

  // ── ローディング ──
  if (authLoading || (!profile && !notFound && !fetchError)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a0f1e] px-6 text-center">
        <p className="text-gray-300 font-medium mb-2">読み込みに失敗しました</p>
        <p className="text-red-400 text-xs mb-6 font-mono">{fetchError}</p>
        <div className="flex gap-3">
          <button
            onClick={() => { setFetchError(""); if (currentUser) fetchAll(currentUser.uid); }}
            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
          >
            再試行
          </button>
          <button onClick={() => router.back()}
            className="h-10 px-6 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-xl transition">
            戻る
          </button>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0a0f1e] px-6 text-center">
        <p className="text-gray-300 font-medium mb-2">ユーザーが見つかりません</p>
        <p className="text-gray-500 text-sm mb-6">このプロフィールは存在しないか削除されました</p>
        <button onClick={() => router.back()}
          className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition">
          戻る
        </button>
      </main>
    );
  }

  const p = profile!;

  return (
    <>
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
          <h1 className="text-base font-bold text-white flex-1 truncate">{p.name}</h1>
          {/* 通報ボタン（ヘッダー右） */}
          <button
            onClick={() => { setReportOpen(true); setReportDone(false); setReportReason(""); }}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-700 transition"
            aria-label="通報"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 9.136A2 2 0 006.64 14H18a2 2 0 001.94-1.515l1.06-4.243A1 1 0 0020.04 7H6.28" />
            </svg>
          </button>
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

          {/* 名前・年齢 */}
          <div>
            <p className="text-2xl font-bold text-white">
              {p.name}
              <span className="ml-2 text-lg font-normal text-gray-300">{p.age}歳</span>
            </p>
          </div>

          {/* 画像（ブロック済みは非表示） */}
          {!isBlocked && (
            p.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {p.images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setModalIndex(i)}
                    className="relative aspect-square rounded-xl overflow-hidden bg-[#252b3b] border border-gray-700 active:scale-95 transition-transform"
                    aria-label={`写真 ${i + 1} を拡大`}
                  >
                    <Image src={src} alt={`${p.name} の写真 ${i + 1}`} fill className="object-cover" unoptimized />
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 bg-blue-600/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                        メイン
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="w-full aspect-[3/2] bg-[#1a1f2e] border border-gray-700 rounded-2xl flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )
          )}

          {/* 身長・体重・ポジション（ブロック済みはポジション非表示） */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "身長", value: `${p.height} cm`, hidden: false },
              { label: "体重", value: `${p.weight} kg`, hidden: false },
              { label: "ポジション", value: POSITION_LABEL[p.position], hidden: isBlocked },
            ]
              .filter((item) => !item.hidden)
              .map(({ label, value }) => (
                <div key={label} className="bg-[#1a1f2e] border border-gray-700 rounded-xl px-3 py-3 text-center">
                  <p className="text-gray-500 text-xs mb-1">{label}</p>
                  <p className="text-white text-sm font-semibold">{value}</p>
                </div>
              ))}
          </div>

          {/* 趣味・自己紹介（ブロック済みは非表示） */}
          {!isBlocked && p.hobby && (
            <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl px-4 py-4">
              <p className="text-gray-400 text-xs font-medium mb-1.5">趣味</p>
              <p className="text-white text-sm leading-relaxed">{p.hobby}</p>
            </div>
          )}
          {!isBlocked && p.bio && (
            <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl px-4 py-4">
              <p className="text-gray-400 text-xs font-medium mb-1.5">自己紹介</p>
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{p.bio}</p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3 pt-1">
            {/* メッセージ（ブロック済みは非表示） */}
            {!isBlocked && (
              <button
                onClick={() => router.push(`/messages/${userId}`)}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                メッセージを送る
              </button>
            )}

            {/* ブロック / ブロック済み */}
            {isBlocked ? (
              <div className="w-full h-12 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span className="text-gray-500 text-sm">ブロック済み</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (confirm(`${p.name}さんをブロックしますか？\nブロックするとこのユーザーがホーム画面に表示されなくなります。`)) {
                    handleBlock();
                  }
                }}
                disabled={blocking}
                className="w-full h-12 bg-[#1a1f2e] border border-gray-600 hover:border-red-500 hover:bg-red-900/20 active:bg-red-900/30 text-gray-400 hover:text-red-400 disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-2"
              >
                {blocking ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
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
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setModalIndex(null)}
        >
          <div
            className="relative w-full h-full flex items-center justify-center"
            onTouchStart={handleModalTouchStart}
            onTouchEnd={(e) => handleModalTouchEnd(e, p.images.length)}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={p.images[modalIndex]}
              alt={`${p.name} の写真 ${modalIndex + 1}`}
              fill className="object-contain" unoptimized priority
            />
            <button
              onClick={() => setModalIndex(null)}
              className="absolute top-5 right-5 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center z-10"
              aria-label="閉じる"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {p.images.length > 1 && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 pointer-events-none z-10">
                {p.images.map((_, i) => (
                  <span key={i} className={`block h-1.5 rounded-full transition-all duration-200 ${i === modalIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />
                ))}
              </div>
            )}
            {modalIndex > 0 && (
              <button onClick={(e) => { e.stopPropagation(); modalPrev(); }}
                className="absolute left-0 top-0 w-1/3 h-full z-10" aria-label="前の画像" />
            )}
            {modalIndex < p.images.length - 1 && (
              <button onClick={(e) => { e.stopPropagation(); modalNext(p.images.length); }}
                className="absolute right-0 top-0 w-1/3 h-full z-10" aria-label="次の画像" />
            )}
          </div>
        </div>
      )}

      {/* 通報モーダル */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="w-full max-w-[480px] bg-[#1a1f2e] rounded-t-2xl px-5 pt-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {reportDone ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-1">通報を受け付けました</p>
                <p className="text-gray-400 text-sm mb-5">ご報告ありがとうございます。内容を確認いたします。</p>
                <button
                  onClick={() => setReportOpen(false)}
                  className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <>
                {/* ハンドル */}
                <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-5" />
                <h2 className="text-white font-bold text-base mb-1">{p.name}さんを通報</h2>
                <p className="text-gray-400 text-xs mb-4">通報理由を選択してください</p>

                <div className="space-y-2 mb-5">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={`w-full h-11 rounded-xl text-sm text-left px-4 border transition ${
                        reportReason === reason
                          ? "bg-blue-600/20 border-blue-500 text-blue-300"
                          : "bg-[#252b3b] border-gray-700 text-gray-300"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleReport}
                  disabled={!reportReason || reporting}
                  className="w-full h-12 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {reporting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
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

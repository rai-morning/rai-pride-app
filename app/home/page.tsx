"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { calcDistance, formatDistance, getCurrentPosition } from "@/lib/location";
import { getBlockedUsers } from "@/lib/block";

const RADIUS_M = 500;

type NearbyUser = {
  uid: string;
  name: string;
  age: number;
  images: string[];
  distance: number;
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "done" | "warn">("idle");
  const [locationWarning, setLocationWarning] = useState("");
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  // 認証チェック
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

  // 認証完了後に位置情報取得 → 近くのユーザー取得
  useEffect(() => {
    if (!user) return;
    initLocation(user.uid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const initLocation = async (uid: string) => {
    setLocationStatus("loading");
    setLocationWarning("");
    try {
      const coords = await getCurrentPosition();
      const { latitude, longitude } = coords;

      // 自分のlocationをFirestoreに保存
      try {
        await updateDoc(doc(db, "users", uid), {
          location: { lat: latitude, lng: longitude },
        });
      } catch (e) {
        console.warn("[Home] location保存失敗:", e);
      }

      setLocationStatus("done");
      await loadNearbyUsers(uid, latitude, longitude);
    } catch (err) {
      // タイムアウト・拒否どちらも警告のみ → ユーザー一覧は表示続行
      const msg = err instanceof Error ? err.message : "位置情報を取得できませんでした";
      console.warn("[Home] 位置情報エラー:", msg);
      setLocationWarning(msg);
      setLocationStatus("warn");
      // 位置情報なしでFirestoreの全ユーザーを表示（距離表示なし）
      await loadNearbyUsers(uid, null, null);
    }
  };

  const loadNearbyUsers = async (
    myUid: string,
    myLat: number | null,
    myLng: number | null
  ) => {
    setFetchingUsers(true);
    try {
      const [snapshot, blockedList] = await Promise.all([
        getDocs(collection(db, "users")),
        getBlockedUsers(myUid),
      ]);
      const results: NearbyUser[] = [];

      snapshot.forEach((docSnap) => {
        if (docSnap.id === myUid) return;
        if (blockedList.includes(docSnap.id)) return; // ブロック済みは除外
        const data = docSnap.data();
        if (!data.name) return;

        // 位置情報あり → 距離フィルタ。なし → 全員表示（distance: -1）
        if (myLat !== null && myLng !== null) {
          if (!data.location?.lat || !data.location?.lng) return;
          const dist = calcDistance(myLat, myLng, data.location.lat, data.location.lng);
          if (dist <= RADIUS_M) {
            results.push({
              uid: docSnap.id,
              name: data.name,
              age: data.age ?? 0,
              images: data.images ?? [],
              distance: dist,
            });
          }
        } else {
          results.push({
            uid: docSnap.id,
            name: data.name,
            age: data.age ?? 0,
            images: data.images ?? [],
            distance: -1,
          });
        }
      });

      results.sort((a, b) =>
        a.distance === -1 || b.distance === -1 ? 0 : a.distance - b.distance
      );
      setNearbyUsers(results);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/auth/login");
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#1a1f2e] border-b border-gray-700 px-4 h-14 flex items-center justify-between shrink-0">
        <h1 className="text-base font-bold text-white tracking-wide">RAI Pride</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/messages")}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-700 transition"
            aria-label="メッセージ"
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="h-9 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 text-sm font-medium px-4 rounded-lg transition"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 px-4 py-5 w-full max-w-[480px] mx-auto">

        {/* 位置情報ステータス */}
        {locationStatus === "loading" && (
          <div className="flex items-center gap-2 text-blue-400 text-sm mb-4">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            位置情報を取得中...
          </div>
        )}
        {locationStatus === "warn" && locationWarning && (
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
            <svg className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-yellow-400 text-xs">位置情報を取得できなかったため、距離表示なしで全ユーザーを表示しています</p>
              <button
                onClick={() => user && initLocation(user.uid)}
                className="mt-1 text-blue-400 text-xs underline"
              >
                再試行
              </button>
            </div>
          </div>
        )}

        {/* ユーザー取得中 */}
        {fetchingUsers && (
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            近くのユーザーを検索中...
          </div>
        )}

        {/* セクションタイトル */}
        {(locationStatus === "done" || locationStatus === "warn") && !fetchingUsers && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-base">
              {locationStatus === "warn" ? "ユーザー一覧" : "近くのユーザー"}
              {nearbyUsers.length > 0 && (
                <span className="ml-2 text-blue-400 text-sm font-normal">
                  {nearbyUsers.length}人
                </span>
              )}
            </h2>
            {locationStatus === "done" && (
              <span className="text-gray-500 text-xs">半径500m以内</span>
            )}
          </div>
        )}

        {/* カードグリッド */}
        {(locationStatus === "done" || locationStatus === "warn") && !fetchingUsers && nearbyUsers.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {nearbyUsers.map((u) => (
              <button
                key={u.uid}
                onClick={() => router.push(`/profile/${u.uid}`)}
                className="bg-[#1a1f2e] border border-gray-700 rounded-2xl overflow-hidden text-left active:scale-95 transition-transform"
              >
                {/* 画像 */}
                <div className="relative w-full aspect-[3/4] bg-[#252b3b]">
                  {u.images[0] ? (
                    <Image
                      src={u.images[0]}
                      alt={u.name}
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
                  {/* 距離バッジ（位置情報ありの場合のみ） */}
                  {u.distance >= 0 && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
                      <span className="text-white text-xs font-medium">
                        {formatDistance(u.distance)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 情報 */}
                <div className="px-3 py-2.5">
                  <p className="text-white text-sm font-semibold truncate">{u.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{u.age}歳</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 近くにユーザーがいない */}
        {(locationStatus === "done" || locationStatus === "warn") && !fetchingUsers && nearbyUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-300 font-medium mb-1">近くにユーザーがいません</p>
            <p className="text-gray-500 text-sm">半径500m以内にユーザーが見つかりませんでした</p>
            <button
              onClick={() => user && initLocation(user.uid)}
              className="mt-5 h-10 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-xl transition"
            >
              再検索
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

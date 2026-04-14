"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, getDocs, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { calcDistance, formatDistance, getCurrentPosition, getLocationPermissionState } from "@/lib/location";
import { getBlockedUsers } from "@/lib/block";
import { getMutedUsers } from "@/lib/mute";
import { getUserCommunityIds, getSharedCommunityUserIds, getCommunities, Community } from "@/lib/communities";
import { updateLastOnline, isOnline } from "@/lib/online";
import { getFavoritedUserIds } from "@/lib/favorites";
import HamburgerMenuButton from "@/components/HamburgerMenuButton";

const RADIUS_M = 100_000;

type Position = "top" | "bottom" | "versatile" | "side";
type BodyType = "細い" | "スジ筋" | "普通" | "筋肉質" | "ポチャ";
type HairStyle = "坊主" | "短髪" | "前髪" | "パーマ" | "ロング";
type PreferredAge = "歳上好き" | "歳下好き" | "同世代" | "なんでも";
type DisplayMode = "all" | "community" | "favorites";

type NearbyUser = {
  uid: string;
  name: string;
  age: number;
  height: number;
  weight: number;
  position: Position;
  bodyType?: BodyType;
  hairStyle?: HairStyle;
  preferredAge?: PreferredAge;
  communityIds: string[];
  images: string[];
  distance: number;
  lastOnline: Timestamp | null;
};

type FilterState = {
  ageMin: string;
  ageMax: string;
  heightMin: string;
  heightMax: string;
  position: "all" | Position;
  bodyType: "all" | BodyType;
  hairStyle: "all" | HairStyle;
  preferredAge: "all" | PreferredAge;
  communityId: string;
};

const BODY_TYPE_OPTIONS: Array<"all" | BodyType> = ["all", "細い", "スジ筋", "普通", "筋肉質", "ポチャ"];
const HAIR_STYLE_OPTIONS: Array<"all" | HairStyle> = ["all", "坊主", "短髪", "前髪", "パーマ", "ロング"];
const PREFERRED_AGE_OPTIONS: Array<"all" | PreferredAge> = ["all", "歳上好き", "歳下好き", "同世代", "なんでも"];

const DEFAULT_FILTER: FilterState = {
  ageMin: "", ageMax: "",
  heightMin: "", heightMax: "",
  position: "all",
  bodyType: "all",
  hairStyle: "all",
  preferredAge: "all",
  communityId: "",
};

function countActiveFilters(f: FilterState): number {
  return [f.ageMin, f.ageMax, f.heightMin, f.heightMax].filter(Boolean).length +
    (f.position !== "all" ? 1 : 0) +
    (f.bodyType !== "all" ? 1 : 0) +
    (f.hairStyle !== "all" ? 1 : 0) +
    (f.preferredAge !== "all" ? 1 : 0) +
    (f.communityId !== "" ? 1 : 0);
}

function applyFilters(users: NearbyUser[], f: FilterState, communityIds: Set<string>, mode: DisplayMode): NearbyUser[] {
  return users.filter((u) => {
    if (mode === "community" && !communityIds.has(u.uid)) return false;
    if (f.ageMin && u.age < Number(f.ageMin)) return false;
    if (f.ageMax && u.age > Number(f.ageMax)) return false;
    if (f.heightMin && u.height < Number(f.heightMin)) return false;
    if (f.heightMax && u.height > Number(f.heightMax)) return false;
    if (f.position !== "all" && u.position !== f.position) return false;
    if (f.bodyType !== "all" && u.bodyType !== f.bodyType) return false;
    if (f.hairStyle !== "all" && u.hairStyle !== f.hairStyle) return false;
    if (f.preferredAge !== "all" && u.preferredAge !== f.preferredAge) return false;
    if (f.communityId && !u.communityIds.includes(f.communityId)) return false;
    return true;
  });
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "done" | "warn">("idle");
  const [locationWarning, setLocationWarning] = useState("");
  const [allUsers, setAllUsers] = useState<NearbyUser[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  const [displayMode, setDisplayMode] = useState<DisplayMode>("all");
  const [communityUserIds, setCommunityUserIds] = useState<Set<string>>(new Set());
  const [favoriteUserIds, setFavoriteUserIds] = useState<Set<string>>(new Set());

  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [pendingFilter, setPendingFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);

  const activeFilterCount = countActiveFilters(filter);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { router.replace("/auth/login"); return; }
      setUser(currentUser);
      setAuthLoading(false);
      updateLastOnline(currentUser.uid);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    initLocation(user.uid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const initLocation = async (uid: string) => {
    const handleLoadUsersError = (err: unknown) => {
      const msg = err instanceof Error ? err.message : "ユーザー情報の取得に失敗しました";
      console.warn("[Home] ユーザー取得エラー:", msg);
      if (msg.includes("Missing or insufficient permissions")) {
        setLocationWarning("ユーザー情報の読み取り権限が不足しています。Firestoreルールで users コレクションの read/update を許可してください");
      } else {
        setLocationWarning(`ユーザー情報の取得に失敗しました: ${msg}`);
      }
      setLocationStatus("warn");
    };

    setLocationStatus("loading");
    setLocationWarning("");
    const permissionState = await getLocationPermissionState();
    if (permissionState === "denied") {
      setLocationWarning("位置情報がブラウザで拒否されています。サイト設定から位置情報を許可して再試行してください");
      setLocationStatus("warn");
      try {
        await loadUsers(uid, null, null);
      } catch (err) {
        handleLoadUsersError(err);
      }
      return;
    }

    try {
      const coords = await getCurrentPosition();
      const { latitude, longitude } = coords;
      try {
        await updateDoc(doc(db, "users", uid), { location: { lat: latitude, lng: longitude } });
      } catch (e) { console.warn("[Home] location保存失敗:", e); }
      setLocationStatus("done");
      try {
        await loadUsers(uid, latitude, longitude);
      } catch (err) {
        handleLoadUsersError(err);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "位置情報を取得できませんでした";
      console.warn("[Home] 位置情報エラー:", msg);
      setLocationWarning(msg);
      setLocationStatus("warn");
      try {
        await loadUsers(uid, null, null);
      } catch (loadErr) {
        handleLoadUsersError(loadErr);
      }
    }
  };

  const loadUsers = async (myUid: string, myLat: number | null, myLng: number | null) => {
    setFetchingUsers(true);
    try {
      const [snapshot, blockedList, mutedList, myCommIds, allComms] = await Promise.all([
        getDocs(collection(db, "users")),
        getBlockedUsers(myUid),
        getMutedUsers(myUid),
        getUserCommunityIds(myUid),
        getCommunities(),
      ]);
      const favoriteIds = await getFavoritedUserIds(myUid);

      const sharedIds = await getSharedCommunityUserIds(myUid, myCommIds);
      setCommunityUserIds(new Set(sharedIds));
      setFavoriteUserIds(new Set(favoriteIds));
      setMyCommunities(allComms.filter((c) => myCommIds.includes(c.id)));

      const results: NearbyUser[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.id === myUid) return;
        if (blockedList.includes(docSnap.id)) return;
        if (mutedList.includes(docSnap.id)) return;
        const data = docSnap.data();
        if (!data.name) return;

        const entry: Omit<NearbyUser, "distance"> & { distance?: number } = {
          uid: docSnap.id,
          name: data.name,
          age: data.age ?? 0,
          height: data.height ?? 0,
          weight: data.weight ?? 0,
          position: (data.position as Position) ?? "versatile",
          bodyType: data.bodyType as BodyType | undefined,
          hairStyle: data.hairStyle as HairStyle | undefined,
          preferredAge: data.preferredAge as PreferredAge | undefined,
          communityIds: (data.communities as string[]) ?? [],
          images: data.images ?? [],
          lastOnline: data.lastOnline ?? null,
        };

        if (myLat !== null && myLng !== null) {
          if (!data.location?.lat || !data.location?.lng) return;
          const dist = calcDistance(myLat, myLng, data.location.lat, data.location.lng);
          if (dist <= RADIUS_M) results.push({ ...entry, distance: dist });
        } else {
          results.push({ ...entry, distance: -1 });
        }
      });

      results.sort((a, b) => a.distance === -1 || b.distance === -1 ? 0 : a.distance - b.distance);
      setAllUsers(results);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleApplyFilter = () => { setFilter(pendingFilter); setFilterOpen(false); };
  const handleResetFilter = () => { setPendingFilter(DEFAULT_FILTER); setFilter(DEFAULT_FILTER); setFilterOpen(false); };
  const baseUsers = displayMode === "favorites"
    ? allUsers
        .filter((u) => favoriteUserIds.has(u.uid))
        .sort((a, b) => {
          const aDist = a.distance;
          const bDist = b.distance;
          if (aDist < 0 && bDist < 0) return 0;
          if (aDist < 0) return 1;
          if (bDist < 0) return -1;
          return aDist - bDist;
        })
    : applyFilters(allUsers, filter, communityUserIds, displayMode);
  const visibleUsers = baseUsers;
  const isReady = locationStatus === "done" || locationStatus === "warn";

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
        {/* Header */}
        <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-black tracking-widest text-[#00f5ff] neon-text-cyan">RAISE</h1>
          <div className="flex items-center gap-1">
            {/* フィルターボタン */}
            <button onClick={() => { setPendingFilter(filter); setFilterOpen(true); }}
              className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition" aria-label="フィルター">
              <svg className={`w-5 h-5 ${activeFilterCount > 0 ? "text-[#ff2d78]" : "text-[#8888aa]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#ff2d78] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <HamburgerMenuButton />
          </div>
        </header>

        <div className="flex-1 px-4 py-4 w-full max-w-[480px] mx-auto">

          {/* 位置情報ステータス */}
          {locationStatus === "loading" && (
            <div className="flex items-center gap-2 text-[#00f5ff] text-sm mb-4">
              <div className="w-4 h-4 border-2 border-[#00f5ff] border-t-transparent rounded-full animate-spin" />
              位置情報を取得中...
            </div>
          )}
          {locationStatus === "warn" && locationWarning && (
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
              <svg className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-yellow-400 text-xs">位置情報またはデータ取得でエラーが発生しました</p>
                <p className="text-yellow-200 text-[11px] mt-1 break-words">{locationWarning}</p>
                <p className="text-yellow-300/80 text-[11px] mt-1">
                  {locationWarning.includes("Firestore")
                    ? "ヒント: Firestoreルールを更新後、再デプロイしてから再試行してください"
                    : "ヒント: ブラウザのサイト設定で位置情報を「許可」に変更すると改善することがあります"}
                </p>
                <button onClick={() => user && initLocation(user.uid)} className="mt-1 text-[#00f5ff] text-xs underline">再試行</button>
              </div>
            </div>
          )}

          {/* 表示モードタブ */}
          {isReady && !fetchingUsers && (
            <div className="flex gap-2 mb-4">
              <button onClick={() => setDisplayMode("all")}
                className={`h-8 px-4 rounded-full text-xs font-medium border transition ${displayMode === "all" ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white" : "bg-[#12121f] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/50"}`}>
                全員
              </button>
              <button onClick={() => setDisplayMode("community")}
                className={`h-8 px-4 rounded-full text-xs font-medium border transition flex items-center gap-1.5 ${displayMode === "community" ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white" : "bg-[#12121f] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/50"}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                コミュニティ
              </button>
              <button onClick={() => setDisplayMode("favorites")}
                className={`h-8 px-4 rounded-full text-xs font-medium border transition flex items-center gap-1.5 ${displayMode === "favorites" ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white" : "bg-[#12121f] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/50"}`}>
                <svg className="w-3.5 h-3.5" fill={displayMode === "favorites" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 3 13.274 3 10.5a4.5 4.5 0 018.145-2.579L12 9.17l.855-1.249A4.5 4.5 0 0121 10.5c0 2.774-1.688 4.86-3.989 7.007a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.218l-.022.012-.007.004-.003.001a.75.75 0 01-.704 0l-.003-.001z" />
                </svg>
                お気に入り
              </button>
              {activeFilterCount > 0 && (
                <button onClick={handleResetFilter}
                  className="h-8 px-3 rounded-full text-xs font-medium border border-[#ff2d78]/50 text-[#ff2d78] bg-[#ff2d78]/10 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  フィルター解除
                </button>
              )}
            </div>
          )}

          {fetchingUsers && (
            <div className="flex items-center gap-2 text-[#8888aa] text-sm mb-4">
              <div className="w-4 h-4 border-2 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
              ユーザーを検索中...
            </div>
          )}

          {isReady && !fetchingUsers && (
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-base">
                {displayMode === "favorites" ? "お気に入りユーザー" : displayMode === "community" ? "コミュニティメンバー" : locationStatus === "warn" ? "ユーザー一覧" : "近くのユーザー"}
                {visibleUsers.length > 0 && <span className="ml-2 text-[#ff2d78] text-sm font-normal">{visibleUsers.length}人</span>}
              </h2>
              {locationStatus === "done" && displayMode === "all" && (
                <span className="text-[#8888aa] text-xs">半径100km以内</span>
              )}
            </div>
          )}

          {/* カードグリッド */}
          {isReady && !fetchingUsers && visibleUsers.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {visibleUsers.map((u) => {
                const online = isOnline(u.lastOnline);
                return (
                  <button key={u.uid} onClick={() => router.push(`/profile/${u.uid}`)}
                    className="bg-[#12121f] border border-[#ff2d78]/20 hover:border-[#ff2d78]/50 rounded-2xl overflow-hidden text-left active:scale-95 transition-all">
                    <div className="relative w-full aspect-square bg-[#0d0d1a]">
                      {u.images[0] ? (
                        <Image src={u.images[0]} alt={u.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-10 h-10 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      {/* オンラインバッジ */}
                      {online && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full border-2 border-[#12121f]" />
                      )}
                      {/* 距離バッジ */}
                      {u.distance >= 0 && (
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 border border-[#ff2d78]/20">
                          <span className="text-white text-xs font-medium">{formatDistance(u.distance)}</span>
                        </div>
                      )}
                      {/* コミュニティバッジ */}
                      {communityUserIds.has(u.uid) && (
                        <div className="absolute top-2 left-2 bg-[#bf00ff]/70 backdrop-blur-sm rounded-full p-1 border border-[#bf00ff]/40">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white text-sm font-semibold truncate">{u.name}</p>
                        {online && <span className="shrink-0 text-[10px] text-green-400 font-medium">●</span>}
                      </div>
                      <p className="text-[#8888aa] text-xs mt-0.5">{u.age}歳</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 空状態 */}
          {isReady && !fetchingUsers && visibleUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-[#12121f] border border-[#ff2d78]/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">ユーザーが見つかりません</p>
              <p className="text-[#8888aa] text-sm mb-5">
                {activeFilterCount > 0 ? "フィルター条件に合うユーザーがいません" : "近くにユーザーがいませんでした"}
              </p>
              {activeFilterCount > 0 ? (
                <button onClick={handleResetFilter}
                  className="h-10 px-6 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] hover:opacity-90 text-white text-sm font-medium rounded-xl transition">
                  フィルターをリセット
                </button>
              ) : (
                <button onClick={() => user && initLocation(user.uid)}
                  className="h-10 px-6 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] hover:opacity-90 text-white text-sm font-medium rounded-xl transition">
                  再検索
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* フィルタードロワー */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setFilterOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-[480px] bg-[#12121f] border border-[#ff2d78]/20 rounded-t-2xl px-5 pt-4 pb-8 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#ff2d78]/30 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-base">絞り込み</h2>
              <button onClick={() => setFilterOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition">
                <svg className="w-4 h-4 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              {/* 年齢 */}
              <div>
                <p className="text-[#8888aa] text-sm font-medium mb-2">年齢</p>
                <div className="flex items-center gap-2">
                  <input type="number" min={18} max={100} value={pendingFilter.ageMin}
                    onChange={(e) => setPendingFilter((f) => ({ ...f, ageMin: e.target.value }))}
                    placeholder="最小"
                    className="flex-1 bg-[#0d0d1a] text-white text-sm border border-[#ff2d78]/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00f5ff] transition" />
                  <span className="text-[#8888aa] text-sm">〜</span>
                  <input type="number" min={18} max={100} value={pendingFilter.ageMax}
                    onChange={(e) => setPendingFilter((f) => ({ ...f, ageMax: e.target.value }))}
                    placeholder="最大"
                    className="flex-1 bg-[#0d0d1a] text-white text-sm border border-[#ff2d78]/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00f5ff] transition" />
                  <span className="text-[#8888aa] text-xs">歳</span>
                </div>
              </div>

              {/* 身長 */}
              <div>
                <p className="text-[#8888aa] text-sm font-medium mb-2">身長</p>
                <div className="flex items-center gap-2">
                  <input type="number" min={140} max={220} value={pendingFilter.heightMin}
                    onChange={(e) => setPendingFilter((f) => ({ ...f, heightMin: e.target.value }))}
                    placeholder="最小"
                    className="flex-1 bg-[#0d0d1a] text-white text-sm border border-[#ff2d78]/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00f5ff] transition" />
                  <span className="text-[#8888aa] text-sm">〜</span>
                  <input type="number" min={140} max={220} value={pendingFilter.heightMax}
                    onChange={(e) => setPendingFilter((f) => ({ ...f, heightMax: e.target.value }))}
                    placeholder="最大"
                    className="flex-1 bg-[#0d0d1a] text-white text-sm border border-[#ff2d78]/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00f5ff] transition" />
                  <span className="text-[#8888aa] text-xs">cm</span>
                </div>
              </div>

              {/* ポジション */}
              <div>
                <p className="text-[#8888aa] text-sm font-medium mb-2">ポジション</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["all", "top", "bottom", "versatile", "side"] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setPendingFilter((f) => ({ ...f, position: p }))}
                      className={`h-10 rounded-xl text-xs font-medium border transition ${
                        pendingFilter.position === p
                          ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white"
                          : "bg-[#0d0d1a] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/50"
                      }`}>
                      {p === "all" ? "すべて" : p === "top" ? "Top" : p === "bottom" ? "Bottom" : p === "versatile" ? "Versatile" : "Side"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 体型 */}
              <div>
                <p className="text-[#8888aa] text-sm font-medium mb-2">体型</p>
                <div className="grid grid-cols-3 gap-2">
                  {BODY_TYPE_OPTIONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPendingFilter((f) => ({ ...f, bodyType: value }))}
                      className={`h-10 rounded-xl text-xs font-medium border transition ${
                        pendingFilter.bodyType === value
                          ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white"
                          : "bg-[#0d0d1a] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/50"
                      }`}
                    >
                      {value === "all" ? "すべて" : value}
                    </button>
                  ))}
                </div>
              </div>

              {/* 髪型 */}
              <div>
                <p className="text-[#8888aa] text-sm font-medium mb-2">髪型</p>
                <div className="grid grid-cols-3 gap-2">
                  {HAIR_STYLE_OPTIONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPendingFilter((f) => ({ ...f, hairStyle: value }))}
                      className={`h-10 rounded-xl text-xs font-medium border transition ${
                        pendingFilter.hairStyle === value
                          ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white"
                          : "bg-[#0d0d1a] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/50"
                      }`}
                    >
                      {value === "all" ? "すべて" : value}
                    </button>
                  ))}
                </div>
              </div>

              {/* 好み年齢 */}
              <div>
                <p className="text-[#8888aa] text-sm font-medium mb-2">好み年齢</p>
                <div className="grid grid-cols-2 gap-2">
                  {PREFERRED_AGE_OPTIONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPendingFilter((f) => ({ ...f, preferredAge: value }))}
                      className={`h-10 rounded-xl text-xs font-medium border transition ${
                        pendingFilter.preferredAge === value
                          ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white"
                          : "bg-[#0d0d1a] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/50"
                      }`}
                    >
                      {value === "all" ? "すべて" : value}
                    </button>
                  ))}
                </div>
              </div>

              {/* コミュニティ */}
              {myCommunities.length > 0 && (
                <div>
                  <p className="text-[#8888aa] text-sm font-medium mb-2">コミュニティ</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setPendingFilter((f) => ({ ...f, communityId: "" }))}
                      className={`h-8 px-3 rounded-full text-xs font-medium border transition ${
                        pendingFilter.communityId === ""
                          ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white"
                          : "bg-[#0d0d1a] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/50"
                      }`}>すべて</button>
                    {myCommunities.map((c) => (
                      <button key={c.id} onClick={() => setPendingFilter((f) => ({ ...f, communityId: c.id }))}
                        className={`h-8 px-3 rounded-full text-xs font-medium border transition ${
                          pendingFilter.communityId === c.id
                            ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white"
                            : "bg-[#0d0d1a] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/50"
                        }`}>{c.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleResetFilter}
                className="flex-1 h-11 bg-[#0d0d1a] border border-[#ff2d78]/20 hover:border-[#ff2d78]/50 text-[#8888aa] text-sm font-medium rounded-xl transition">
                リセット
              </button>
              <button onClick={handleApplyFilter}
                className="flex-1 h-11 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition">
                適用する
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

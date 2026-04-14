"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  closeMutualAlbumAccess,
  getMyMutualAlbumAccess,
  MutualAlbumAccessItem,
} from "@/lib/albumAccess";

type RowItem = MutualAlbumAccessItem & {
  name: string;
  image: string;
  age: number;
  online: boolean;
};

function formatTime(ts: Timestamp | null): string {
  if (!ts) return "";
  const d = ts.toDate();
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}時間前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function isOnline(lastOnline: Timestamp | null | undefined): boolean {
  if (!lastOnline) return false;
  const diffMs = Date.now() - lastOnline.toDate().getTime();
  return diffMs < 5 * 60 * 1000;
}

function formatRemain(openedAt: Timestamp | null): string {
  if (!openedAt) return "";
  const lockMs = 12 * 60 * 60 * 1000;
  const remainMs = openedAt.toMillis() + lockMs - Date.now();
  if (remainMs <= 0) return "";
  const h = Math.floor(remainMs / (60 * 60 * 1000));
  const m = Math.ceil((remainMs % (60 * 60 * 1000)) / 60000);
  return `${h}時間${m}分`;
}

export default function AlbumMenuPage() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [closingPairId, setClosingPairId] = useState<string | null>(null);

  const loadRows = async (userId: string) => {
    setLoading(true);
    try {
      const access = await getMyMutualAlbumAccess(userId);
      const enriched = await Promise.all(
        access.map(async (item) => {
          try {
            const snap = await getDoc(doc(db, "users", item.otherUid));
            if (!snap.exists()) return null;
            const data = snap.data();
            return {
              ...item,
              name: data.name ?? "Unknown",
              image: data.images?.[0] ?? "",
              age: data.age ?? 0,
              online: isOnline(data.lastOnline ?? null),
            } as RowItem;
          } catch {
            return null;
          }
        })
      );
      setRows(enriched.filter((v): v is RowItem => v !== null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/auth/login");
        return;
      }
      setUid(u.uid);
      loadRows(u.uid);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = async (pairId: string) => {
    if (!uid || closingPairId) return;
    if (!confirm("このユーザーとのアルバム相互公開を非公開にしますか？")) return;
    setClosingPairId(pairId);
    try {
      await closeMutualAlbumAccess(pairId, uid);
      await loadRows(uid);
    } catch (err) {
      alert(err instanceof Error ? err.message : "非公開に失敗しました");
    } finally {
      setClosingPairId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition" aria-label="戻る">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-[#00f5ff] neon-text-cyan">アルバム</h1>
      </header>

      <div className="w-full max-w-[480px] mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-[#12121f] border border-[#ff2d78]/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-white font-medium mb-1">相互公開中のユーザーはいません</p>
            <p className="text-[#8888aa] text-sm">承認済みの相手がここに表示されます</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#ff2d78]/10 bg-[#12121f] border border-[#ff2d78]/20 rounded-2xl overflow-hidden">
            {rows.map((row) => {
              const latestOpenedAt =
                row.face && row.body
                  ? (row.faceOpenedAt && row.bodyOpenedAt
                      ? (row.faceOpenedAt.toMillis() > row.bodyOpenedAt.toMillis() ? row.faceOpenedAt : row.bodyOpenedAt)
                      : row.faceOpenedAt ?? row.bodyOpenedAt)
                  : row.face
                    ? row.faceOpenedAt
                    : row.bodyOpenedAt;
              const remain = formatRemain(latestOpenedAt ?? null);
              return (
                <li key={row.pairId} className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push(`/profile/${row.otherUid}`)}
                      className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#0d0d1a] border border-[#ff2d78]/20 shrink-0"
                    >
                      {row.image ? (
                        <Image src={row.image} alt={row.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-6 h-6 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white text-sm font-semibold truncate">{row.name}</p>
                        {row.online && <span className="shrink-0 text-[10px] text-green-400 font-medium">●</span>}
                      </div>
                      <p className="text-[#8888aa] text-xs mt-0.5">{row.age}歳</p>
                      <p className="text-[#00f5ff] text-[11px] mt-0.5">
                        公開中: {row.face ? "顔" : ""}{row.face && row.body ? "・" : ""}{row.body ? "体" : ""}
                        {latestOpenedAt ? ` / ${formatTime(latestOpenedAt)}` : ""}
                      </p>
                    </div>
                  </div>
                  {remain ? (
                    <p className="mt-2 text-[11px] text-yellow-300">相互公開から12時間経過後に非公開できます（あと{remain}）</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleClose(row.pairId)}
                    disabled={Boolean(remain) || closingPairId !== null}
                    className="mt-3 w-full h-9 rounded-lg border border-[#ff2d78]/40 text-[#ff2d78] text-xs font-medium hover:border-[#ff2d78] bg-[#ff2d78]/10 disabled:opacity-50"
                  >
                    相互非公開にする
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

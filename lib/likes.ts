import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Like = {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: Timestamp | null;
};

// いいねを送る（likeId = fromUserId_toUserId で冪等）
export async function sendLike(fromUserId: string, toUserId: string): Promise<void> {
  const likeId = `${fromUserId}_${toUserId}`;
  await setDoc(doc(db, "likes", likeId), {
    fromUserId,
    toUserId,
    createdAt: serverTimestamp(),
  });
}

// いいねを取り消す
export async function removeLike(fromUserId: string, toUserId: string): Promise<void> {
  const likeId = `${fromUserId}_${toUserId}`;
  await deleteDoc(doc(db, "likes", likeId));
}

// 既にいいね済みか確認
export async function hasLiked(fromUserId: string, toUserId: string): Promise<boolean> {
  const likeId = `${fromUserId}_${toUserId}`;
  try {
    const snap = await getDoc(doc(db, "likes", likeId));
    return snap.exists();
  } catch {
    return false;
  }
}

// 自分が送ったいいね一覧（新しい順）
// orderBy を省いてクライアント側でソート → コンポジットインデックス不要
export async function getLikesSent(fromUserId: string): Promise<Like[]> {
  const q = query(
    collection(db, "likes"),
    where("fromUserId", "==", fromUserId)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Like, "id">),
  }));
  return results.sort((a, b) => {
    const ta = a.createdAt?.toMillis() ?? 0;
    const tb = b.createdAt?.toMillis() ?? 0;
    return tb - ta;
  });
}

// 自分が受け取ったいいね一覧（新しい順）
export async function getLikesReceived(toUserId: string): Promise<Like[]> {
  const q = query(
    collection(db, "likes"),
    where("toUserId", "==", toUserId)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Like, "id">),
  }));
  return results.sort((a, b) => {
    const ta = a.createdAt?.toMillis() ?? 0;
    const tb = b.createdAt?.toMillis() ?? 0;
    return tb - ta;
  });
}

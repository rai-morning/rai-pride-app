import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ProfileView = {
  viewerId: string;
  viewedAt: Timestamp | null;
};

// プロフィール閲覧を記録（自己閲覧は無視）
export async function recordProfileView(
  viewerId: string,
  profileOwnerId: string
): Promise<void> {
  if (viewerId === profileOwnerId) return;
  try {
    await setDoc(
      doc(db, "profileViews", profileOwnerId, "views", viewerId),
      { viewerId, viewedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {
    // 権限エラーなど無視
  }
}

// 自分のプロフィールを見たユーザー一覧（新しい順）
export async function getProfileViewers(userId: string): Promise<ProfileView[]> {
  const q = query(
    collection(db, "profileViews", userId, "views"),
    orderBy("viewedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    viewerId: d.id,
    ...(d.data() as Omit<ProfileView, "viewerId">),
  }));
}

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type NotificationType = "like" | "view";

export type AppNotification = {
  id: string;
  type: NotificationType;
  fromUserId: string;
  isRead: boolean;
  createdAt: Timestamp | null;
};

// 通知を追加（自己通知は無視）
export async function addNotification(
  toUserId: string,
  type: NotificationType,
  fromUserId: string
): Promise<void> {
  if (toUserId === fromUserId) return;
  try {
    await addDoc(collection(db, "notifications", toUserId, "items"), {
      type,
      fromUserId,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch {
    // 権限エラーなど無視
  }
}

// 通知一覧を取得
export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const q = query(
    collection(db, "notifications", userId, "items"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AppNotification, "id">),
  }));
}

// 未読通知をリアルタイム購読（バッジ用）
export function subscribeUnreadCount(
  userId: string,
  callback: (count: number) => void
): () => void {
  const q = query(
    collection(db, "notifications", userId, "items"),
    where("isRead", "==", false)
  );
  return onSnapshot(q, (snap) => callback(snap.size), () => callback(0));
}

// 全通知を既読にする
export async function markAllRead(userId: string): Promise<void> {
  const q = query(
    collection(db, "notifications", userId, "items"),
    where("isRead", "==", false)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { isRead: true })));
}

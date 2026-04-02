import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ユーザーをブロック
export async function blockUser(myUid: string, targetUid: string): Promise<void> {
  await updateDoc(doc(db, "users", myUid), {
    blocked_users: arrayUnion(targetUid),
  });
}

// 自分のブロックリストを取得
export async function getBlockedUsers(myUid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "users", myUid));
  if (!snap.exists()) return [];
  return (snap.data().blocked_users as string[]) ?? [];
}

// 通報
export async function reportUser(
  reporterId: string,
  targetId: string,
  reason: string
): Promise<void> {
  await addDoc(collection(db, "reports"), {
    reporterId,
    targetId,
    reason,
    createdAt: serverTimestamp(),
  });
}

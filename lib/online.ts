import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function updateLastOnline(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, "users", uid), { lastOnline: serverTimestamp() });
  } catch {
    // プロフィール未作成の場合など無視
  }
}

export function isOnline(lastOnline: Timestamp | null | undefined): boolean {
  if (!lastOnline) return false;
  return Date.now() - lastOnline.toDate().getTime() < 5 * 60 * 1000;
}

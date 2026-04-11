import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function muteUser(myUid: string, targetUid: string): Promise<void> {
  await updateDoc(doc(db, "users", myUid), { muted_users: arrayUnion(targetUid) });
}

export async function unmuteUser(myUid: string, targetUid: string): Promise<void> {
  await updateDoc(doc(db, "users", myUid), { muted_users: arrayRemove(targetUid) });
}

export async function getMutedUsers(myUid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "users", myUid));
  if (!snap.exists()) return [];
  return (snap.data().muted_users as string[]) ?? [];
}

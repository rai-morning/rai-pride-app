import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function addFavorite(fromUserId: string, toUserId: string): Promise<void> {
  const favoriteId = `${fromUserId}_${toUserId}`;
  await setDoc(doc(db, "favorites", favoriteId), {
    fromUserId,
    toUserId,
    createdAt: serverTimestamp(),
  });
}

export async function removeFavorite(fromUserId: string, toUserId: string): Promise<void> {
  const favoriteId = `${fromUserId}_${toUserId}`;
  await deleteDoc(doc(db, "favorites", favoriteId));
}

export async function hasFavorited(fromUserId: string, toUserId: string): Promise<boolean> {
  const favoriteId = `${fromUserId}_${toUserId}`;
  try {
    const snap = await getDoc(doc(db, "favorites", favoriteId));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getFavoritedUserIds(fromUserId: string): Promise<string[]> {
  const q = query(collection(db, "favorites"), where("fromUserId", "==", fromUserId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as { toUserId?: string };
    return data.toUserId ?? "";
  }).filter(Boolean);
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AlbumType = "face" | "body";
export type AlbumRequestStatus = "pending" | "approved" | "rejected";

export type AlbumRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: AlbumType;
  status: AlbumRequestStatus;
  createdAt: Timestamp | null;
  respondedAt?: Timestamp | null;
};

export type AlbumAccess = {
  face: boolean;
  body: boolean;
};

function getPairId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

function getRequestId(type: AlbumType, fromUserId: string, toUserId: string): string {
  return `${type}_${fromUserId}_${toUserId}`;
}

export async function getAlbumAccessBetween(myUid: string, otherUid: string): Promise<AlbumAccess> {
  const pairId = getPairId(myUid, otherUid);
  try {
    const snap = await getDoc(doc(db, "albumAccess", pairId));
    if (!snap.exists()) return { face: false, body: false };
    const data = snap.data();
    return {
      face: Boolean(data.face),
      body: Boolean(data.body),
    };
  } catch {
    return { face: false, body: false };
  }
}

export async function getMyPendingAlbumRequestMap(fromUserId: string, toUserId: string): Promise<Record<AlbumType, boolean>> {
  const q = query(
    collection(db, "albumRequests"),
    where("fromUserId", "==", fromUserId),
    where("toUserId", "==", toUserId),
    where("status", "==", "pending")
  );
  try {
    const snap = await getDocs(q);
    const map: Record<AlbumType, boolean> = { face: false, body: false };
    snap.docs.forEach((d) => {
      const type = d.data().type as AlbumType | undefined;
      if (type === "face" || type === "body") map[type] = true;
    });
    return map;
  } catch {
    return { face: false, body: false };
  }
}

export async function requestAlbumAccess(fromUserId: string, toUserId: string, type: AlbumType): Promise<void> {
  if (!fromUserId || !toUserId || fromUserId === toUserId) return;
  const requestId = getRequestId(type, fromUserId, toUserId);
  await setDoc(
    doc(db, "albumRequests", requestId),
    {
      fromUserId,
      toUserId,
      type,
      status: "pending",
      createdAt: serverTimestamp(),
      respondedAt: null,
    },
    { merge: true }
  );
}

export async function getReceivedPendingAlbumRequests(userId: string): Promise<AlbumRequest[]> {
  const q = query(
    collection(db, "albumRequests"),
    where("toUserId", "==", userId),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<AlbumRequest, "id">) }))
    .sort((a, b) => {
      const aSec = a.createdAt?.seconds ?? 0;
      const bSec = b.createdAt?.seconds ?? 0;
      return bSec - aSec;
    });
}

export async function approveAlbumRequest(requestId: string, currentUid: string): Promise<void> {
  const reqRef = doc(db, "albumRequests", requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error("申請が見つかりません");
  const req = reqSnap.data() as Omit<AlbumRequest, "id">;
  if (req.toUserId !== currentUid) throw new Error("承認権限がありません");
  if (req.status !== "pending") return;

  await updateDoc(reqRef, {
    status: "approved",
    respondedAt: serverTimestamp(),
  });

  const pairId = getPairId(req.fromUserId, req.toUserId);
  await setDoc(
    doc(db, "albumAccess", pairId),
    {
      users: [req.fromUserId, req.toUserId].sort(),
      [req.type]: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function rejectAlbumRequest(requestId: string, currentUid: string): Promise<void> {
  const reqRef = doc(db, "albumRequests", requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error("申請が見つかりません");
  const req = reqSnap.data() as Omit<AlbumRequest, "id">;
  if (req.toUserId !== currentUid) throw new Error("拒否権限がありません");
  if (req.status !== "pending") return;

  await updateDoc(reqRef, {
    status: "rejected",
    respondedAt: serverTimestamp(),
  });
}

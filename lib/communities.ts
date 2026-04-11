import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Category = "体型" | "趣味" | "その他";

export type Community = {
  id: string;
  name: string;
  description: string;
  category: Category;
  creatorId: string;
  memberCount: number;
  createdAt: Timestamp | null;
};

export type CommunityMember = {
  uid: string;
  name: string;
  age: number;
  images: string[];
};

const DEFAULTS: Omit<Community, "id" | "createdAt">[] = [
  { name: "筋肉系", description: "筋トレやボディメイクが好きな人のコミュニティ", category: "体型", creatorId: "system", memberCount: 0 },
  { name: "細身系", description: "スリムな体型の人が集まるコミュニティ", category: "体型", creatorId: "system", memberCount: 0 },
  { name: "ぽっちゃり系", description: "ぽっちゃり体型を愛するコミュニティ", category: "体型", creatorId: "system", memberCount: 0 },
  { name: "スポーツ好き", description: "スポーツ観戦・プレイが好きな人のコミュニティ", category: "趣味", creatorId: "system", memberCount: 0 },
  { name: "音楽好き", description: "音楽を聴く・演奏する人のコミュニティ", category: "趣味", creatorId: "system", memberCount: 0 },
  { name: "アウトドア好き", description: "キャンプやハイキングが好きな人のコミュニティ", category: "趣味", creatorId: "system", memberCount: 0 },
];

// デフォルトコミュニティが未作成なら作成
export async function ensureDefaultCommunities(): Promise<void> {
  const snap = await getDocs(collection(db, "communities"));
  if (snap.size > 0) return;
  await Promise.all(
    DEFAULTS.map((c) =>
      addDoc(collection(db, "communities"), { ...c, createdAt: serverTimestamp() })
    )
  );
}

// 全コミュニティ一覧取得
export async function getCommunities(): Promise<Community[]> {
  const q = query(collection(db, "communities"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Community, "id">) }));
}

// ユーザーの参加コミュニティID一覧
export async function getUserCommunityIds(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return [];
  return (snap.data().communities as string[]) ?? [];
}

// 参加
export async function joinCommunity(uid: string, communityId: string): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, "users", uid), { communities: arrayUnion(communityId) }),
    updateDoc(doc(db, "communities", communityId), { memberCount: increment(1) }),
  ]);
}

// 脱退
export async function leaveCommunity(uid: string, communityId: string): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, "users", uid), { communities: arrayRemove(communityId) }),
    updateDoc(doc(db, "communities", communityId), { memberCount: increment(-1) }),
  ]);
}

// コミュニティのメンバー一覧（communities配列にcommunityIdを含むユーザー）
export async function getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
  const snap = await getDocs(collection(db, "users"));
  const members: CommunityMember[] = [];
  snap.forEach((d) => {
    const data = d.data();
    if ((data.communities as string[] | undefined)?.includes(communityId)) {
      members.push({
        uid: d.id,
        name: data.name ?? "",
        age: data.age ?? 0,
        images: data.images ?? [],
      });
    }
  });
  return members;
}

// 自分と共通コミュニティを持つユーザーのUID一覧
export async function getSharedCommunityUserIds(
  myUid: string,
  myCommIds: string[]
): Promise<string[]> {
  if (myCommIds.length === 0) return [];
  const snap = await getDocs(collection(db, "users"));
  const uids: string[] = [];
  snap.forEach((d) => {
    if (d.id === myUid) return;
    const comms = (d.data().communities as string[]) ?? [];
    if (comms.some((id) => myCommIds.includes(id))) uids.push(d.id);
  });
  return uids;
}

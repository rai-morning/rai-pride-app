import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  onSnapshot,
  Unsubscribe,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | null;
  isDeleted: boolean;
};

export type Conversation = {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  unreadCount: Record<string, number>;
};

// 2ユーザー間の会話IDを取得または新規作成
export async function getOrCreateConversation(
  myUid: string,
  otherUid: string
): Promise<string> {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", myUid)
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const data = d.data() as Conversation;
    if (data.participants.includes(otherUid)) return d.id;
  }
  // 新規作成
  const ref = await addDoc(collection(db, "conversations"), {
    participants: [myUid, otherUid],
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    unreadCount: { [myUid]: 0, [otherUid]: 0 },
  });
  return ref.id;
}

// 自分の全会話を取得（リアルタイム）
export function subscribeConversations(
  myUid: string,
  callback: (convs: Conversation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", myUid),
    orderBy("lastMessageAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const convs: Conversation[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Conversation, "id">),
    }));
    callback(convs);
  });
}

// メッセージ一覧をリアルタイム購読
export function subscribeMessages(
  conversationId: string,
  callback: (msgs: Message[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "messages", conversationId, "msgs"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    const msgs: Message[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Message, "id">),
    }));
    callback(msgs);
  });
}

// メッセージ送信
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  otherUid: string
): Promise<void> {
  await addDoc(collection(db, "messages", conversationId, "msgs"), {
    senderId,
    text,
    createdAt: serverTimestamp(),
    isDeleted: false,
  });
  // 会話の最終メッセージと未読カウントを更新
  const convRef = doc(db, "conversations", conversationId);
  const convSnap = await getDoc(convRef);
  const prev = (convSnap.data()?.unreadCount ?? {}) as Record<string, number>;
  await updateDoc(convRef, {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    unreadCount: {
      ...prev,
      [otherUid]: (prev[otherUid] ?? 0) + 1,
    },
  });
}

// 未読リセット
export async function markAsRead(
  conversationId: string,
  myUid: string
): Promise<void> {
  const convRef = doc(db, "conversations", conversationId);
  const snap = await getDoc(convRef);
  const prev = (snap.data()?.unreadCount ?? {}) as Record<string, number>;
  await updateDoc(convRef, {
    unreadCount: { ...prev, [myUid]: 0 },
  });
}

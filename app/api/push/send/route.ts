import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminMessaging } from "@/lib/firebase-admin";

async function verifyAuth(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new Error("Unauthorized");
  const decoded = await adminAuth().verifyIdToken(token);
  return decoded.uid;
}

function messageTextByType(type: string): string {
  switch (type) {
    case "like":
      return "あなたにいいねが届きました";
    case "album_request":
      return "アルバム公開の申請が届きました";
    case "dm":
      return "新しいメッセージが届きました";
    default:
      return "新しい通知があります";
  }
}

export async function POST(req: NextRequest) {
  try {
    const senderUid = await verifyAuth(req);
    const body = await req.json();
    const toUserId = String(body?.toUserId ?? "").trim();
    const type = String(body?.type ?? "").trim();
    const senderName = String(body?.senderName ?? "").trim() || "RAISE";
    const message = String(body?.message ?? "").trim() || messageTextByType(type);
    const badgeCount = Number(body?.badgeCount ?? 0);

    if (!toUserId || !type) {
      return NextResponse.json({ error: "toUserId and type are required" }, { status: 400 });
    }
    if (senderUid === toUserId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const tokenSnap = await adminDb()
      .collection("pushTokens")
      .doc(toUserId)
      .collection("tokens")
      .get();
    const tokens = tokenSnap.docs.map((d) => d.id).filter(Boolean);
    if (tokens.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, reason: "no_tokens" });
    }

    const payload = {
      notification: {
        title: senderName,
        body: message,
      },
      webpush: {
        notification: {
          icon: "/icon?size=192",
          badge: "/icon?size=192",
          data: { url: "/notifications" },
        },
        fcmOptions: {
          link: "/notifications",
        },
      },
      data: {
        title: senderName,
        body: message,
        url: "/notifications",
        badgeCount: String(badgeCount > 0 ? badgeCount : 1),
        icon: "/icon?size=192",
        badge: "/icon?size=192",
      },
      apns: {
        payload: {
          aps: {
            badge: badgeCount > 0 ? badgeCount : 1,
            sound: "default",
          },
        },
      },
      tokens,
    };

    const result = await adminMessaging().sendEachForMulticast(payload);

    const invalidTokens: string[] = [];
    result.responses.forEach((res, i) => {
      if (res.success) return;
      const code = res.error?.code ?? "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        invalidTokens.push(tokens[i]);
      }
    });

    if (invalidTokens.length > 0) {
      await Promise.all(
        invalidTokens.map((token) =>
          adminDb().collection("pushTokens").doc(toUserId).collection("tokens").doc(token).delete()
        )
      );
    }

    return NextResponse.json({
      ok: true,
      sent: result.successCount,
      failed: result.failureCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

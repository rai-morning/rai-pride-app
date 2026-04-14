import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

async function verifyAuth(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new Error("Unauthorized");
  const decoded = await adminAuth().verifyIdToken(token);
  return decoded.uid;
}

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyAuth(req);
    const body = await req.json();
    const token = String(body?.token ?? "").trim();
    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    await adminDb()
      .collection("pushTokens")
      .doc(uid)
      .collection("tokens")
      .doc(token)
      .set(
        {
          token,
          updatedAt: new Date(),
          userAgent: req.headers.get("user-agent") ?? "",
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "rai-pride/profiles";

  const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(signatureString).digest("hex");

  const uploadForm = new FormData();
  uploadForm.append("file", file);
  uploadForm.append("timestamp", timestamp);
  uploadForm.append("api_key", apiKey);
  uploadForm.append("signature", signature);
  uploadForm.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: uploadForm }
  );

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: "アップロードに失敗しました", detail }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ url: data.secure_url });
}

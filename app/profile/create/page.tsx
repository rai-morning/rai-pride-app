"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Position = "top" | "bottom" | "versatile";

const MAX_IMAGES = 5;

export default function ProfileCreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [position, setPosition] = useState<Position>("versatile");
  const [hobby, setHobby] = useState("");
  const [bio, setBio] = useState("");

  // 画像：ローカルプレビュー用
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadingIndexes, setUploadingIndexes] = useState<number[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/auth/login");
      } else {
        setUser(currentUser);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // ファイル選択時にプレビュー追加
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - imageFiles.length;
    const selected = files.slice(0, remaining);

    setImageFiles((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPreviews((prev) => [...prev, url]);
    });

    // 同じファイルを再選択できるようリセット
    e.target.value = "";
  };

  // 個別削除
  const handleRemove = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Cloudinaryへ1枚アップロード（Unsigned upload preset使用）
  const uploadImage = async (file: File, index: number): Promise<string> => {
    setUploadingIndexes((prev) => [...prev, index]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "uibxdch7");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dcp0seihk/image/upload`,
        { method: "POST", body: formData }
      );
      if (!response.ok) throw new Error("アップロード失敗");
      const data = await response.json();
      return data.secure_url as string;
    } finally {
      setUploadingIndexes((prev) => prev.filter((i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSaving(true);
    try {
      // 全画像をアップロード
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        setError("画像をアップロード中...");
        imageUrls = await Promise.all(
          imageFiles.map((file, i) => uploadImage(file, i))
        );
        setError("");
      }

      setError("プロフィールを保存中...");
      await setDoc(doc(db, "users", user.uid), {
        name,
        age: Number(age),
        height: Number(height),
        weight: Number(weight),
        position,
        hobby,
        bio,
        images: imageUrls,
        createdAt: new Date(),
      });
      router.push("/home");
    } catch (err) {
      console.error("保存エラー:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`保存に失敗しました: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0f1e] px-4 py-6">
      <div className="w-full max-w-[390px] mx-auto">
        <div className="bg-[#1a1f2e] rounded-2xl shadow-xl p-6">
          <h1 className="text-xl font-bold text-white text-center mb-1">プロフィール作成</h1>
          <p className="text-gray-400 text-center text-sm mb-7">あなたのプロフィールを入力してください</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 名前 */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">
                名前 <span className="text-blue-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="例：田中 太郎"
                className="w-full bg-[#252b3b] text-white text-base placeholder-gray-500 border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* 年齢・身長・体重（3列） */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "年齢", unit: "歳", value: age, setter: setAge, max: 120, placeholder: "25" },
                { label: "身長", unit: "cm", value: height, setter: setHeight, max: 300, placeholder: "170" },
                { label: "体重", unit: "kg", value: weight, setter: setWeight, max: 500, placeholder: "65" },
              ].map(({ label, unit, value, setter, max, placeholder }) => (
                <div key={label}>
                  <label className="block text-gray-300 text-sm font-medium mb-1.5">
                    {label} <span className="text-blue-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      required
                      min={1}
                      max={max}
                      placeholder={placeholder}
                      className="w-full bg-[#252b3b] text-white text-base placeholder-gray-500 border border-gray-600 rounded-xl px-2 py-3.5 pr-7 focus:outline-none focus:border-blue-500 transition"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
                      {unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ポジション */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                ポジション <span className="text-blue-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["top", "bottom", "versatile"] as Position[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPosition(p)}
                    className={`h-12 rounded-xl text-sm font-medium border transition ${
                      position === p
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-[#252b3b] border-gray-600 text-gray-400 active:bg-[#2e3548]"
                    }`}
                  >
                    {p === "top" ? "Top" : p === "bottom" ? "Bottom" : "Versatile"}
                  </button>
                ))}
              </div>
            </div>

            {/* 趣味 */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">趣味</label>
              <input
                type="text"
                value={hobby}
                onChange={(e) => setHobby(e.target.value)}
                placeholder="例：映画鑑賞、ジム、料理"
                className="w-full bg-[#252b3b] text-white text-base placeholder-gray-500 border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* 自己紹介 */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">自己紹介</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="自由に自己紹介を書いてください..."
                className="w-full bg-[#252b3b] text-white text-base placeholder-gray-500 border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 transition resize-none"
              />
            </div>

            {/* 画像アップロード */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                写真{" "}
                <span className="text-gray-500 font-normal">（最大{MAX_IMAGES}枚）</span>
              </label>

              {/* プレビューグリッド */}
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-600">
                      <Image
                        src={src}
                        alt={`プレビュー ${i + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {/* アップロード中オーバーレイ */}
                      {uploadingIndexes.includes(i) && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {/* 削除ボタン */}
                      {!uploadingIndexes.includes(i) && (
                        <button
                          type="button"
                          onClick={() => handleRemove(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs leading-none"
                          aria-label="削除"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 追加ボタン */}
              {imageFiles.length < MAX_IMAGES && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-12 bg-[#252b3b] border border-dashed border-gray-500 hover:border-blue-500 active:bg-[#2e3548] text-gray-400 hover:text-blue-400 text-sm rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    写真を追加（あと{MAX_IMAGES - imageFiles.length}枚）
                  </button>
                </>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
              {saving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {saving ? "保存中..." : "プロフィールを保存"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

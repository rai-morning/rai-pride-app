"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Position = "top" | "bottom" | "versatile" | "side";

const MAX_PROFILE_IMAGES = 3;
const MAX_FACE_IMAGES = 3;
const MAX_BODY_IMAGES = 3;

export default function ProfileCreatePage() {
  const router = useRouter();
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const faceFileInputRef = useRef<HTMLInputElement>(null);
  const bodyFileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [position, setPosition] = useState<Position>("versatile");
  const [hobby, setHobby] = useState("");
  const [bio, setBio] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [tiktokId, setTiktokId] = useState("");
  const [xId, setXId] = useState("");

  const [profileImageFiles, setProfileImageFiles] = useState<File[]>([]);
  const [profilePreviews, setProfilePreviews] = useState<string[]>([]);
  const [mainProfileIndex, setMainProfileIndex] = useState<number | null>(null);
  const [faceImageFiles, setFaceImageFiles] = useState<File[]>([]);
  const [bodyImageFiles, setBodyImageFiles] = useState<File[]>([]);
  const [facePreviews, setFacePreviews] = useState<string[]>([]);
  const [bodyPreviews, setBodyPreviews] = useState<string[]>([]);
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

  const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_PROFILE_IMAGES - profileImageFiles.length;
    const selected = files.slice(0, remaining);
    setProfileImageFiles((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      const url = URL.createObjectURL(file);
      setProfilePreviews((prev) => [...prev, url]);
    });
    if (mainProfileIndex === null && selected.length > 0) {
      setMainProfileIndex(profileImageFiles.length);
    }
    e.target.value = "";
  };

  const handleFaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_FACE_IMAGES - faceImageFiles.length;
    const selected = files.slice(0, remaining);
    setFaceImageFiles((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      const url = URL.createObjectURL(file);
      setFacePreviews((prev) => [...prev, url]);
    });
    e.target.value = "";
  };

  const handleBodyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_BODY_IMAGES - bodyImageFiles.length;
    const selected = files.slice(0, remaining);
    setBodyImageFiles((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      const url = URL.createObjectURL(file);
      setBodyPreviews((prev) => [...prev, url]);
    });
    e.target.value = "";
  };

  const handleRemoveProfile = (index: number) => {
    URL.revokeObjectURL(profilePreviews[index]);
    setProfileImageFiles((prev) => prev.filter((_, i) => i !== index));
    setProfilePreviews((prev) => prev.filter((_, i) => i !== index));
    setMainProfileIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const handleRemoveFace = (index: number) => {
    URL.revokeObjectURL(facePreviews[index]);
    setFaceImageFiles((prev) => prev.filter((_, i) => i !== index));
    setFacePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveBody = (index: number) => {
    URL.revokeObjectURL(bodyPreviews[index]);
    setBodyImageFiles((prev) => prev.filter((_, i) => i !== index));
    setBodyPreviews((prev) => prev.filter((_, i) => i !== index));
  };

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
      let profileImageUrls: string[] = [];
      let faceImageUrls: string[] = [];
      let bodyImageUrls: string[] = [];
      if (profileImageFiles.length > 0 || faceImageFiles.length > 0 || bodyImageFiles.length > 0) {
        setError("画像をアップロード中...");
        const [uploadedProfile, uploadedFace, uploadedBody] = await Promise.all([
          Promise.all(profileImageFiles.map((file, i) => uploadImage(file, i + 200))),
          Promise.all(faceImageFiles.map((file, i) => uploadImage(file, i))),
          Promise.all(bodyImageFiles.map((file, i) => uploadImage(file, i + 100))),
        ]);
        profileImageUrls = uploadedProfile;
        faceImageUrls = uploadedFace;
        bodyImageUrls = uploadedBody;
        setError("");
      }
      const selectedMainImage =
        mainProfileIndex !== null ? profileImageUrls[mainProfileIndex] : "";
      const mainImage = selectedMainImage || profileImageUrls[0] || "";
      const images = Array.from(new Set([mainImage, ...profileImageUrls].filter(Boolean)));

      setError("プロフィールを保存中...");
      await setDoc(doc(db, "users", user.uid), {
        name, age: Number(age), height: Number(height), weight: Number(weight),
        position,
        hobby,
        bio,
        instagramId: instagramId.trim(),
        tiktokId: tiktokId.trim(),
        xId: xId.trim(),
        profileImages: profileImageUrls,
        faceImages: faceImageUrls,
        bodyImages: bodyImageUrls,
        albumVisibilityMode: "mutual_approval_simultaneous",
        mainImage,
        images,
        createdAt: new Date(),
      });
      router.push("/home");
    } catch (err) {
      console.error("保存エラー:", err);
      setError(`保存に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-4 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 py-6">
      <div className="w-full max-w-[390px] mx-auto">
        {/* ロゴ */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-widest text-[#00f5ff] neon-text-cyan">RAISE</h1>
        </div>

        <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-white text-center mb-1">プロフィール作成</h2>
          <p className="text-[#8888aa] text-center text-sm mb-7">あなたのプロフィールを入力してください</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 名前 */}
            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-1.5">
                名前 <span className="text-[#ff2d78]">*</span>
              </label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                required placeholder="例：田中 太郎"
                className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition"
              />
            </div>

            {/* 年齢・身長・体重 */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "年齢", unit: "歳", value: age, setter: setAge, max: 120, placeholder: "25" },
                { label: "身長", unit: "cm", value: height, setter: setHeight, max: 300, placeholder: "170" },
                { label: "体重", unit: "kg", value: weight, setter: setWeight, max: 500, placeholder: "65" },
              ].map(({ label, unit, value, setter, max, placeholder }) => (
                <div key={label}>
                  <label className="block text-[#8888aa] text-sm font-medium mb-1.5">
                    {label} <span className="text-[#ff2d78]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number" value={value} onChange={(e) => setter(e.target.value)}
                      required min={1} max={max} placeholder={placeholder}
                      className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-2 py-3.5 pr-7 focus:outline-none focus:border-[#00f5ff] transition"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8888aa] text-xs pointer-events-none">{unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ポジション */}
            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-2">
                ポジション <span className="text-[#ff2d78]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["top", "bottom", "versatile", "side"] as Position[]).map((p) => (
                  <button key={p} type="button" onClick={() => setPosition(p)}
                    className={`h-12 rounded-xl text-sm font-medium border transition ${
                      position === p
                        ? "bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] border-[#7a5cff] text-white"
                        : "bg-[#0d0d1a] border-[#ff2d78]/20 text-[#8888aa] hover:border-[#ff2d78]/50"
                    }`}
                  >
                    {p === "top" ? "Top" : p === "bottom" ? "Bottom" : p === "versatile" ? "Versatile" : "Side"}
                  </button>
                ))}
              </div>
            </div>

            {/* 趣味 */}
            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-1.5">趣味</label>
              <input
                type="text" value={hobby} onChange={(e) => setHobby(e.target.value)}
                placeholder="例：映画鑑賞、ジム、料理"
                className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition"
              />
            </div>

            {/* 自己紹介 */}
            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-1.5">自己紹介</label>
              <textarea
                value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                placeholder="自由に自己紹介を書いてください..."
                className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition resize-none"
              />
            </div>

            {/* SNSアカウント */}
            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-1.5">Instagram ID</label>
              <input
                type="text" value={instagramId} onChange={(e) => setInstagramId(e.target.value)}
                placeholder="例：raise_official"
                className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition"
              />
            </div>

            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-1.5">TikTok ID</label>
              <input
                type="text" value={tiktokId} onChange={(e) => setTiktokId(e.target.value)}
                placeholder="例：raise_tok"
                className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition"
              />
            </div>

            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-1.5">X（旧Twitter）ID</label>
              <input
                type="text" value={xId} onChange={(e) => setXId(e.target.value)}
                placeholder="例：raise_x"
                className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition"
              />
            </div>

            {/* プロフィール写真 */}
            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-2">
                プロフィール写真 <span className="text-[#8888aa] font-normal">（最大{MAX_PROFILE_IMAGES}枚）</span>
              </label>
              {profilePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {profilePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#ff2d78]/30">
                      <Image src={src} alt={`プロフィール写真 ${i + 1}`} fill className="object-cover" unoptimized />
                      {mainProfileIndex === i && (
                        <span className="absolute bottom-1.5 left-1.5 bg-[#ff2d78]/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md pointer-events-none">メイン</span>
                      )}
                      {uploadingIndexes.includes(i + 200) && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {!uploadingIndexes.includes(i + 200) && (
                        <button type="button" onClick={() => handleRemoveProfile(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs z-10"
                          aria-label="削除">✕</button>
                      )}
                      <button type="button" onClick={() => setMainProfileIndex(i)}
                        className="absolute top-1 left-1 h-6 px-2 bg-black/70 rounded-md text-white text-[10px]">
                        メインに設定
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {profileImageFiles.length < MAX_PROFILE_IMAGES && (
                <>
                  <input ref={profileFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleProfileFileChange} />
                  <button type="button" onClick={() => profileFileInputRef.current?.click()}
                    className="w-full h-12 bg-[#0d0d1a] border border-dashed border-[#ff2d78]/40 hover:border-[#ff2d78] text-[#8888aa] hover:text-[#ff2d78] text-sm rounded-xl transition flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    プロフィール写真を追加（あと{MAX_PROFILE_IMAGES - profileImageFiles.length}枚）
                  </button>
                </>
              )}
            </div>

            <div className="rounded-xl border border-[#00f5ff]/30 bg-[#00f5ff]/5 px-3 py-2.5">
              <p className="text-[#00f5ff] text-xs font-medium">顔・体アルバム公開設定</p>
              <p className="text-[#9aa7b1] text-xs mt-1">相互承認で同時公開（固定）</p>
            </div>

            {/* 顔アルバム */}
            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-2">
                顔アルバム <span className="text-[#8888aa] font-normal">（最大{MAX_FACE_IMAGES}枚）</span>
              </label>
              {facePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {facePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#ff2d78]/30">
                      <Image src={src} alt={`プレビュー ${i + 1}`} fill className="object-cover" unoptimized />
                      {uploadingIndexes.includes(i) && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {!uploadingIndexes.includes(i) && (
                        <button type="button" onClick={() => handleRemoveFace(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs z-10"
                          aria-label="削除">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {faceImageFiles.length < MAX_FACE_IMAGES && (
                <>
                  <input ref={faceFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFaceFileChange} />
                  <button type="button" onClick={() => faceFileInputRef.current?.click()}
                    className="w-full h-12 bg-[#0d0d1a] border border-dashed border-[#ff2d78]/40 hover:border-[#ff2d78] text-[#8888aa] hover:text-[#ff2d78] text-sm rounded-xl transition flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    顔写真を追加（あと{MAX_FACE_IMAGES - faceImageFiles.length}枚）
                  </button>
                </>
              )}
            </div>

            {/* 体アルバム */}
            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-2">
                体アルバム <span className="text-[#8888aa] font-normal">（最大{MAX_BODY_IMAGES}枚）</span>
              </label>
              {bodyPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {bodyPreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#00f5ff]/40">
                      <Image src={src} alt={`体プレビュー ${i + 1}`} fill className="object-cover" unoptimized />
                      {uploadingIndexes.includes(i + 100) && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {!uploadingIndexes.includes(i + 100) && (
                        <button type="button" onClick={() => handleRemoveBody(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs z-10"
                          aria-label="削除">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {bodyImageFiles.length < MAX_BODY_IMAGES && (
                <>
                  <input ref={bodyFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBodyFileChange} />
                  <button type="button" onClick={() => bodyFileInputRef.current?.click()}
                    className="w-full h-12 bg-[#0d0d1a] border border-dashed border-[#00f5ff]/40 hover:border-[#00f5ff] text-[#8888aa] hover:text-[#00f5ff] text-sm rounded-xl transition flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    体写真を追加（あと{MAX_BODY_IMAGES - bodyImageFiles.length}枚）
                  </button>
                </>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button type="submit" disabled={saving}
              className="w-full h-12 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl transition flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? "保存中..." : "プロフィールを保存"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

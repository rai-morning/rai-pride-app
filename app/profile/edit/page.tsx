"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import HamburgerMenuButton from "@/components/HamburgerMenuButton";

type Position = "top" | "bottom" | "versatile" | "side";

const MAX_PROFILE_IMAGES = 3;
const MAX_FACE_IMAGES = 3;
const MAX_BODY_IMAGES = 3;

export default function ProfileEditPage() {
  const router = useRouter();
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const faceFileInputRef = useRef<HTMLInputElement>(null);
  const bodyFileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

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

  const [existingProfileUrls, setExistingProfileUrls] = useState<string[]>([]);
  const [newProfileFiles, setNewProfileFiles] = useState<File[]>([]);
  const [newProfilePreviews, setNewProfilePreviews] = useState<string[]>([]);
  const [existingFaceUrls, setExistingFaceUrls] = useState<string[]>([]);
  const [existingBodyUrls, setExistingBodyUrls] = useState<string[]>([]);
  const [newFaceFiles, setNewFaceFiles] = useState<File[]>([]);
  const [newBodyFiles, setNewBodyFiles] = useState<File[]>([]);
  const [newFacePreviews, setNewFacePreviews] = useState<string[]>([]);
  const [newBodyPreviews, setNewBodyPreviews] = useState<string[]>([]);
  const [mainProfileSource, setMainProfileSource] = useState<{ kind: "existing" | "new"; index: number } | null>(null);
  const [uploadingIndexes, setUploadingIndexes] = useState<number[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalProfileImages = existingProfileUrls.length + newProfileFiles.length;
  const totalFaceImages = existingFaceUrls.length + newFaceFiles.length;
  const totalBodyImages = existingBodyUrls.length + newBodyFiles.length;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) { router.replace("/auth/login"); return; }
      setUser(u);
      setAuthLoading(false);
      loadProfile(u.uid);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async (uid: string) => {
    setProfileLoading(true);
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const d = snap.data();
        setName(d.name ?? "");
        setAge(String(d.age ?? ""));
        setHeight(String(d.height ?? ""));
        setWeight(String(d.weight ?? ""));
        setPosition((d.position as Position) ?? "versatile");
        setHobby(d.hobby ?? "");
        setBio(d.bio ?? "");
        setInstagramId(d.instagramId ?? "");
        setTiktokId(d.tiktokId ?? "");
        setXId(d.xId ?? "");
        const profile = (d.profileImages as string[] | undefined) ?? (d.images as string[] | undefined) ?? [];
        const face = (d.faceImages as string[] | undefined) ?? [];
        const body = (d.bodyImages as string[] | undefined) ?? [];
        const main = (d.mainImage as string | undefined) ?? profile[0] ?? "";
        setExistingProfileUrls(profile);
        setExistingFaceUrls(face);
        setExistingBodyUrls(body);
        if (main && profile.includes(main)) {
          setMainProfileSource({ kind: "existing", index: profile.indexOf(main) });
        } else if (profile.length > 0) {
          setMainProfileSource({ kind: "existing", index: 0 });
        } else {
          setMainProfileSource(null);
        }
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRemoveExistingProfile = (index: number) => {
    setExistingProfileUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setMainProfileSource((source) => {
        if (!source || source.kind !== "existing") return source;
        if (source.index === index) return next.length > 0 ? { kind: "existing", index: 0 } : null;
        if (source.index > index) return { ...source, index: source.index - 1 };
        return source;
      });
      return next;
    });
  };

  const handleRemoveExistingFace = (index: number) => {
    setExistingFaceUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingBody = (index: number) => {
    setExistingBodyUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewProfile = (index: number) => {
    URL.revokeObjectURL(newProfilePreviews[index]);
    setNewProfileFiles((prev) => prev.filter((_, i) => i !== index));
    setNewProfilePreviews((prev) => prev.filter((_, i) => i !== index));
    setMainProfileSource((source) => {
      if (!source || source.kind !== "new") return source;
      if (source.index === index) return existingProfileUrls.length > 0 ? { kind: "existing", index: 0 } : null;
      if (source.index > index) return { ...source, index: source.index - 1 };
      return source;
    });
  };

  const handleRemoveNewFace = (index: number) => {
    URL.revokeObjectURL(newFacePreviews[index]);
    setNewFaceFiles((prev) => prev.filter((_, i) => i !== index));
    setNewFacePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewBody = (index: number) => {
    URL.revokeObjectURL(newBodyPreviews[index]);
    setNewBodyFiles((prev) => prev.filter((_, i) => i !== index));
    setNewBodyPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_PROFILE_IMAGES - totalProfileImages;
    const selected = files.slice(0, remaining);
    const startIndex = newProfileFiles.length;
    setNewProfileFiles((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      setNewProfilePreviews((prev) => [...prev, URL.createObjectURL(file)]);
    });
    if (!mainProfileSource && selected.length > 0) {
      if (existingProfileUrls.length > 0) setMainProfileSource({ kind: "existing", index: 0 });
      else setMainProfileSource({ kind: "new", index: startIndex });
    }
    e.target.value = "";
  };

  const handleFaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_FACE_IMAGES - totalFaceImages;
    const selected = files.slice(0, remaining);
    setNewFaceFiles((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      setNewFacePreviews((prev) => [...prev, URL.createObjectURL(file)]);
    });
    e.target.value = "";
  };

  const handleBodyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_BODY_IMAGES - totalBodyImages;
    const selected = files.slice(0, remaining);
    setNewBodyFiles((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      setNewBodyPreviews((prev) => [...prev, URL.createObjectURL(file)]);
    });
    e.target.value = "";
  };

  const uploadImage = async (file: File, spinnerIndex: number): Promise<string> => {
    setUploadingIndexes((prev) => [...prev, spinnerIndex]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "uibxdch7");
      const response = await fetch("https://api.cloudinary.com/v1_1/dcp0seihk/image/upload", { method: "POST", body: formData });
      if (!response.ok) throw new Error("アップロード失敗");
      const data = await response.json();
      return data.secure_url as string;
    } finally {
      setUploadingIndexes((prev) => prev.filter((i) => i !== spinnerIndex));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSaving(true);
    try {
      let uploadedProfileUrls: string[] = [];
      let uploadedFaceUrls: string[] = [];
      let uploadedBodyUrls: string[] = [];
      if (newProfileFiles.length > 0 || newFaceFiles.length > 0 || newBodyFiles.length > 0) {
        setError("画像をアップロード中...");
        const [profileUploaded, faceUploaded, bodyUploaded] = await Promise.all([
          Promise.all(newProfileFiles.map((file, i) => uploadImage(file, i + 200))),
          Promise.all(newFaceFiles.map((file, i) => uploadImage(file, i))),
          Promise.all(newBodyFiles.map((file, i) => uploadImage(file, i + 100))),
        ]);
        uploadedProfileUrls = profileUploaded;
        uploadedFaceUrls = faceUploaded;
        uploadedBodyUrls = bodyUploaded;
        setError("");
      }
      const allProfileImages = [...existingProfileUrls, ...uploadedProfileUrls];
      const allFaceImages = [...existingFaceUrls, ...uploadedFaceUrls];
      const allBodyImages = [...existingBodyUrls, ...uploadedBodyUrls];
      const selectedMainImage =
        mainProfileSource?.kind === "existing"
          ? existingProfileUrls[mainProfileSource.index]
          : mainProfileSource?.kind === "new"
            ? uploadedProfileUrls[mainProfileSource.index]
            : "";
      const resolvedMainImage = selectedMainImage || allProfileImages[0] || "";
      const images = Array.from(new Set([resolvedMainImage, ...allProfileImages].filter(Boolean)));
      setError("プロフィールを保存中...");
      await setDoc(doc(db, "users", user.uid), {
        name, age: Number(age), height: Number(height), weight: Number(weight),
        position,
        hobby,
        bio,
        instagramId: instagramId.trim(),
        tiktokId: tiktokId.trim(),
        xId: xId.trim(),
        profileImages: allProfileImages,
        faceImages: allFaceImages,
        bodyImages: allBodyImages,
        albumVisibilityMode: "mutual_approval_simultaneous",
        mainImage: resolvedMainImage,
        images,
      }, { merge: true });
      router.push("/profile/me");
    } catch (err) {
      console.error("保存エラー:", err);
      setError(`保存に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-4 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* ヘッダー */}
      <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition" aria-label="戻る">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-[#00f5ff] neon-text-cyan flex-1">プロフィール編集</h1>
        <HamburgerMenuButton />
      </header>

      {/* フォーム */}
      <div className="flex-1 px-4 py-6 w-full max-w-[480px] mx-auto pb-10">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* 名前 */}
          <div>
            <label className="block text-[#8888aa] text-sm font-medium mb-1.5">
              名前 <span className="text-[#ff2d78]">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="例：田中 太郎"
              className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition" />
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
                  <input type="number" value={value} onChange={(e) => setter(e.target.value)} required min={1} max={max} placeholder={placeholder}
                    className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-2 py-3.5 pr-7 focus:outline-none focus:border-[#00f5ff] transition" />
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
                  }`}>
                  {p === "top" ? "Top" : p === "bottom" ? "Bottom" : p === "versatile" ? "Versatile" : "Side"}
                </button>
              ))}
            </div>
          </div>

          {/* 趣味 */}
          <div>
            <label className="block text-[#8888aa] text-sm font-medium mb-1.5">趣味</label>
            <input type="text" value={hobby} onChange={(e) => setHobby(e.target.value)} placeholder="例：映画鑑賞、ジム、料理"
              className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition" />
          </div>

          {/* 自己紹介 */}
          <div>
            <label className="block text-[#8888aa] text-sm font-medium mb-1.5">自己紹介</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="自由に自己紹介を書いてください..."
              className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition resize-none" />
          </div>

          {/* SNSアカウント */}
          <div>
            <label className="block text-[#8888aa] text-sm font-medium mb-1.5">Instagram ID</label>
            <input type="text" value={instagramId} onChange={(e) => setInstagramId(e.target.value)} placeholder="例：raise_official"
              className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition" />
          </div>

          <div>
            <label className="block text-[#8888aa] text-sm font-medium mb-1.5">TikTok ID</label>
            <input type="text" value={tiktokId} onChange={(e) => setTiktokId(e.target.value)} placeholder="例：raise_tok"
              className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition" />
          </div>

          <div>
            <label className="block text-[#8888aa] text-sm font-medium mb-1.5">X（旧Twitter）ID</label>
            <input type="text" value={xId} onChange={(e) => setXId(e.target.value)} placeholder="例：raise_x"
              className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition" />
          </div>

          {/* プロフィール写真 */}
          <div>
            <label className="block text-[#8888aa] text-sm font-medium mb-2">
              プロフィール写真 <span className="text-[#8888aa] font-normal">（最大{MAX_PROFILE_IMAGES}枚）</span>
            </label>
            {(existingProfileUrls.length > 0 || newProfilePreviews.length > 0) && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {existingProfileUrls.map((url, i) => (
                  <div key={`existing-profile-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#ff2d78]/30">
                    <Image src={url} alt={`プロフィール写真 ${i + 1}`} fill className="object-cover" unoptimized />
                    {mainProfileSource?.kind === "existing" && mainProfileSource.index === i && (
                      <span className="absolute bottom-1.5 left-1.5 bg-[#ff2d78]/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md pointer-events-none">メイン</span>
                    )}
                    <button type="button" onClick={() => handleRemoveExistingProfile(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs z-10" aria-label="削除">✕</button>
                    <button type="button" onClick={() => setMainProfileSource({ kind: "existing", index: i })}
                      className="absolute top-1 left-1 h-6 px-2 bg-black/70 rounded-md text-white text-[10px]">メインに設定</button>
                  </div>
                ))}
                {newProfilePreviews.map((src, i) => (
                  <div key={`new-profile-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#00f5ff]/40">
                    <Image src={src} alt={`新しいプロフィール写真 ${i + 1}`} fill className="object-cover" unoptimized />
                    {mainProfileSource?.kind === "new" && mainProfileSource.index === i && (
                      <span className="absolute bottom-1.5 left-1.5 bg-[#ff2d78]/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md pointer-events-none">メイン</span>
                    )}
                    {uploadingIndexes.includes(i + 200) && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!uploadingIndexes.includes(i + 200) && (
                      <button type="button" onClick={() => handleRemoveNewProfile(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs z-10" aria-label="削除">✕</button>
                    )}
                    <button type="button" onClick={() => setMainProfileSource({ kind: "new", index: i })}
                      className="absolute top-1 left-1 h-6 px-2 bg-black/70 rounded-md text-white text-[10px]">メインに設定</button>
                  </div>
                ))}
              </div>
            )}
            {totalProfileImages < MAX_PROFILE_IMAGES && (
              <>
                <input ref={profileFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleProfileFileChange} />
                <button type="button" onClick={() => profileFileInputRef.current?.click()}
                  className="w-full h-12 bg-[#0d0d1a] border border-dashed border-[#ff2d78]/40 hover:border-[#ff2d78] text-[#8888aa] hover:text-[#ff2d78] text-sm rounded-xl transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  プロフィール写真を追加（あと{MAX_PROFILE_IMAGES - totalProfileImages}枚）
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
            {(existingFaceUrls.length > 0 || newFacePreviews.length > 0) && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {existingFaceUrls.map((url, i) => (
                  <div key={`existing-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#ff2d78]/30">
                    <Image src={url} alt={`写真 ${i + 1}`} fill className="object-cover" unoptimized />
                    <button type="button" onClick={() => handleRemoveExistingFace(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs z-10" aria-label="削除">✕</button>
                  </div>
                ))}
                {newFacePreviews.map((src, i) => (
                  <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#00f5ff]/40">
                    <Image src={src} alt={`新しい写真 ${i + 1}`} fill className="object-cover" unoptimized />
                    {uploadingIndexes.includes(i) && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!uploadingIndexes.includes(i) && (
                      <>
                        <span className="absolute bottom-1.5 left-1.5 bg-green-600/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md pointer-events-none">新規</span>
                        <button type="button" onClick={() => handleRemoveNewFace(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs z-10" aria-label="削除">✕</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {totalFaceImages < MAX_FACE_IMAGES && (
              <>
                <input ref={faceFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFaceFileChange} />
                <button type="button" onClick={() => faceFileInputRef.current?.click()}
                  className="w-full h-12 bg-[#0d0d1a] border border-dashed border-[#ff2d78]/40 hover:border-[#ff2d78] text-[#8888aa] hover:text-[#ff2d78] text-sm rounded-xl transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  顔写真を追加（あと{MAX_FACE_IMAGES - totalFaceImages}枚）
                </button>
              </>
            )}
          </div>

          {/* 体アルバム */}
          <div>
            <label className="block text-[#8888aa] text-sm font-medium mb-2">
              体アルバム <span className="text-[#8888aa] font-normal">（最大{MAX_BODY_IMAGES}枚）</span>
            </label>
            {(existingBodyUrls.length > 0 || newBodyPreviews.length > 0) && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {existingBodyUrls.map((url, i) => (
                  <div key={`existing-body-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#00f5ff]/40">
                    <Image src={url} alt={`体写真 ${i + 1}`} fill className="object-cover" unoptimized />
                    <button type="button" onClick={() => handleRemoveExistingBody(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs z-10" aria-label="削除">✕</button>
                  </div>
                ))}
                {newBodyPreviews.map((src, i) => (
                  <div key={`new-body-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-[#00f5ff]/40">
                    <Image src={src} alt={`新しい体写真 ${i + 1}`} fill className="object-cover" unoptimized />
                    {uploadingIndexes.includes(i + 100) && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-[#ff2d78] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!uploadingIndexes.includes(i + 100) && (
                      <>
                        <span className="absolute bottom-1.5 left-1.5 bg-green-600/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md pointer-events-none">新規</span>
                        <button type="button" onClick={() => handleRemoveNewBody(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs z-10" aria-label="削除">✕</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {totalBodyImages < MAX_BODY_IMAGES && (
              <>
                <input ref={bodyFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBodyFileChange} />
                <button type="button" onClick={() => bodyFileInputRef.current?.click()}
                  className="w-full h-12 bg-[#0d0d1a] border border-dashed border-[#00f5ff]/40 hover:border-[#00f5ff] text-[#8888aa] hover:text-[#00f5ff] text-sm rounded-xl transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  体写真を追加（あと{MAX_BODY_IMAGES - totalBodyImages}枚）
                </button>
              </>
            )}
          </div>

          {/* エラー */}
          {error && (
            <p className={`text-sm text-center rounded-xl px-4 py-3 border ${
              error.includes("中...") || error.includes("保存中")
                ? "text-[#00f5ff] bg-[#00f5ff]/10 border-[#00f5ff]/30"
                : "text-red-400 bg-red-900/20 border-red-800"
            }`}>
              {error}
            </p>
          )}

          {/* 保存ボタン */}
          <button type="submit" disabled={saving}
            className="w-full h-12 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl transition flex items-center justify-center gap-2">
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? "保存中..." : "変更を保存する"}
          </button>
        </form>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/auth/login");
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/auth/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#1a1f2e] border-b border-gray-700 px-4 h-14 flex items-center justify-between shrink-0">
        <h1 className="text-base font-bold text-white tracking-wide">RAI Pride</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs hidden sm:block truncate max-w-[160px]">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="h-9 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 text-sm font-medium px-4 rounded-lg transition"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[390px] bg-[#1a1f2e] border border-gray-700 rounded-2xl shadow-xl px-6 py-10 text-center">
          <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/40 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">ホーム画面</h2>
          <p className="text-gray-400 text-sm leading-relaxed">現在準備中です。<br />もうしばらくお待ちください。</p>
        </div>
      </div>
    </main>
  );
}

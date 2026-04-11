"use client";

import { useRouter } from "next/navigation";

export default function GuidelinePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition" aria-label="戻る">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-[#00f5ff] neon-text-cyan">ガイドライン</h1>
      </header>
      <div className="w-full max-w-[480px] mx-auto px-4 py-6">
        <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl p-4">
          <p className="text-xs text-[#8888aa] leading-relaxed">
            安心して利用するためのコミュニティガイドラインです。ハラスメント、スパム、不適切投稿の禁止事項などを記載します。
          </p>
        </div>
      </div>
    </main>
  );
}

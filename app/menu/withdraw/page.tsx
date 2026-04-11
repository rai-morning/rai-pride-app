"use client";

import { useRouter } from "next/navigation";

export default function WithdrawPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition" aria-label="戻る">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-[#ff4fd8] neon-text-pink">退会</h1>
      </header>
      <div className="w-full max-w-[480px] mx-auto px-4 py-6 space-y-4">
        <div className="bg-[#12121f] border border-red-500/30 rounded-xl p-4">
          <p className="text-sm text-red-400 font-medium mb-2">退会手続きについて</p>
          <p className="text-xs text-[#8888aa] leading-relaxed mb-4">退会するとアカウント情報の一部は復元できません。最終確認のうえ手続きを進めてください。</p>
          <button
            type="button"
            className="w-full h-11 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition"
            onClick={() => alert("退会機能は次ステップで実装予定です。")}
          >
            退会手続きへ進む
          </button>
        </div>
      </div>
    </main>
  );
}

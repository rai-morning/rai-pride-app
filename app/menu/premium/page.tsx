"use client";

import { useRouter } from "next/navigation";

export default function PremiumPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition" aria-label="戻る">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-[#ffd84a] neon-text-yellow">プレミアムプラン</h1>
      </header>
      <div className="w-full max-w-[480px] mx-auto px-4 py-6 space-y-4">
        <div className="bg-[#12121f] border border-[#ffd84a]/30 rounded-xl p-4">
          <p className="text-sm text-white font-medium mb-2">サブスクリプション機能（準備中）</p>
          <ul className="text-xs text-[#8888aa] leading-relaxed space-y-1">
            <li>・有料限定コンテンツの閲覧</li>
            <li>・優先表示や特典機能</li>
            <li>・プラン管理（開始・更新・解約）</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const supportItems = [
  { label: "ヘルプ", href: "/menu/help" },
  { label: "FAQ", href: "/menu/faq" },
  { label: "問い合わせ", href: "/menu/contact" },
];

const businessItems = [
  { label: "広告掲載", href: "/menu/ads" },
  { label: "プレミアムプラン", href: "/menu/premium" },
  { label: "アイテム", href: "/menu/items" },
];

const policyItems = [
  { label: "利用規約", href: "/menu/terms" },
  { label: "プライバシーポリシー", href: "/menu/privacy" },
  { label: "ガイドライン", href: "/menu/guideline" },
];

const accountItems = [
  { label: "通知設定", href: "/menu/notifications-settings" },
  { label: "アルバム", href: "/menu/album" },
  { label: "ブロック/ミュート管理", href: "/menu/safety" },
  { label: "退会", href: "/menu/withdraw", danger: true },
];

export default function MenuPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/auth/login");
      } else {
        setUser(u);
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    if (!confirm("ログアウトしますか？")) return;
    setLoggingOut(true);
    try {
      await signOut(auth);
      router.replace("/auth/login");
    } finally {
      setLoggingOut(false);
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
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="bg-[#12121f] border-b border-[#ff2d78]/20 px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition"
          aria-label="戻る"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-[#00f5ff] neon-text-cyan">その他</h1>
      </header>

      <div className="w-full max-w-[480px] mx-auto px-4 py-5 space-y-5">
        <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl px-4 py-3">
          <p className="text-sm text-white font-medium truncate">{user?.email}</p>
          <p className="text-xs text-[#8888aa] mt-0.5">メニューから各種設定に移動できます</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-xs text-[#8888aa] font-medium">サポート</h2>
          <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl overflow-hidden">
            {supportItems.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="w-full px-4 h-12 flex items-center justify-between text-sm text-white hover:bg-[#1a1a2e] transition border-b border-[#ff2d78]/10 last:border-b-0"
              >
                {item.label}
                <span className="text-[#8888aa]">›</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs text-[#8888aa] font-medium">ビジネス</h2>
          <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl overflow-hidden">
            {businessItems.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="w-full px-4 h-12 flex items-center justify-between text-sm text-white hover:bg-[#1a1a2e] transition border-b border-[#ff2d78]/10 last:border-b-0"
              >
                {item.label}
                <span className="text-[#8888aa]">›</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs text-[#8888aa] font-medium">ポリシー</h2>
          <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl overflow-hidden">
            {policyItems.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="w-full px-4 h-12 flex items-center justify-between text-sm text-white hover:bg-[#1a1a2e] transition border-b border-[#ff2d78]/10 last:border-b-0"
              >
                {item.label}
                <span className="text-[#8888aa]">›</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs text-[#8888aa] font-medium">アカウント</h2>
          <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-xl overflow-hidden">
            {accountItems.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full px-4 h-12 flex items-center justify-between text-sm hover:bg-[#1a1a2e] transition border-b border-[#ff2d78]/10 last:border-b-0 ${
                  item.danger ? "text-red-400" : "text-white"
                }`}
              >
                {item.label}
                <span className="text-[#8888aa]">›</span>
              </button>
            ))}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full px-4 h-12 flex items-center justify-between text-sm text-[#ff4fd8] hover:bg-[#1a1a2e] transition disabled:opacity-50"
            >
              {loggingOut ? "ログアウト中..." : "ログアウト"}
              <span className="text-[#8888aa]">›</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

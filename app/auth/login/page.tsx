"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/home");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError("メールアドレスまたはパスワードが正しくありません。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center bg-[#0a0a0f] px-4 py-8">
      <div className="w-full max-w-[390px] mx-auto">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-widest text-[#00f5ff] neon-text-cyan">RAISE</h1>
          <p className="text-[#8888aa] text-xs mt-1 tracking-wider">CONNECT · DISCOVER · RISE</p>
        </div>

        <div className="bg-[#12121f] border border-[#ff2d78]/20 rounded-2xl shadow-xl p-6 neon-border-pink">
          <h2 className="text-lg font-bold text-white text-center mb-1">ログイン</h2>
          <p className="text-[#8888aa] text-center text-sm mb-7">アカウントにサインインしてください</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-1.5">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
                className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition"
              />
            </div>

            <div>
              <label className="block text-[#8888aa] text-sm font-medium mb-1.5">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0d0d1a] text-white text-base placeholder-[#8888aa] border border-[#ff2d78]/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-[#00f5ff] transition"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-[#7a5cff] via-[#27d3ff] to-[#ff4fd8] hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl transition"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <p className="text-[#8888aa] text-sm text-center mt-6">
            アカウントをお持ちでない方は{" "}
            <Link href="/auth/register" className="text-[#00f5ff] hover:opacity-80 underline">
              こちら
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

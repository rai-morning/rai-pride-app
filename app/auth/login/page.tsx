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
    <main className="min-h-screen flex flex-col justify-center bg-[#0a0f1e] px-4 py-8">
      <div className="w-full max-w-[390px] mx-auto">
        <div className="bg-[#1a1f2e] rounded-2xl shadow-xl p-6">
          <h1 className="text-xl font-bold text-white text-center mb-1">ログイン</h1>
          <p className="text-gray-400 text-center text-sm mb-7">アカウントにサインインしてください</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
                className="w-full bg-[#252b3b] text-white text-base placeholder-gray-500 border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#252b3b] text-white text-base placeholder-gray-500 border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 transition"
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
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl transition"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <p className="text-gray-400 text-sm text-center mt-6">
            アカウントをお持ちでない方は{" "}
            <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 underline">
              こちら
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

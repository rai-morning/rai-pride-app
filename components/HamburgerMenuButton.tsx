"use client";

import { useRouter } from "next/navigation";

type Props = {
  className?: string;
};

export default function HamburgerMenuButton({ className = "" }: Props) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/menu")}
      className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a2e] transition ${className}`}
      aria-label="メニュー"
    >
      <svg className="w-5 h-5 text-[#8888aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

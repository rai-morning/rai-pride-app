"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { subscribeConversations } from "@/lib/conversations";
import { subscribeUnreadCount } from "@/lib/notifications";

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? "text-[#ff2d78]" : "text-[#8888aa]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function BellIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? "text-[#ff2d78]" : "text-[#8888aa]"}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}
function MessageIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? "text-[#ff2d78]" : "text-[#8888aa]"}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function CommunityIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? "text-[#ff2d78]" : "text-[#8888aa]"}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-5 h-5 ${active ? "text-[#ff2d78]" : "text-[#8888aa]"}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function getTabActiveColorClass(href: string): string {
  if (href === "/notifications") return "text-[#ffe45e] neon-text-yellow";
  if (href === "/home" || href === "/communities") return "text-[#00f5ff] neon-text-cyan";
  return "text-[#ff2d78] neon-text-pink";
}

const TABS = [
  { label: "検索",         href: "/home",          Icon: SearchIcon,    badgeKey: null          },
  { label: "通知",         href: "/notifications", Icon: BellIcon,      badgeKey: "notif"       },
  { label: "DM",          href: "/messages",       Icon: MessageIcon,   badgeKey: "dm"          },
  { label: "コミュニティ",  href: "/communities",   Icon: CommunityIcon, badgeKey: null          },
  { label: "自分",         href: "/profile/me",    Icon: ProfileIcon,   badgeKey: null          },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [dmUnread, setDmUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);

  if (pathname.startsWith("/auth/")) return null;

  useEffect(() => {
    let unsubDm: (() => void) | null = null;
    let unsubNotif: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // 前回のサブスクリプションをクリーンアップ
      unsubDm?.();
      unsubNotif?.();

      if (!user) return;

      unsubDm = subscribeConversations(user.uid, (convs) => {
        const sum = convs.reduce((acc, c) => acc + (c.unreadCount[user.uid] ?? 0), 0);
        setDmUnread(sum);
      });

      unsubNotif = subscribeUnreadCount(user.uid, (count) => {
        setNotifUnread(count);
      });
    });

    return () => {
      unsubAuth();
      unsubDm?.();
      unsubNotif?.();
    };
  }, []);

  const getBadge = (key: string | null): number => {
    if (key === "dm") return dmUnread;
    if (key === "notif") return notifUnread;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#12121f] border-t border-[#00f5ff]/20">
      <div className="flex items-stretch max-w-[480px] mx-auto">
        {TABS.map(({ label, href, Icon, badgeKey }) => {
          const active =
            pathname === href ||
            (href === "/messages" && pathname.startsWith("/messages")) ||
            (href === "/notifications" && pathname.startsWith("/notifications")) ||
            (href !== "/home" && href !== "/messages" && href !== "/notifications" && pathname.startsWith(href + "/"));
          const badge = getBadge(badgeKey);
          const activeColor = getTabActiveColorClass(href);
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? activeColor : "text-[#8888aa] hover:text-gray-300"
              }`}
              aria-label={label}
            >
              <div className="relative">
                <Icon active={active} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-medium leading-none ${active ? activeColor : "text-[#8888aa]"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

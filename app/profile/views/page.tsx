"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 閲覧履歴は /notifications の「足跡」タブに統合
export default function ProfileViewsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/notifications");
  }, [router]);
  return null;
}

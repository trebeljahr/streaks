"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** The scaffold's entry point. Today is the real home screen. */
export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/today");
  }, [router]);
  return null;
}

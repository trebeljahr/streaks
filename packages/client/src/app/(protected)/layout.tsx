"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm font-light text-ink-muted">One moment…</p>
      </div>
    );
  }

  // Phone-width column on every surface. The app is built for a thumb, and
  // the desktop build is the same layout centred rather than a second design.
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      {children}
    </main>
  );
}

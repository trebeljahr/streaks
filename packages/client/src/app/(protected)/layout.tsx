"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/lib/auth-client";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="font-semibold">
              My App
            </Link>
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              className="text-muted-foreground hover:text-foreground"
            >
              Profile
            </Link>
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground"
            >
              Settings
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.name ?? user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-muted-foreground hover:text-foreground"
              data-testid="sign-out"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}

"use client";

import { createContext, useContext } from "react";
import { useSession } from "@/lib/auth-client";

type AuthContextType = {
  user: { id: string; name: string; email: string; image?: string } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  const value: AuthContextType = {
    user: session?.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? undefined,
        }
      : null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

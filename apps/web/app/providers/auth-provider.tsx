"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import React, {
  createContext,
  useContext,
  useMemo,
} from "react";
import { api } from "~/lib/convex-api";

interface AuthContextType {
  user: any | null;
  convexUser: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = React.memo(function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded: clerkLoaded } = useUser();
  const { isLoading: convexLoading, isAuthenticated } = useConvexAuth();
  const { signOut: clerkSignOut } = useClerk();
  const router = useRouter();

  // Get the app user from Convex
  const convexUser = useQuery(api.auth.loggedInUser, {});
  const createAppUser = useMutation(api.auth.createAppUser);

  // Create app user if it doesn't exist
  React.useEffect(() => {
    if (isAuthenticated && user && convexUser?.identity && !convexUser?.appUser) {
      createAppUser({});
    }
  }, [isAuthenticated, user, convexUser, createAppUser]);

  const signOut = async () => {
    await clerkSignOut();
    router.push("/");
  };

  const hasRole = (role: string) => {
    const userRole = convexUser?.appUser?.role || "user";
    return userRole === role;
  };

  const loading = !clerkLoaded || convexLoading;

  const contextValue = useMemo(
    () => ({
      user,
      convexUser: convexUser?.appUser || null,
      loading,
      isAuthenticated,
      signOut,
      hasRole,
    }),
    [user, convexUser, loading, isAuthenticated],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

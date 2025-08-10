"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../../provider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireEmailVerification?: boolean;
  allowedRoles?: string[];
}

export function ProtectedRoute({
  children,
  redirectTo = "/sign-in",
  requireEmailVerification = false,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Not authenticated
    if (!user) {
      router.push(redirectTo);
      return;
    }

    // Email verification required but not verified
    if (requireEmailVerification && !user.email_confirmed_at) {
      router.push("/auth/verify-email");
      return;
    }

    // Role-based access control
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = user.user_metadata?.["role"] || "user";
      if (!allowedRoles.includes(userRole)) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [
    user,
    loading,
    router,
    redirectTo,
    requireEmailVerification,
    allowedRoles,
  ]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Don't render children if not authenticated or requirements not met
  if (!user) return null;
  if (requireEmailVerification && !user.email_confirmed_at) return null;
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.user_metadata?.["role"] || "user";
    if (!allowedRoles.includes(userRole)) return null;
  }

  return <>{children}</>;
}

interface PublicOnlyRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function PublicOnlyRoute({
  children,
  redirectTo = "/dashboard",
}: PublicOnlyRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Already authenticated, redirect away
    if (user) {
      router.push(redirectTo);
      return;
    }
  }, [user, loading, router, redirectTo]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Don't render children if authenticated
  if (user) return null;

  return <>{children}</>;
}

interface ConditionalAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  requireEmailVerification?: boolean;
  allowedRoles?: string[];
}

export function ConditionalAuth({
  children,
  fallback = null,
  requireAuth = false,
  requireEmailVerification = false,
  allowedRoles,
}: ConditionalAuthProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    return <>{fallback}</>;
  }

  // Check email verification requirement
  if (requireEmailVerification && (!user || !user.email_confirmed_at)) {
    return <>{fallback}</>;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user) return <>{fallback}</>;

    const userRole = user.user_metadata?.["role"] || "user";
    if (!allowedRoles.includes(userRole)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

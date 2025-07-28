"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "../hooks/use-auth"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  requireRole?: "user" | "moderator" | "admin"
  loadingComponent?: React.ReactNode
  unauthorizedComponent?: React.ReactNode
}

export function AuthGuard({
  children,
  fallback,
  redirectTo = "/auth/signin",
  requireRole,
  loadingComponent,
  unauthorizedComponent,
}: AuthGuardProps) {
  const { user, loading, isAuthenticated, hasRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, loading, router, redirectTo])

  // Show loading state
  if (loading) {
    return (
      loadingComponent ||
      fallback || (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
        </div>
      )
    )
  }

  // User not authenticated
  if (!isAuthenticated || !user) {
    return null // Will redirect via useEffect
  }

  // Role-based access control
  if (requireRole && !hasRole(requireRole)) {
    return (
      unauthorizedComponent || (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="mb-2 font-bold text-2xl text-gray-900">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}

// Higher-order component version
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AuthGuardProps, "children">
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}

// Hook for imperative auth checks
export function useAuthGuard(requireRole?: "user" | "moderator" | "admin") {
  const { isAuthenticated, hasRole, loading } = useAuth()

  const canAccess =
    isAuthenticated && (requireRole ? hasRole(requireRole) : true)

  return {
    canAccess,
    isAuthenticated,
    loading,
    hasRequiredRole: requireRole ? hasRole(requireRole) : true,
  }
}

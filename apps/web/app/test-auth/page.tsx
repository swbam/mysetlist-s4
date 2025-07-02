'use client';

import { useAuth } from '../providers/auth-provider';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { CheckCircle, XCircle, User, Mail, Clock, Shield } from 'lucide-react';

export default function TestAuthPage() {
  const { 
    user, 
    session, 
    loading, 
    isAuthenticated, 
    hasRole,
    signOut 
  } = useAuth();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Authentication System Test</h1>
        <p className="text-muted-foreground">
          This page tests the Supabase authentication integration and displays current auth state.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isAuthenticated ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Authentication Status
            </CardTitle>
            <CardDescription>Current authentication state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Authenticated:</span>
              <Badge variant={isAuthenticated ? "default" : "destructive"}>
                {isAuthenticated ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Loading:</span>
              <Badge variant={loading ? "secondary" : "outline"}>
                {loading ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User Role:</span>
              <Badge variant="outline">
                {user?.appMetadata?.role || 'user'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Admin Access:</span>
              <Badge variant={hasRole('admin') ? "default" : "outline"}>
                {hasRole('admin') ? "Yes" : "No"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
            <CardDescription>Details from the current session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">ID: {user.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Email Verified: {user.emailVerified ? "Yes" : "No"}
                    </span>
                  </div>
                  {user.lastSignIn && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Last Sign In: {new Date(user.lastSignIn).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* User Metadata */}
                {user.metadata && Object.keys(user.metadata).length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">User Metadata:</h4>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(user.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* App Metadata */}
                {user.appMetadata && Object.keys(user.appMetadata).length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">App Metadata:</h4>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(user.appMetadata, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No user data available</p>
            )}
          </CardContent>
        </Card>

        {/* Session Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Session Information
            </CardTitle>
            <CardDescription>Current session details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Access Token:</span>
                  <Badge variant="outline">
                    {session.accessToken ? "Present" : "Missing"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Refresh Token:</span>
                  <Badge variant="outline">
                    {session.refreshToken ? "Present" : "Missing"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Expires At:</span>
                  <span className="text-sm">
                    {session.expiresAt ? new Date(session.expiresAt * 1000).toLocaleString() : "N/A"}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Token Preview:</h4>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                    {session.accessToken?.substring(0, 50)}...
                  </pre>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No session data available</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
            <CardDescription>Authentication-related actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAuthenticated ? (
              <>
                <Button
                  onClick={() => signOut()}
                  variant="destructive"
                  className="w-full"
                >
                  Sign Out
                </Button>
                <div className="space-y-2">
                  <Button
                    onClick={() => window.location.href = '/profile'}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Profile
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/dashboard'}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={() => window.location.href = '/auth/sign-in'}
                  className="w-full"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => window.location.href = '/auth/sign-up'}
                  variant="outline"
                  className="w-full"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Auth Provider Test */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Provider Integration Test</CardTitle>
          <CardDescription>
            Verifies that the auth provider is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded">
              <div className="font-semibold text-lg">
                {typeof useAuth !== 'undefined' ? '✅' : '❌'}
              </div>
              <div className="text-sm text-muted-foreground">useAuth Hook</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="font-semibold text-lg">
                {user !== undefined ? '✅' : '❌'}
              </div>
              <div className="text-sm text-muted-foreground">User State</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="font-semibold text-lg">
                {session !== undefined ? '✅' : '❌'}
              </div>
              <div className="text-sm text-muted-foreground">Session State</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="font-semibold text-lg">
                {typeof signOut === 'function' ? '✅' : '❌'}
              </div>
              <div className="text-sm text-muted-foreground">Auth Methods</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
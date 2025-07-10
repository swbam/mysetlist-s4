'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { CheckCircle, Clock, Mail, Shield, User, XCircle } from 'lucide-react';
import { useAuth } from '../providers/auth-provider';

export default function TestAuthPage() {
  const { user, session, loading, isAuthenticated, hasRole, signOut } =
    useAuth();

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-32 rounded-lg bg-muted" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="h-64 rounded-lg bg-muted" />
            <div className="h-64 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">Authentication System Test</h1>
        <p className="text-muted-foreground">
          This page tests the Supabase authentication integration and displays
          current auth state.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
              <span className="font-medium text-sm">Authenticated:</span>
              <Badge variant={isAuthenticated ? 'default' : 'destructive'}>
                {isAuthenticated ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Loading:</span>
              <Badge variant={loading ? 'secondary' : 'outline'}>
                {loading ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">User Role:</span>
              <Badge variant="outline">
                {user?.app_metadata?.role ||
                  user?.user_metadata?.role ||
                  'user'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Admin Access:</span>
              <Badge variant={hasRole('admin') ? 'default' : 'outline'}>
                {hasRole('admin') ? 'Yes' : 'No'}
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
                      Email Verified: {user.email_confirmed_at ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {user.last_sign_in_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Last Sign In:{' '}
                        {new Date(user.last_sign_in_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Metadata */}
                {user.user_metadata &&
                  Object.keys(user.user_metadata).length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="mb-2 font-medium">User Metadata:</h4>
                      <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                        {JSON.stringify(user.user_metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                {/* App Metadata */}
                {user.app_metadata &&
                  Object.keys(user.app_metadata).length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="mb-2 font-medium">App Metadata:</h4>
                      <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                        {JSON.stringify(user.app_metadata, null, 2)}
                      </pre>
                    </div>
                  )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                No user data available
              </p>
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
                  <span className="font-medium text-sm">Access Token:</span>
                  <Badge variant="outline">
                    {session.access_token ? 'Present' : 'Missing'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Refresh Token:</span>
                  <Badge variant="outline">
                    {session.refresh_token ? 'Present' : 'Missing'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Expires At:</span>
                  <span className="text-sm">
                    {session.expires_at
                      ? new Date(session.expires_at * 1000).toLocaleString()
                      : 'N/A'}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <h4 className="mb-2 font-medium">Token Preview:</h4>
                  <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                    {session.access_token?.substring(0, 50)}...
                  </pre>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                No session data available
              </p>
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
                    onClick={() => (window.location.href = '/profile')}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Profile
                  </Button>
                  <Button
                    onClick={() => (window.location.href = '/dashboard')}
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
                  onClick={() => (window.location.href = '/auth/sign-in')}
                  className="w-full"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => (window.location.href = '/auth/sign-up')}
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded border p-4 text-center">
              <div className="font-semibold text-lg">
                {typeof useAuth !== 'undefined' ? '✅' : '❌'}
              </div>
              <div className="text-muted-foreground text-sm">useAuth Hook</div>
            </div>
            <div className="rounded border p-4 text-center">
              <div className="font-semibold text-lg">
                {user !== undefined ? '✅' : '❌'}
              </div>
              <div className="text-muted-foreground text-sm">User State</div>
            </div>
            <div className="rounded border p-4 text-center">
              <div className="font-semibold text-lg">
                {session !== undefined ? '✅' : '❌'}
              </div>
              <div className="text-muted-foreground text-sm">Session State</div>
            </div>
            <div className="rounded border p-4 text-center">
              <div className="font-semibold text-lg">
                {typeof signOut === 'function' ? '✅' : '❌'}
              </div>
              <div className="text-muted-foreground text-sm">Auth Methods</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

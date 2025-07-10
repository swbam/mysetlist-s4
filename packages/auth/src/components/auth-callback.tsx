'use client';

import {
  Alert,
  AlertDescription,
} from '@repo/design-system/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '../config/supabase';

type CallbackState = 'loading' | 'success' | 'error';

export function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createSupabaseClient();

        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setState('error');
          setMessage(error.message);
          return;
        }

        if (data.session) {
          setState('success');
          setMessage('Successfully signed in! Redirecting...');

          // Get redirect URL from search params or default to dashboard
          const redirectTo = searchParams.get('redirectTo') || '/dashboard';

          // Small delay to show success message
          setTimeout(() => {
            router.push(redirectTo);
          }, 2000);
        } else {
          // Check if this is an email confirmation
          const type = searchParams.get('type');
          const tokenHash = searchParams.get('token_hash');

          if (type === 'signup' && tokenHash) {
            setState('success');
            setMessage('Email confirmed successfully! You can now sign in.');

            setTimeout(() => {
              router.push('/auth/signin');
            }, 3000);
          } else {
            setState('error');
            setMessage('No active session found. Please try signing in again.');

            setTimeout(() => {
              router.push('/auth/signin');
            }, 3000);
          }
        }
      } catch (_err) {
        setState('error');
        setMessage('An unexpected error occurred. Please try again.');

        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  const getIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (state) {
      case 'loading':
        return 'Authenticating...';
      case 'success':
        return 'Success!';
      case 'error':
        return 'Authentication Error';
    }
  };

  const getVariant = () => {
    return state === 'error' ? 'destructive' : 'default';
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">{getIcon()}</div>
          <CardTitle className="text-2xl">{getTitle()}</CardTitle>
          <CardDescription>
            {state === 'loading' &&
              'Please wait while we complete your authentication...'}
            {state === 'success' && 'You have been successfully authenticated.'}
            {state === 'error' &&
              'There was a problem with your authentication.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {message && (
            <Alert variant={getVariant()}>
              <AlertDescription className="text-center">
                {message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

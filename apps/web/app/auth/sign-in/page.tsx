import {
  Alert,
  AlertDescription,
} from '@repo/design-system/components/ui/alert';
import { Button } from '@repo/design-system/components/ui/button';
import { Input } from '@repo/design-system/components/ui/input';
import { Label } from '@repo/design-system/components/ui/label';
import { Checkbox } from '@repo/design-system/components/ui/checkbox';
import { Music } from 'lucide-react';
import Link from 'next/link';
import { signIn, signInWithProvider } from '../actions';

export const dynamic = 'force-dynamic';

interface SignInPageProps {
  searchParams: Promise<{
    message?: string;
    error?: string;
    returnUrl?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const handleSpotifySignIn = async () => {
    'use server';
    await signInWithProvider('spotify');
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center font-bold text-3xl tracking-tight">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-muted-foreground text-sm">
            Or{' '}
            <Link
              href="/auth/sign-up"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" action={signIn}>
          {params?.error && (
            <Alert variant="destructive">
              <AlertDescription>{params.error}</AlertDescription>
            </Alert>
          )}

          {params?.message && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>{params.message}</AlertDescription>
            </Alert>
          )}

          <input
            type="hidden"
            name="redirectTo"
            value={params?.returnUrl || '/'}
          />

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" name="remember" />
              <Label 
                htmlFor="remember" 
                className="text-sm font-normal cursor-pointer"
              >
                Remember me
              </Label>
            </div>
            <Link
              href="/auth/reset-password"
              className="text-primary text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>

          <div className="space-y-4">
            <Button type="submit" className="w-full">
              Sign in
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <form action={handleSpotifySignIn}>
              <Button
                type="submit"
                variant="outline"
                className="w-full border-0 bg-[#1DB954] text-white hover:bg-[#1ed760]"
              >
                <Music className="mr-2 h-4 w-4" />
                Sign in with Spotify
              </Button>
            </form>
          </div>
        </form>
      </div>
    </div>
  );
}

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Music } from "lucide-react";
import Link from "next/link";
import { signInWithProvider, signUp } from "../actions";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const handleSpotifySignIn = async () => {
    "use server";
    await signInWithProvider("spotify");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center font-bold text-3xl tracking-tight">
            Create your account
          </h2>
          <p className="mt-2 text-center text-muted-foreground text-sm">
            Or{" "}
            <Link
              href="/auth/sign-in"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" action={signUp}>
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
                autoComplete="new-password"
                required
                className="mt-1"
                placeholder="••••••••"
                minLength={8}
              />
              <p className="mt-1 text-muted-foreground text-xs">
                Must be at least 8 characters with uppercase, lowercase, and
                numbers
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1"
                placeholder="••••••••"
                minLength={8}
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>

        <div className="space-y-4">
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
            <Button type="submit" variant="outline" className="w-full">
              <Music className="mr-2 h-4 w-4" />
              Sign up with Spotify
            </Button>
          </form>
        </div>

        <p className="text-center text-muted-foreground text-sm">
          By creating an account, you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

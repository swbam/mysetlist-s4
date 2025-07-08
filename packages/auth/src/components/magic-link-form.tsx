'use client';

import {
  Alert,
  AlertDescription,
} from '@repo/design-system/components/ui/alert';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { Input } from '@repo/design-system/components/ui/input';
import { Label } from '@repo/design-system/components/ui/label';
import { CheckCircle, Mail } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { handleAuthError, magicLinkSchema } from '../utils';

export function MagicLinkForm() {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate email
      const validatedData = magicLinkSchema.parse({ email });

      await signInWithMagicLink(validatedData.email);
      setSent(true);
    } catch (err: any) {
      if (err.errors) {
        // Zod validation errors
        setError(err.errors[0]?.message || 'Invalid email address');
      } else {
        // Auth errors
        const authError = handleAuthError(err);
        setError(authError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>We've sent a magic link to {email}</CardDescription>
        </CardHeader>

        <CardContent className="text-center text-gray-600 text-sm">
          <p>
            Click the link in your email to sign in. The link will expire in 15
            minutes.
          </p>
        </CardContent>

        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSent(false);
              setEmail('');
            }}
          >
            Send another link
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign in with magic link</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a secure sign-in link
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={error ? 'border-red-500' : ''}
              placeholder="Enter your email"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <Mail className="mr-2 h-4 w-4" />
            {loading ? 'Sending...' : 'Send magic link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

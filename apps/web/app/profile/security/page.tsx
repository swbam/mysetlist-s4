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
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { Input } from '@repo/design-system/components/ui/input';
import { Label } from '@repo/design-system/components/ui/label';
import { Switch } from '@repo/design-system/components/ui/switch';
import { Loader2, Lock, Shield, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '~/app/providers/auth-provider';
import { createClient } from '~/lib/supabase/client';

export default function SecurityPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showEnableTwoFactor, setShowEnableTwoFactor] = useState(false);
  const [showDisableTwoFactor, setShowDisableTwoFactor] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const supabase = createClient();
      const { data, error: _error } = await supabase
        .from('user_security_settings')
        .select('two_factor_enabled')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setTwoFactorEnabled(data.two_factor_enabled);
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    }
  };

  const handleEnableTwoFactor = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Generate 2FA secret and QR code
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to setup 2FA');
      }

      const data = await response.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setShowEnableTwoFactor(true);
    } catch (error) {
      setError('Failed to setup two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
          secret: secret,
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid verification code');
      }

      setTwoFactorEnabled(true);
      setShowEnableTwoFactor(false);
      setSuccess('Two-factor authentication has been enabled successfully');
      setVerificationCode('');
      setQrCode('');
      setSecret('');
    } catch (error) {
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid verification code');
      }

      setTwoFactorEnabled(false);
      setShowDisableTwoFactor(false);
      setSuccess('Two-factor authentication has been disabled');
      setVerificationCode('');
    } catch (error) {
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="font-bold text-3xl">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage your account security preferences
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                <CardTitle>Two-Factor Authentication</CardTitle>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleEnableTwoFactor();
                  } else {
                    setShowDisableTwoFactor(true);
                  }
                }}
                disabled={loading}
              />
            </div>
            <CardDescription>
              Add an extra layer of security to your account by requiring a
              verification code when signing in
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Enable 2FA Flow */}
        {showEnableTwoFactor && (
          <Card>
            <CardHeader>
              <CardTitle>Set up Two-Factor Authentication</CardTitle>
              <CardDescription>
                Scan this QR code with your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {qrCode && (
                <div className="flex justify-center">
                  <img src={qrCode} alt="2FA QR Code" className="border p-4" />
                </div>
              )}
              <div className="text-center text-muted-foreground text-sm">
                Can't scan? Enter this code manually: <br />
                <code className="mt-1 inline-block rounded bg-muted px-2 py-1 font-mono text-sm">
                  {secret}
                </code>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEnableTwoFactor(false);
                    setVerificationCode('');
                    setQrCode('');
                    setSecret('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyAndEnable}
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disable 2FA Flow */}
        {showDisableTwoFactor && (
          <Card>
            <CardHeader>
              <CardTitle>Disable Two-Factor Authentication</CardTitle>
              <CardDescription>
                Enter your verification code to disable 2FA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="disable-verification-code">
                  Verification Code
                </Label>
                <Input
                  id="disable-verification-code"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDisableTwoFactor(false);
                    setVerificationCode('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisableTwoFactor}
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Disable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Password Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Password</CardTitle>
            </div>
            <CardDescription>
              Change your password or set up passwordless login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <a href="/auth/reset-password">Change Password</a>
            </Button>
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Active Sessions</CardTitle>
            </div>
            <CardDescription>
              Manage your active sessions and sign out of other devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Coming soon: View and manage all active sessions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
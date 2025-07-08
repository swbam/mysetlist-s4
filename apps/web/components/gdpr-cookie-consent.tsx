'use client';

import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/design-system/components/ui/dialog';
import { Switch } from '@repo/design-system/components/ui/switch';
import { BarChart3, Cookie, MapPin, Settings, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

export function GDPRCookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, required
    analytics: false,
    marketing: false,
    personalization: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('mysetlist-cookie-consent');
    const preferences = localStorage.getItem('mysetlist-cookie-preferences');

    if (consent) {
      // Load saved preferences
      if (preferences) {
        setPreferences(JSON.parse(preferences));
      }
      // Initialize analytics based on saved preferences
      initializeAnalytics(
        preferences ? JSON.parse(preferences) : { analytics: false }
      );
    } else {
      // Show banner after a short delay
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const initializeAnalytics = (prefs: CookiePreferences) => {
    // Initialize PostHog with consent
    if (typeof window !== 'undefined' && window.posthog) {
      if (prefs.analytics) {
        window.posthog.opt_in_capturing();
      } else {
        window.posthog.opt_out_capturing();
      }
    }

    // Initialize Google Analytics with consent
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: prefs.analytics ? 'granted' : 'denied',
        ad_storage: prefs.marketing ? 'granted' : 'denied',
        personalization_storage: prefs.personalization ? 'granted' : 'denied',
      });
    }

    // Initialize Sentry with consent
    if (typeof window !== 'undefined' && window.Sentry) {
      if (prefs.analytics) {
        // Sentry is considered analytics for error tracking
        window.Sentry.getCurrentHub().getClient()?.getOptions().enabled = true;
      } else {
        window.Sentry.getCurrentHub().getClient()?.getOptions().enabled = false;
      }
    }
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('mysetlist-cookie-consent', 'given');
    localStorage.setItem('mysetlist-cookie-preferences', JSON.stringify(prefs));
    localStorage.setItem(
      'mysetlist-cookie-consent-date',
      new Date().toISOString()
    );

    setPreferences(prefs);
    initializeAnalytics(prefs);
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
    };
    savePreferences(allAccepted);
    setShowBanner(false);
  };

  const acceptNecessaryOnly = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
    };
    savePreferences(necessaryOnly);
    setShowBanner(false);
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
    setShowSettings(false);
    setShowBanner(false);
  };

  const updatePreference = (key: keyof CookiePreferences, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: key === 'necessary' ? true : value, // Necessary cookies can't be disabled
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed right-0 bottom-0 left-0 z-50 border-t bg-background p-4 shadow-lg">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Cookie className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                <div className="flex-1">
                  <h3 className="mb-2 font-semibold text-lg">
                    We value your privacy
                  </h3>
                  <p className="mb-4 text-muted-foreground text-sm">
                    We use cookies to enhance your experience, analyze traffic,
                    and personalize content. You can choose which cookies to
                    accept. Some cookies are necessary for the site to function
                    properly.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button onClick={acceptAll} className="w-full sm:w-auto">
                      Accept All
                    </Button>
                    <Button
                      onClick={acceptNecessaryOnly}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      Necessary Only
                    </Button>
                    <Button
                      onClick={() => setShowSettings(true)}
                      variant="ghost"
                      className="w-full sm:w-auto"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Customize
                    </Button>
                  </div>
                  <p className="mt-2 text-muted-foreground text-xs">
                    By clicking \"Accept All\", you agree to our{' '}
                    <a href="/privacy" className="underline hover:text-primary">
                      Privacy Policy
                    </a>{' '}
                    and{' '}
                    <a href="/terms" className="underline hover:text-primary">
                      Terms of Service
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Cookie Preferences</span>
            </DialogTitle>
            <DialogDescription>
              Choose which cookies you'd like to allow. You can change these
              settings at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Necessary Cookies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-medium">Necessary Cookies</h4>
                    <p className="text-muted-foreground text-sm">
                      Required for the website to function properly
                    </p>
                  </div>
                </div>
                <Switch
                  checked={true}
                  disabled
                  aria-label="Necessary cookies (always enabled)"
                />
              </div>
              <p className="ml-8 text-muted-foreground text-xs">
                These cookies are essential for authentication, security, and
                basic site functionality. They cannot be disabled.
              </p>
            </div>

            {/* Analytics Cookies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium">Analytics Cookies</h4>
                    <p className="text-muted-foreground text-sm">
                      Help us understand how visitors use our site
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    updatePreference('analytics', checked)
                  }
                  aria-label="Analytics cookies"
                />
              </div>
              <p className="ml-8 text-muted-foreground text-xs">
                We use PostHog and Google Analytics to track page views, user
                interactions, and site performance to improve our service.
              </p>
            </div>

            {/* Marketing Cookies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <div>
                    <h4 className="font-medium">Marketing Cookies</h4>
                    <p className="text-muted-foreground text-sm">
                      Used to deliver relevant advertisements
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    updatePreference('marketing', checked)
                  }
                  aria-label="Marketing cookies"
                />
              </div>
              <p className="ml-8 text-muted-foreground text-xs">
                These cookies track your activity across websites to show you
                relevant ads and measure ad campaign effectiveness.
              </p>
            </div>

            {/* Personalization Cookies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Cookie className="h-5 w-5 text-orange-600" />
                  <div>
                    <h4 className="font-medium">Personalization Cookies</h4>
                    <p className="text-muted-foreground text-sm">
                      Remember your preferences and settings
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.personalization}
                  onCheckedChange={(checked) =>
                    updatePreference('personalization', checked)
                  }
                  aria-label="Personalization cookies"
                />
              </div>
              <p className="ml-8 text-muted-foreground text-xs">
                These cookies remember your language preference, theme choice,
                and other customization settings.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
            <Button
              onClick={saveCustomPreferences}
              className="w-full sm:w-auto"
            >
              Save Preferences
            </Button>
            <Button
              onClick={acceptAll}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Accept All
            </Button>
            <Button
              onClick={acceptNecessaryOnly}
              variant="ghost"
              className="w-full sm:w-auto"
            >
              Necessary Only
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Global types for analytics services
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    posthog?: {
      opt_in_capturing: () => void;
      opt_out_capturing: () => void;
    };
    Sentry?: {
      getCurrentHub: () => {
        getClient: () => {
          getOptions: () => { enabled: boolean };
        } | null;
      };
    };
  }
}

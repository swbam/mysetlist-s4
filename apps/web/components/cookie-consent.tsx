'use client';

import { useState, useEffect } from 'react';
import { Button } from '@repo/design-system/components/ui/button';
import { Card } from '@repo/design-system/components/ui/card';
import Link from 'next/link';
import { X } from 'lucide-react';

const CONSENT_COOKIE_NAME = 'MySetlist-cookie-consent';
const CONSENT_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: true,
    marketing: true,
  });
  
  
  useEffect(() => {
    // Check if consent has been given
    const consent = getCookieConsent();
    if (!consent) {
      setShowBanner(true);
    } else {
      applyConsent(consent);
    }
  }, []);
  
  const getCookieConsent = (): CookiePreferences | null => {
    if (typeof window === 'undefined') return null;
    
    const consent = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${CONSENT_COOKIE_NAME}=`));
    
    if (!consent) return null;
    
    try {
      return JSON.parse(decodeURIComponent(consent.split('=')[1]));
    } catch {
      return null;
    }
  };
  
  const setCookieConsent = (preferences: CookiePreferences) => {
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify(preferences)
    )}; max-age=${CONSENT_COOKIE_MAX_AGE}; path=/; SameSite=Strict`;
    
    applyConsent(preferences);
  };
  
  const applyConsent = (preferences: CookiePreferences) => {
    // Emit custom event for other analytics tools
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cookieConsentUpdated', { detail: preferences })
      );
    }
  };
  
  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    setCookieConsent(allAccepted);
    setShowBanner(false);
  };
  
  const acceptSelected = () => {
    setCookieConsent(preferences);
    setShowBanner(false);
    setShowDetails(false);
  };
  
  const rejectAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    setCookieConsent(onlyNecessary);
    setShowBanner(false);
  };
  
  if (!showBanner) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-sm">
      <Card className="max-w-4xl mx-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">Cookie Preferences</h3>
          <button
            onClick={() => setShowBanner(false)}
            className="p-1 hover:bg-accent rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          We use cookies to enhance your experience on MySetlist. By continuing to use our site, 
          you agree to our use of cookies. You can manage your preferences below.
        </p>
        
        {showDetails && (
          <div className="mb-6 space-y-4">
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Necessary Cookies</span>
                  <p className="text-sm text-muted-foreground">
                    Essential for the website to function properly
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.necessary}
                  disabled
                  className="h-4 w-4"
                />
              </label>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Analytics Cookies</span>
                  <p className="text-sm text-muted-foreground">
                    Help us understand how you use our site
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    analytics: e.target.checked,
                  })}
                  className="h-4 w-4"
                />
              </label>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Marketing Cookies</span>
                  <p className="text-sm text-muted-foreground">
                    Used to personalize your experience
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    marketing: e.target.checked,
                  })}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={acceptAll} className="flex-1">
            Accept All
          </Button>
          {showDetails ? (
            <Button onClick={acceptSelected} variant="outline" className="flex-1">
              Accept Selected
            </Button>
          ) : (
            <Button 
              onClick={() => setShowDetails(true)} 
              variant="outline" 
              className="flex-1"
            >
              Manage Preferences
            </Button>
          )}
          <Button onClick={rejectAll} variant="ghost" className="flex-1">
            Reject All
          </Button>
        </div>
        
        <div className="mt-4 text-center">
          <Link 
            href="/legal/privacy-policy" 
            className="text-sm text-muted-foreground hover:underline"
          >
            Privacy Policy
          </Link>
          <span className="mx-2 text-muted-foreground">·</span>
          <Link 
            href="/legal/cookie-policy" 
            className="text-sm text-muted-foreground hover:underline"
          >
            Cookie Policy
          </Link>
        </div>
      </Card>
    </div>
  );
}
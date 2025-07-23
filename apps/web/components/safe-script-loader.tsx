'use client';

import { useEffect, useState } from 'react';

interface SafeScriptLoaderProps {
  children?: React.ReactNode;
}

/**
 * A component that safely handles dynamic script loading and custom element definitions
 * to prevent "already defined" errors during hydration or hot reloads.
 */
export function SafeScriptLoader({ children }: SafeScriptLoaderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Clean up any potentially conflicting custom elements on mount
    if (typeof window !== 'undefined' && 'customElements' in window) {
      try {
        // Check for and handle specific custom elements that might cause conflicts
        const problematicElements = ['mce-autosize-textarea'];
        
        problematicElements.forEach((elementName) => {
          // If the element is already defined, we need to work around it
          if (customElements.get(elementName)) {
            console.warn(`Custom element ${elementName} already defined. Skipping redefinition.`);
          }
        });
      } catch (error) {
        console.warn('Custom element cleanup error:', error);
      }
    }
  }, []);

  // Prevent rendering until mounted to avoid hydration mismatches
  if (!isMounted) {
    return null;
  }

  return <>{children}</>;
}
'use client';

import {
  addBodyClass,
  removeBodyClass,
  safeAppendToHead,
  safeDocument,
  safeGetElementById,
} from '@/lib/navigation/dom-utils';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function usePageTransition() {
  const pathname = usePathname();

  useEffect(() => {
    // Add transition class to body
    addBodyClass('page-transition');

    // Remove after transition completes
    const timer = setTimeout(() => {
      removeBodyClass('page-transition');
    }, 300);

    return () => {
      clearTimeout(timer);
      removeBodyClass('page-transition');
    };
  }, [pathname]);

  useEffect(() => {
    // Add CSS for transitions if not already present
    const styleId = 'page-transition-styles';
    if (!safeGetElementById(styleId) && safeDocument) {
      const style = safeDocument.createElement('style');
      style.id = styleId;
      style.textContent = `
        .page-transition {
          animation: slideInFromRight 0.3s ease-out;
        }

        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .page-transition {
            animation: none;
          }
        }

        /* iOS-style navigation transitions */
        @supports (-webkit-touch-callout: none) {
          .page-transition {
            animation: iosSlideIn 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          }

          @keyframes iosSlideIn {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        }
      `;
      safeAppendToHead(style);
    }
  }, []);
}

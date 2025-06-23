'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function usePageTransition() {
  const pathname = usePathname();

  useEffect(() => {
    // Add transition class to body
    document.body.classList.add('page-transition');

    // Remove after transition completes
    const timer = setTimeout(() => {
      document.body.classList.remove('page-transition');
    }, 300);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('page-transition');
    };
  }, [pathname]);

  useEffect(() => {
    // Add CSS for transitions if not already present
    const styleId = 'page-transition-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
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
      document.head.appendChild(style);
    }
  }, []);
}
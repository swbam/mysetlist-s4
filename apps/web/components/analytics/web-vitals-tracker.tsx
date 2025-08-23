"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

interface WebVital {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType: string;
}

function sendToAnalytics(metric: WebVital) {
  // Only send in production or when explicitly enabled
  if (
    process.env.NODE_ENV !== "production" &&
    !process.env['NEXT_PUBLIC_ENABLE_ANALYTICS']
  ) {
    console.log("Web Vital:", metric);
    return;
  }

  fetch("/api/analytics/vitals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...metric,
      url: window.location.href,
      timestamp: Date.now(),
    }),
  }).catch((error) => {
    console.warn("Failed to send web vital:", error);
  });
}

export function WebVitalsTracker() {
  useEffect(() => {
    // Track Core Web Vitals
    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }, []);

  return null; // This component only tracks metrics, doesn't render anything
}

export default WebVitalsTracker;

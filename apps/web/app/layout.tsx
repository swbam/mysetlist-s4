import { Toaster } from "@repo/design-system";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { ResponsiveHeader } from "../components/layout/responsive-header";
import { ThemeProvider } from "@repo/design-system/providers/theme";
import { ConvexClientProvider } from "../providers/convex-auth-provider";
// import { CacheManager } from "../components/cache-manager";
import "@repo/design-system/styles/globals";

// Import footer normally (can't use ssr: false in Server Components)
import { Footer } from "./components/footer";

// Optimize font loading
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env['NEXT_PUBLIC_APP_URL'] ?? "https://theset.live",
  ),
  title: {
    template: "%s | TheSet",
    default: "TheSet - Concert Setlist Voting Platform",
  },
  description:
    "Vote on concert setlists, discover new artists, and connect with music fans.",
  keywords: ["concert", "setlist", "music", "voting", "artists", "shows"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://i.scdn.co" />
        <link rel="dns-prefetch" href="https://s1.ticketm.net" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConvexClientProvider>
            <div className="min-h-screen flex flex-col">
              <ResponsiveHeader />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

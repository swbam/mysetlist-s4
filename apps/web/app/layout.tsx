<<<<<<< HEAD
import { Toaster } from "@repo/design-system/components/ui/sonner";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import { ResponsiveHeader } from "../components/layout/responsive-header";
import { ThemeProvider } from "../components/ui/theme-provider";
import { AuthProvider } from "./providers/auth-provider";
=======
import { Inter } from "next/font/google";
import { Metadata } from "next";
import { AuthProvider } from "./providers/auth-provider";
import { Header } from "./components/header";
import { Footer } from "./components/footer";
import { ThemeProvider } from "../components/ui/theme-provider";
import { Toaster } from "@repo/design-system/components/ui/sonner";
import { CacheManager } from "../components/cache-manager";
>>>>>>> fccdd438ab7273b15f8870d2cd1c08442bb2d530
import "@repo/design-system/styles/globals.css";

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
  title: {
    template: "%s | MySetlist",
    default: "MySetlist - Concert Setlist Voting Platform",
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://i.scdn.co" />
        <link rel="dns-prefetch" href="https://s1.ticketm.net" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CacheManager enableAutoRefresh={true} refreshInterval={5 * 60 * 1000}>
            <AuthProvider>
              <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <Toaster />
            </AuthProvider>
          </CacheManager>
        </ThemeProvider>
      </body>
    </html>
  );
}

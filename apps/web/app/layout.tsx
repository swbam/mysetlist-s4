import { Toaster } from "@repo/design-system/components/ui/sonner"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ResponsiveHeader } from "../components/layout/responsive-header"
import { ThemeProvider } from "../components/ui/theme-provider"
import { Footer } from "./components/footer"
import { AuthProvider } from "./providers/auth-provider"
import "@repo/design-system/styles/globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    template: "%s | MySetlist",
    default: "MySetlist - Concert Setlist Voting Platform",
  },
  description:
    "Vote on concert setlists, discover new artists, and connect with music fans.",
  keywords: ["concert", "setlist", "music", "voting", "artists", "shows"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <ResponsiveHeader />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

"use client"

export const dynamic = "force-dynamic"
import { Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { createClient } from "~/lib/supabase/client"

// Force dynamic rendering due to useSearchParams

const supabase = createClient()

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/"

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code")

        if (code) {
          // Exchange the code for a session
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            router.push("/auth/sign-in")
            return
          }
        }

        // Redirect to the next page or home
        router.push(next)
      } catch (_error) {
        router.push("/auth/sign-in")
      }
    }

    handleCallback()
  }, [router, next, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
        <p className="mt-4 text-muted-foreground text-sm">
          Completing authentication...
        </p>
      </div>
    </div>
  )
}

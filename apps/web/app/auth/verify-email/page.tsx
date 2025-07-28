"use client"

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert"
import { Button } from "@repo/design-system/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card"
import { ArrowLeft, CheckCircle, Loader2, Mail, XCircle } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "~/lib/supabase/client"

const supabase = createClient()

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "resend"
  >("loading")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const verifyEmail = async () => {
      const token_hash = searchParams.get("token_hash")
      const type = searchParams.get("type")
      const next = searchParams.get("next") || "/"

      // If we have verification parameters, attempt verification
      if (token_hash && type === "email") {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: "email",
          })

          if (error) {
            setStatus("error")
            setMessage(
              error.message ||
                "Email verification failed. The link may be invalid or expired."
            )
          } else {
            setStatus("success")
            setMessage(
              "Your email has been successfully verified! You can now access all features."
            )

            // Redirect after a short delay
            setTimeout(() => {
              router.push(next)
            }, 2000)
          }
        } catch (_error) {
          setStatus("error")
          setMessage("An unexpected error occurred during verification.")
        }
      } else {
        // No verification parameters, show resend option
        setStatus("resend")
        setMessage("Please check your email for a verification link.")
      }
    }

    verifyEmail()
  }, [router, searchParams])

  const handleResendVerification = async () => {
    if (!email) {
      setMessage("Please enter your email address.")
      return
    }

    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      })

      if (error) {
        setMessage(error.message || "Failed to resend verification email.")
      } else {
        setMessage("Verification email sent! Please check your inbox.")
      }
    } catch (_error) {
      setMessage("An error occurred while sending the verification email.")
    } finally {
      setIsResending(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      case "success":
        return <CheckCircle className="h-12 w-12 text-green-500" />
      case "error":
        return <XCircle className="h-12 w-12 text-red-500" />
      case "resend":
        return <Mail className="h-12 w-12 text-blue-500" />
      default:
        return <Mail className="h-12 w-12 text-muted-foreground" />
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case "loading":
        return "Verifying Email..."
      case "success":
        return "Email Verified!"
      case "error":
        return "Verification Failed"
      case "resend":
        return "Verify Your Email"
      default:
        return "Email Verification"
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/auth/sign-in">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">{getStatusIcon()}</div>
            <CardTitle className="text-2xl">{getStatusTitle()}</CardTitle>
            <CardDescription>
              {status === "loading" &&
                "Please wait while we verify your email address..."}
              {status === "success" && "You will be redirected shortly."}
              {status === "error" &&
                "There was a problem verifying your email."}
              {status === "resend" &&
                "Enter your email to resend the verification link."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert
              variant={
                status === "success"
                  ? "default"
                  : status === "error"
                    ? "destructive"
                    : "default"
              }
            >
              <AlertDescription>{message}</AlertDescription>
            </Alert>

            {status === "resend" && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block font-medium text-sm"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full rounded-md border border-input px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <Button
                  onClick={handleResendVerification}
                  disabled={isResending || !email}
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <Button
                  onClick={() => setStatus("resend")}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Resend Verification Email
                </Button>

                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/sign-up">Try Signing Up Again</Link>
                </Button>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/">Go to Dashboard</Link>
                </Button>
              </div>
            )}

            <div className="text-center text-muted-foreground text-sm">
              Need help?{" "}
              <Link
                href="/contact"
                className="font-medium text-primary hover:underline"
              >
                Contact Support
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2 text-center text-muted-foreground text-sm">
          <p>
            Didn't receive the email? Check your spam folder or{" "}
            <button
              onClick={() => setStatus("resend")}
              className="font-medium text-primary hover:underline"
            >
              try again
            </button>
          </p>
          <p>
            <Link
              href="/auth/sign-in"
              className="font-medium text-primary hover:underline"
            >
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

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
import { ArrowLeft, Mail } from "lucide-react"
import Link from "next/link"
import React, { Suspense } from "react"
import { handleUnsubscribe } from "~/actions/email-notifications"

// Force dynamic rendering due to searchParams usage
export const dynamic = "force-dynamic"

interface UnsubscribePageProps {
  searchParams: Promise<{
    token?: string
    type?: string
  }>
}

async function UnsubscribeContent({ searchParams }: UnsubscribePageProps) {
  const { token, type } = await searchParams

  if (!token) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader className="text-center">
              <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <CardTitle>Invalid Unsubscribe Link</CardTitle>
              <CardDescription>
                The unsubscribe link you clicked is invalid or missing required
                information.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/settings">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go to Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const getEmailTypeDisplay = (emailType?: string) => {
    switch (emailType) {
      case "show_reminders":
        return "show reminders"
      case "new_shows":
        return "new show announcements"
      case "setlist_updates":
        return "setlist updates"
      case "weekly_digest":
        return "weekly digest emails"
      case "marketing":
        return "marketing emails"
      case "all":
        return "all emails"
      default:
        return "emails"
    }
  }

  const handleUnsubscribeClick = async () => {
    await handleUnsubscribe(token, type)
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <CardTitle>Unsubscribe from Emails</CardTitle>
            <CardDescription>
              You're about to unsubscribe from {getEmailTypeDisplay(type)} from
              MySetlist.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                {type === "all"
                  ? "This will disable all email notifications from MySetlist, except for important security emails."
                  : `This will stop you from receiving ${getEmailTypeDisplay(type)} from MySetlist. You can always re-enable these in your settings.`}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-2">
              <form action={handleUnsubscribeClick}>
                <Button type="submit" variant="destructive" className="w-full">
                  Unsubscribe from {getEmailTypeDisplay(type)}
                </Button>
              </form>

              <Link href="/settings" className="w-full">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go to Settings Instead
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function UnsubscribePage(props: UnsubscribePageProps) {
  return React.createElement(
    Suspense as any,
    {
      fallback: (
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-md">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Loading...</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      ),
    },
    React.createElement(UnsubscribeContent, props)
  )
}

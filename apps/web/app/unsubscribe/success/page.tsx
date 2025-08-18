import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { ArrowLeft, CheckCircle, Settings } from "lucide-react";
import Link from "next/link";

// Force dynamic rendering due to searchParams usage
export const dynamic = "force-dynamic";

interface UnsubscribeSuccessPageProps {
  searchParams: {
    type?: string;
  };
}

export default async function UnsubscribeSuccessPage({
  searchParams,
}: UnsubscribeSuccessPageProps) {
  const { type } = searchParams;

  const getEmailTypeDisplay = (emailType?: string) => {
    switch (emailType) {
      case "show_reminders":
        return "show reminders";
      case "new_shows":
        return "new show announcements";
      case "setlist_updates":
        return "setlist updates";
      case "weekly_digest":
        return "weekly digest emails";
      case "marketing":
        return "marketing emails";
      case "all":
        return "all emails";
      default:
        return "emails";
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <CardTitle>Successfully Unsubscribed</CardTitle>
            <CardDescription>
              You have been unsubscribed from {getEmailTypeDisplay(type)} from
              TheSet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-muted-foreground text-sm">
              {type === "all"
                ? "You will no longer receive any email notifications from TheSet, except for important security emails."
                : `You will no longer receive ${getEmailTypeDisplay(type)} from TheSet.`}
            </div>

            <div className="flex flex-col space-y-2">
              <Link href="/settings" className="w-full">
                <Button className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Email Preferences
                </Button>
              </Link>

              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>

            <div className="border-t pt-4 text-center text-muted-foreground text-xs">
              Changed your mind? You can always re-enable these notifications in
              your settings.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

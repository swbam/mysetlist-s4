import {
  Alert,
  AlertDescription,
} from "@repo/design-system/alert";
import { Button } from "@repo/design-system/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";
import { AlertCircle, ArrowLeft, Mail, Settings } from "lucide-react";
import Link from "next/link";

export default function UnsubscribeErrorPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
            <CardTitle>Unsubscribe Failed</CardTitle>
            <CardDescription>
              We couldn't process your unsubscribe request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The unsubscribe link may be invalid, expired, or already used.
                You can manually manage your email preferences in your settings.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col space-y-2">
              <Link href="/settings" className="w-full">
                <Button className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Email Preferences
                </Button>
              </Link>

              <Link href="/contact" className="w-full">
                <Button variant="outline" className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
              </Link>

              <Link href="/" className="w-full">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>

            <div className="border-t pt-4 text-center text-muted-foreground text-xs">
              If you continue to have issues, please contact our support team
              and we'll help you manage your email preferences.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

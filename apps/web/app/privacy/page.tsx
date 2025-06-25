import { createPageMetadata } from '@/lib/seo-metadata';
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';

export const metadata: Metadata = createPageMetadata({
  title: 'Privacy Policy | MySetlist',
  description: 'Learn how MySetlist collects, uses, and protects your personal information.',
});

const PrivacyPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Account Information</h3>
              <p className="text-muted-foreground text-sm">
                When you create an account, we collect your email address, username, and any profile information you choose to provide.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Usage Data</h3>
              <p className="text-muted-foreground text-sm">
                We collect information about how you use our service, including your voting patterns, show attendance, and interaction with content.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Device Information</h3>
              <p className="text-muted-foreground text-sm">
                We may collect information about your device, including IP address, browser type, and operating system for security and analytics purposes.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Service Provision</h3>
              <p className="text-muted-foreground text-sm">
                We use your information to provide and improve our services, including personalized recommendations and notifications.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Communication</h3>
              <p className="text-muted-foreground text-sm">
                We may send you emails about your account, service updates, and promotional content (which you can opt out of).
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Analytics</h3>
              <p className="text-muted-foreground text-sm">
                We analyze usage patterns to improve our service and understand user preferences.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Information Sharing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
              except as described in this policy. We may share information with service providers who assist us in operating 
              our service, conducting business, or serving users.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              We implement appropriate security measures to protect your personal information against unauthorized access, 
              alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Access and Correction</h3>
              <p className="text-muted-foreground text-sm">
                You have the right to access and correct your personal information at any time through your account settings.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Deletion</h3>
              <p className="text-muted-foreground text-sm">
                You can request deletion of your account and personal information by contacting our support team.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Data Portability</h3>
              <p className="text-muted-foreground text-sm">
                You can request a copy of your personal data in a structured, machine-readable format.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              If you have any questions about this Privacy Policy, please contact us at privacy@mysetlist.com
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPage;
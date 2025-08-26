import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";
import type { Metadata } from "next";
import { createPageMetadata } from "~/lib/seo-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service | TheSet",
  description: "Read the terms and conditions for using TheSet services.",
});

const TermsPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="font-bold text-4xl">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              By accessing and using TheSet, you accept and agree to be bound by
              the terms and provision of this agreement. If you do not agree to
              abide by the above, please do not use this service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Use License</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold">Permission is granted to:</h3>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                <li>Create an account and use our services</li>
                <li>Vote on setlists and participate in community features</li>
                <li>
                  Share content in accordance with our community guidelines
                </li>
                <li>Access and use our mobile and web applications</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">
                This license does not include:
              </h3>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                <li>
                  Copying or redistributing our content for commercial purposes
                </li>
                <li>Attempting to reverse engineer our software</li>
                <li>Removing copyright or proprietary notations</li>
                <li>Using our service for illegal or harmful activities</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold">Account Responsibility</h3>
              <p className="text-muted-foreground text-sm">
                You are responsible for maintaining the confidentiality of your
                account and password and for restricting access to your
                computer. You agree to accept responsibility for all activities
                under your account.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Account Termination</h3>
              <p className="text-muted-foreground text-sm">
                We reserve the right to terminate accounts that violate our
                terms of service or community guidelines.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Community Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold">Prohibited Behavior</h3>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
                <li>Harassment, bullying, or threatening other users</li>
                <li>
                  Posting spam, malicious content, or inappropriate material
                </li>
                <li>Impersonating other users or entities</li>
                <li>Attempting to manipulate voting or gaming the system</li>
                <li>Sharing copyrighted content without permission</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content and Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold">Your Content</h3>
              <p className="text-muted-foreground text-sm">
                You retain ownership of content you post, but grant us a license
                to use, display, and distribute it as part of our service.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Our Content</h3>
              <p className="text-muted-foreground text-sm">
                Our service and its original content, features, and
                functionality are owned by TheSet and are protected by
                international copyright, trademark, and other intellectual
                property laws.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disclaimer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              The information on this service is provided on an "as is" basis.
              To the fullest extent permitted by law, this Company excludes all
              representations, warranties, conditions and terms related to our
              service and use of this service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              In no event shall TheSet, nor its directors, employees, partners,
              agents, suppliers, or affiliates, be liable for any indirect,
              incidental, special, consequential, or punitive damages arising
              from your use of the service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              If you have any questions about these Terms of Service, please
              contact us at legal@mysetlist.com
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsPage;

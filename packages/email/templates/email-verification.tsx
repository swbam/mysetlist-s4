import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components"

type EmailVerificationTemplateProps = {
  readonly name: string
  readonly verificationUrl: string
  readonly appUrl: string
  readonly expirationHours?: number
}

export const EmailVerificationTemplate = ({
  name,
  verificationUrl,
  appUrl,
  expirationHours = 24,
}: EmailVerificationTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>Verify your MySetlist email address</Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                ✉️ Verify Your Email Address
              </Text>
              <Text className="text-zinc-700">Hi {name},</Text>
              <Text className="text-zinc-700">
                Welcome to MySetlist! To complete your account setup and start
                discovering amazing live music, please verify your email address
                by clicking the button below.
              </Text>

              <Section className="my-6 rounded-md border border-blue-200 bg-blue-50 p-4">
                <Text className="mb-2 font-medium text-blue-800">
                  🕰️ Quick Action Required
                </Text>
                <Text className="text-blue-700 text-sm">
                  This verification link will expire in {expirationHours} hours.
                  Please verify your email soon to ensure uninterrupted access
                  to your account.
                </Text>
              </Section>

              <Hr className="my-6" />

              <Section className="text-center">
                <Button
                  href={verificationUrl}
                  className="rounded-md bg-green-600 px-8 py-3 font-medium text-white"
                >
                  Verify Email Address
                </Button>
              </Section>

              <Text className="mt-6 text-center text-sm text-zinc-600">
                Or copy and paste this link into your browser:
              </Text>
              <Text className="break-all text-center text-sm text-zinc-500">
                {verificationUrl}
              </Text>

              <Hr className="my-6" />

              <Text className="text-zinc-700">
                Once verified, you'll be able to:
              </Text>
              <Section className="pl-4">
                <Text className="mt-2 mb-1 text-zinc-700">
                  • Follow your favorite artists
                </Text>
                <Text className="mt-1 mb-1 text-zinc-700">
                  • Get personalized show recommendations
                </Text>
                <Text className="mt-1 mb-1 text-zinc-700">
                  • Receive email notifications about new shows
                </Text>
                <Text className="mt-1 mb-1 text-zinc-700">
                  • Access your personalized dashboard
                </Text>
                <Text className="mt-1 mb-2 text-zinc-700">
                  • Contribute to the community
                </Text>
              </Section>

              <Hr className="my-6" />

              <Text className="text-sm text-zinc-500">
                If you're having trouble with the button above, copy and paste
                the URL into your web browser.
              </Text>

              <Text className="mt-4 text-sm text-zinc-500">
                Need help? Contact our support team at{" "}
                <Link
                  href={`${appUrl}/contact`}
                  className="text-zinc-700 underline"
                >
                  {appUrl}/contact
                </Link>
                .
              </Text>

              <Hr className="my-4" />

              <Text className="text-xs text-zinc-400">
                This email was sent to you because you created an account on
                MySetlist. If you did not create this account, please disregard
                this email.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
)

EmailVerificationTemplate.PreviewProps = {
  name: "Alex",
  verificationUrl: "https://MySetlist.app/auth/verify?token=abc123def456",
  appUrl: "https://MySetlist.app",
  expirationHours: 24,
}

export default EmailVerificationTemplate

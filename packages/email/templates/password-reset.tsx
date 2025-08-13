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
} from "@react-email/components";

type PasswordResetTemplateProps = {
  readonly name: string;
  readonly resetUrl: string;
  readonly appUrl: string;
  readonly expirationHours?: number;
};

export const PasswordResetTemplate = ({
  name,
  resetUrl,
  appUrl,
  expirationHours = 24,
}: PasswordResetTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>Reset your TheSet password</Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                🔒 Reset Your Password
              </Text>
              <Text className="text-zinc-700">Hi {name},</Text>
              <Text className="text-zinc-700">
                We received a request to reset your password for your TheSet
                account. If you didn't make this request, you can safely ignore
                this email.
              </Text>

              <Section className="my-6 rounded-md border border-amber-200 bg-amber-50 p-4">
                <Text className="mb-2 font-medium text-amber-800">
                  ⚠️ Security Notice
                </Text>
                <Text className="text-amber-700 text-sm">
                  This password reset link will expire in {expirationHours}{" "}
                  hours for security reasons. If you didn't request this reset,
                  please ignore this email or contact support if you're
                  concerned.
                </Text>
              </Section>

              <Hr className="my-6" />

              <Section className="text-center">
                <Button
                  href={resetUrl}
                  className="rounded-md bg-red-600 px-8 py-3 font-medium text-white"
                >
                  Reset Password
                </Button>
              </Section>

              <Text className="mt-6 text-center text-sm text-zinc-600">
                Or copy and paste this link into your browser:
              </Text>
              <Text className="break-all text-center text-sm text-zinc-500">
                {resetUrl}
              </Text>

              <Hr className="my-6" />

              <Text className="text-sm text-zinc-500">
                If you're having trouble with the button above, copy and paste
                the URL into your web browser.
              </Text>

              <Text className="mt-4 text-sm text-zinc-500">
                For security questions or if you need help, contact our support
                team at{" "}
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
                This email was sent to you because a password reset was
                requested for your TheSet account. If you did not request this
                reset, please disregard this email.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

PasswordResetTemplate.PreviewProps = {
  name: "Alex",
  resetUrl: "https://TheSet.app/auth/reset-password?token=abc123def456",
  appUrl: "https://TheSet.app",
  expirationHours: 24,
};

export default PasswordResetTemplate;

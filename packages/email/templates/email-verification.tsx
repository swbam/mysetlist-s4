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
} from '@react-email/components';

type EmailVerificationTemplateProps = {
  readonly name: string;
  readonly verificationUrl: string;
  readonly appUrl: string;
  readonly expirationHours?: number;
};

export const EmailVerificationTemplate = ({
  name,
  verificationUrl,
  appUrl,
  expirationHours = 24,
}: EmailVerificationTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>Verify your TheSet email address</Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                ✉️ Verify Your Email Address
              </Text>
              <Text className="text-zinc-700">
                Hi {name},
              </Text>
              <Text className="text-zinc-700">
                Welcome to TheSet! To complete your account setup and start discovering amazing live music,
                please verify your email address by clicking the button below.
              </Text>
              
              <Section className="bg-blue-50 p-4 rounded-md my-6 border border-blue-200">
                <Text className="text-blue-800 font-medium mb-2">
                  🕰️ Quick Action Required
                </Text>
                <Text className="text-blue-700 text-sm">
                  This verification link will expire in {expirationHours} hours.
                  Please verify your email soon to ensure uninterrupted access to your account.
                </Text>
              </Section>

              <Hr className="my-6" />
              
              <Section className="text-center">
                <Button
                  href={verificationUrl}
                  className="bg-green-600 text-white px-8 py-3 rounded-md font-medium"
                >
                  Verify Email Address
                </Button>
              </Section>
              
              <Text className="text-zinc-600 text-sm mt-6 text-center">
                Or copy and paste this link into your browser:
              </Text>
              <Text className="text-zinc-500 text-sm text-center break-all">
                {verificationUrl}
              </Text>

              <Hr className="my-6" />
              
              <Text className="text-zinc-700">
                Once verified, you'll be able to:
              </Text>
              <Section className="pl-4">
                <Text className="text-zinc-700 mt-2 mb-1">• Follow your favorite artists</Text>
                <Text className="text-zinc-700 mt-1 mb-1">• Get personalized show recommendations</Text>
                <Text className="text-zinc-700 mt-1 mb-1">• Receive email notifications about new shows</Text>
                <Text className="text-zinc-700 mt-1 mb-1">• Access your personalized dashboard</Text>
                <Text className="text-zinc-700 mt-1 mb-2">• Contribute to the community</Text>
              </Section>
              
              <Hr className="my-6" />
              
              <Text className="text-zinc-500 text-sm">
                If you're having trouble with the button above, copy and paste the URL into your web browser.
              </Text>
              
              <Text className="text-zinc-500 text-sm mt-4">
                Need help? Contact our support team at{' '}
                <Link href={`${appUrl}/contact`} className="text-zinc-700 underline">
                  {appUrl}/contact
                </Link>.
              </Text>
              
              <Hr className="my-4" />
              
              <Text className="text-zinc-400 text-xs">
                This email was sent to you because you created an account on TheSet.
                If you did not create this account, please disregard this email.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

EmailVerificationTemplate.PreviewProps = {
  name: 'Alex',
  verificationUrl: 'https://theset.app/auth/verify?token=abc123def456',
  appUrl: 'https://theset.app',
  expirationHours: 24,
};

export default EmailVerificationTemplate;
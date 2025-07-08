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

type WelcomeTemplateProps = {
  readonly name: string;
  readonly appUrl: string;
};

export const WelcomeTemplate = ({ name, appUrl }: WelcomeTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>Welcome to MySetlist! 🎵</Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                Welcome to MySetlist! 🎵
              </Text>
              <Text className="text-zinc-700">Hi {name},</Text>
              <Text className="text-zinc-700">
                Welcome to MySetlist, your ultimate destination for discovering
                live music and setlists! We're excited to have you join our
                community of music lovers.
              </Text>
              <Text className="text-zinc-700">
                Here's what you can do with MySetlist:
              </Text>
              <Section className="pl-4">
                <Text className="mt-2 mb-1 text-zinc-700">
                  • Follow your favorite artists
                </Text>
                <Text className="mt-1 mb-1 text-zinc-700">
                  • Get notified about upcoming shows
                </Text>
                <Text className="mt-1 mb-1 text-zinc-700">
                  • Explore detailed setlists from concerts
                </Text>
                <Text className="mt-1 mb-1 text-zinc-700">
                  • Discover new music and venues
                </Text>
                <Text className="mt-1 mb-2 text-zinc-700">
                  • Connect with other music fans
                </Text>
              </Section>
              <Hr className="my-6" />
              <Section className="text-center">
                <Button
                  href={`${appUrl}/artists`}
                  className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white"
                >
                  Start Exploring Artists
                </Button>
              </Section>
              <Text className="mt-6 text-sm text-zinc-500">
                Need help getting started? Check out our{' '}
                <Link
                  href={`${appUrl}/help`}
                  className="text-zinc-700 underline"
                >
                  help center
                </Link>{' '}
                or reply to this email.
              </Text>
              <Hr className="my-4" />
              <Text className="text-xs text-zinc-400">
                You're receiving this email because you just signed up for
                MySetlist. You can manage your email preferences{' '}
                <Link
                  href={`${appUrl}/settings`}
                  className="text-zinc-600 underline"
                >
                  here
                </Link>
                .
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

WelcomeTemplate.PreviewProps = {
  name: 'Alex',
  appUrl: 'https://MySetlist.app',
};

export default WelcomeTemplate;

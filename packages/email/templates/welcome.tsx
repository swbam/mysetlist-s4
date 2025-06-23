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
      <Preview>Welcome to TheSet! 🎵</Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                Welcome to TheSet! 🎵
              </Text>
              <Text className="text-zinc-700">
                Hi {name},
              </Text>
              <Text className="text-zinc-700">
                Welcome to TheSet, your ultimate destination for discovering live music and setlists!
                We're excited to have you join our community of music lovers.
              </Text>
              <Text className="text-zinc-700">
                Here's what you can do with TheSet:
              </Text>
              <Section className="pl-4">
                <Text className="text-zinc-700 mt-2 mb-1">• Follow your favorite artists</Text>
                <Text className="text-zinc-700 mt-1 mb-1">• Get notified about upcoming shows</Text>
                <Text className="text-zinc-700 mt-1 mb-1">• Explore detailed setlists from concerts</Text>
                <Text className="text-zinc-700 mt-1 mb-1">• Discover new music and venues</Text>
                <Text className="text-zinc-700 mt-1 mb-2">• Connect with other music fans</Text>
              </Section>
              <Hr className="my-6" />
              <Section className="text-center">
                <Button
                  href={`${appUrl}/artists`}
                  className="bg-zinc-900 text-white px-6 py-3 rounded-md font-medium"
                >
                  Start Exploring Artists
                </Button>
              </Section>
              <Text className="text-zinc-500 text-sm mt-6">
                Need help getting started? Check out our{' '}
                <Link href={`${appUrl}/help`} className="text-zinc-700 underline">
                  help center
                </Link>{' '}
                or reply to this email.
              </Text>
              <Hr className="my-4" />
              <Text className="text-zinc-400 text-xs">
                You're receiving this email because you just signed up for TheSet.
                You can manage your email preferences{' '}
                <Link href={`${appUrl}/settings`} className="text-zinc-600 underline">
                  here
                </Link>.
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
  appUrl: 'https://theset.app',
};

export default WelcomeTemplate;
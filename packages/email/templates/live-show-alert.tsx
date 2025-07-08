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

type Show = {
  id: string;
  name: string;
  artistName: string;
  venue: string;
  date: string;
  time?: string;
  setlistStatus: 'empty' | 'partial' | 'live' | 'complete';
  estimatedDuration?: string;
};

type LiveShowAlertTemplateProps = {
  readonly userName: string;
  readonly show: Show;
  readonly alertType: 'starting-soon' | 'live-now' | 'setlist-live';
  readonly appUrl: string;
};

export const LiveShowAlertTemplate = ({
  userName,
  show,
  alertType,
  appUrl,
}: LiveShowAlertTemplateProps) => {
  const getSubjectContent = () => {
    switch (alertType) {
      case 'starting-soon':
        return {
          emoji: '⏰',
          title: 'Show Starting Soon!',
          message: `${show.artistName} is about to take the stage!`,
          urgency: 'The show starts in 30 minutes.',
        };
      case 'live-now':
        return {
          emoji: '🎵',
          title: 'Show Live Now!',
          message: `${show.artistName} just took the stage!`,
          urgency: 'The show is happening right now.',
        };
      case 'setlist-live':
        return {
          emoji: '📝',
          title: 'Live Setlist Updates!',
          message: `Real-time setlist updates for ${show.artistName} are now available.`,
          urgency: 'Follow along as songs are added to the setlist live.',
        };
      default:
        return {
          emoji: '🎵',
          title: 'Live Show Update',
          message: `${show.artistName} show update`,
          urgency: "Check out what's happening.",
        };
    }
  };

  const content = getSubjectContent();

  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>
          {content.emoji} {content.message}
        </Preview>
        <Body className="bg-zinc-50 font-sans">
          <Container className="mx-auto py-12">
            <Section className="mt-8 rounded-md bg-zinc-200 p-px">
              <Section className="rounded-[5px] bg-white p-8">
                <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                  {content.emoji} {content.title}
                </Text>
                <Text className="text-zinc-700">Hi {userName},</Text>
                <Text className="text-zinc-700">{content.message}</Text>

                <Section
                  className={`my-6 rounded-md border p-6 ${
                    alertType === 'starting-soon'
                      ? 'border-orange-100 bg-gradient-to-r from-orange-50 to-red-50'
                      : alertType === 'live-now'
                        ? 'border-red-100 bg-gradient-to-r from-red-50 to-pink-50'
                        : 'border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50'
                  }`}
                >
                  <Text className="mb-3 font-semibold text-lg text-zinc-900">
                    {show.name}
                  </Text>
                  <Text className="mb-2 text-zinc-700">
                    <strong>Artist:</strong> {show.artistName}
                  </Text>
                  <Text className="mb-2 text-zinc-700">
                    <strong>Venue:</strong> {show.venue}
                  </Text>
                  <Text className="mb-2 text-zinc-700">
                    <strong>Date:</strong> {show.date}
                  </Text>
                  {show.time && (
                    <Text className="mb-2 text-zinc-700">
                      <strong>Time:</strong> {show.time}
                    </Text>
                  )}
                  {show.estimatedDuration && (
                    <Text className="mb-3 text-zinc-700">
                      <strong>Est. Duration:</strong> {show.estimatedDuration}
                    </Text>
                  )}

                  <Section
                    className={`rounded border p-3 ${
                      alertType === 'starting-soon'
                        ? 'border-orange-200 bg-orange-100'
                        : alertType === 'live-now'
                          ? 'border-red-200 bg-red-100'
                          : 'border-blue-200 bg-blue-100'
                    }`}
                  >
                    <Text
                      className={`font-medium text-sm ${
                        alertType === 'starting-soon'
                          ? 'text-orange-800'
                          : alertType === 'live-now'
                            ? 'text-red-800'
                            : 'text-blue-800'
                      }`}
                    >
                      {alertType === 'starting-soon' && '⏰ '}
                      {alertType === 'live-now' && '🔴 '}
                      {alertType === 'setlist-live' && '📝 '}
                      {content.urgency}
                    </Text>
                  </Section>
                </Section>

                {alertType === 'setlist-live' && (
                  <Section className="my-6 rounded-md bg-zinc-50 p-4">
                    <Text className="mb-2 font-medium text-zinc-700">
                      🎵 Setlist Status:{' '}
                      {show.setlistStatus.charAt(0).toUpperCase() +
                        show.setlistStatus.slice(1)}
                    </Text>
                    <Text className="text-sm text-zinc-600">
                      Songs will be added to the setlist in real-time as they're
                      performed. You'll get notifications for each new song
                      added.
                    </Text>
                  </Section>
                )}

                <Hr className="my-6" />

                <Section className="text-center">
                  {alertType === 'live-now' || alertType === 'setlist-live' ? (
                    <>
                      <Text
                        className={`mb-4 font-medium ${
                          alertType === 'live-now'
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {alertType === 'live-now'
                          ? "🔴 LIVE NOW - Don't miss out!"
                          : '📝 Follow along in real-time!'}
                      </Text>

                      <Button
                        href={`${appUrl}/shows/${show.id}/live`}
                        className={`mb-3 rounded-md px-8 py-3 font-medium text-white ${
                          alertType === 'live-now'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {alertType === 'live-now'
                          ? 'Watch Live'
                          : 'Follow Setlist Live'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Text className="mb-4 font-medium text-orange-600">
                        ⏰ Get ready - show starts soon!
                      </Text>

                      <Button
                        href={`${appUrl}/shows/${show.id}`}
                        className="mb-3 rounded-md bg-orange-600 px-8 py-3 font-medium text-white"
                      >
                        View Show Details
                      </Button>
                    </>
                  )}
                  <br />
                  <Button
                    href={`${appUrl}/shows/${show.id}/setlist`}
                    className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white"
                  >
                    View Setlist
                  </Button>
                </Section>

                <Hr className="my-6" />

                <Section className="rounded-md bg-zinc-50 p-4">
                  <Text className="mb-2 font-medium text-zinc-700">
                    📱 Pro Tip:
                  </Text>
                  <Text className="text-sm text-zinc-600">
                    {alertType === 'starting-soon'
                      ? 'Enable push notifications on your phone to get instant updates when the show goes live!'
                      : alertType === 'live-now'
                        ? 'Share this live experience with friends and vote on songs you want to hear!'
                        : 'Bookmark this page to follow along as the setlist builds throughout the show.'}
                  </Text>
                </Section>

                <Hr className="my-6" />

                <Text className="text-sm text-zinc-500">
                  You're receiving this alert because you follow{' '}
                  {show.artistName} or marked this show as attending. You can
                  manage your live show alerts{' '}
                  <Link
                    href={`${appUrl}/settings`}
                    className="text-zinc-700 underline"
                  >
                    here
                  </Link>{' '}
                  or{' '}
                  <Link
                    href={`${appUrl}/unsubscribe?type=live-alerts`}
                    className="text-zinc-700 underline"
                  >
                    unsubscribe from live show alerts
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
};

LiveShowAlertTemplate.PreviewProps = {
  userName: 'Alex',
  show: {
    id: '123',
    name: 'Endless Summer Tour',
    artistName: 'The Midnight',
    venue: 'Red Rocks Amphitheatre',
    date: 'November 15, 2024',
    time: '8:00 PM MST',
    setlistStatus: 'live',
    estimatedDuration: '2 hours',
  },
  alertType: 'live-now',
  appUrl: 'https://MySetlist.app',
};

export default LiveShowAlertTemplate;

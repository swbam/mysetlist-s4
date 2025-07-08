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
  ticketUrl?: string;
};

type ShowReminderTemplateProps = {
  readonly userName: string;
  readonly show: Show;
  readonly appUrl: string;
  readonly daysUntilShow: number;
};

export const ShowReminderTemplate = ({
  userName,
  show,
  appUrl,
  daysUntilShow,
}: ShowReminderTemplateProps) => {
  const timeText =
    daysUntilShow === 0
      ? 'today'
      : daysUntilShow === 1
        ? 'tomorrow'
        : `in ${daysUntilShow} days`;

  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>
          🎵 {show.artistName} is performing {timeText}!
        </Preview>
        <Body className="bg-zinc-50 font-sans">
          <Container className="mx-auto py-12">
            <Section className="mt-8 rounded-md bg-zinc-200 p-px">
              <Section className="rounded-[5px] bg-white p-8">
                <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                  🎵 Show Reminder
                </Text>
                <Text className="text-zinc-700">Hi {userName},</Text>
                <Text className="text-zinc-700">
                  Don't miss out! <strong>{show.artistName}</strong> is
                  performing {timeText}.
                </Text>

                <Section className="my-6 rounded-md bg-zinc-50 p-4">
                  <Text className="mb-2 font-semibold text-zinc-900">
                    {show.name}
                  </Text>
                  <Text className="mb-1 text-zinc-700">
                    <strong>Artist:</strong> {show.artistName}
                  </Text>
                  <Text className="mb-1 text-zinc-700">
                    <strong>Venue:</strong> {show.venue}
                  </Text>
                  <Text className="mb-1 text-zinc-700">
                    <strong>Date:</strong> {show.date}
                  </Text>
                  {show.time && (
                    <Text className="mb-1 text-zinc-700">
                      <strong>Time:</strong> {show.time}
                    </Text>
                  )}
                </Section>

                <Hr className="my-6" />

                <Section className="space-y-3 text-center">
                  <Button
                    href={`${appUrl}/shows/${show.id}`}
                    className="mr-4 rounded-md bg-zinc-900 px-6 py-3 font-medium text-white"
                  >
                    View Show Details
                  </Button>
                  {show.ticketUrl && (
                    <Button
                      href={show.ticketUrl}
                      className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white"
                    >
                      Get Tickets
                    </Button>
                  )}
                </Section>

                <Hr className="my-6" />

                <Text className="text-sm text-zinc-500">
                  You're receiving this reminder because you follow{' '}
                  {show.artistName}. You can manage your notification
                  preferences{' '}
                  <Link
                    href={`${appUrl}/settings`}
                    className="text-zinc-700 underline"
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
};

ShowReminderTemplate.PreviewProps = {
  userName: 'Alex',
  show: {
    id: '123',
    name: 'Summer Tour 2024',
    artistName: 'The Midnight',
    venue: 'Red Rocks Amphitheatre',
    date: 'July 15, 2024',
    time: '8:00 PM',
    ticketUrl: 'https://example.com/tickets',
  },
  appUrl: 'https://MySetlist.app',
  daysUntilShow: 1,
};

export default ShowReminderTemplate;

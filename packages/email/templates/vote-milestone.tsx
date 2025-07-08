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
};

type Song = {
  title: string;
  artist?: string;
  votes: number;
  position: number;
};

type VoteMilestoneTemplateProps = {
  readonly userName: string;
  readonly show: Show;
  readonly song: Song;
  readonly milestone: number;
  readonly totalVotes: number;
  readonly appUrl: string;
};

export const VoteMilestoneTemplate = ({
  userName,
  show,
  song,
  milestone,
  totalVotes,
  appUrl,
}: VoteMilestoneTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>
        🎵 "{song.title}" just hit {milestone} votes!
      </Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                🎵 Vote Milestone Reached!
              </Text>
              <Text className="text-zinc-700">Hi {userName},</Text>
              <Text className="text-zinc-700">
                Exciting news! A song you voted for has reached a major
                milestone.
              </Text>

              <Section className="my-6 rounded-md border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
                <Text className="mb-2 font-bold text-xl text-zinc-900">
                  "{song.title}"
                </Text>
                {song.artist && song.artist !== show.artistName && (
                  <Text className="mb-2 text-zinc-700">
                    <strong>Originally by:</strong> {song.artist}
                  </Text>
                )}
                <Text className="mb-2 text-zinc-700">
                  <strong>Current Position:</strong> #{song.position} in setlist
                </Text>
                <Text className="mb-4 text-zinc-700">
                  <strong>Total Votes:</strong> {song.votes}
                </Text>

                <Section className="rounded border border-green-200 bg-white/70 p-4">
                  <Text className="mb-1 font-semibold text-green-800">
                    🎉 {milestone} Vote Milestone!
                  </Text>
                  <Text className="text-green-700 text-sm">
                    This song is really resonating with fans. Your vote helped
                    make this happen!
                  </Text>
                </Section>
              </Section>

              <Section className="my-6 rounded-md border border-blue-100 bg-blue-50 p-4">
                <Text className="mb-2 font-semibold text-zinc-900">
                  Show Details
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
                <Text className="text-zinc-700">
                  <strong>Total Setlist Votes:</strong> {totalVotes}
                </Text>
              </Section>

              <Hr className="my-6" />

              <Section className="text-center">
                <Text className="mb-4 text-zinc-600">
                  Keep the momentum going! Vote for more songs you'd love to
                  hear.
                </Text>

                <Button
                  href={`${appUrl}/shows/${show.id}`}
                  className="mb-3 rounded-md bg-green-600 px-8 py-3 font-medium text-white"
                >
                  Vote on More Songs
                </Button>
                <br />
                <Button
                  href={`${appUrl}/shows/${show.id}/setlist`}
                  className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white"
                >
                  View Full Setlist
                </Button>
              </Section>

              <Hr className="my-6" />

              <Section className="rounded-md bg-zinc-50 p-4">
                <Text className="mb-2 font-medium text-zinc-700">
                  💡 Did you know?
                </Text>
                <Text className="text-sm text-zinc-600">
                  Songs with higher vote counts are more likely to be played at
                  the show. Your participation helps artists understand what
                  fans want to hear most!
                </Text>
              </Section>

              <Hr className="my-6" />

              <Text className="text-sm text-zinc-500">
                You're receiving this notification because you voted for this
                song. You can manage your notification preferences{' '}
                <Link
                  href={`${appUrl}/settings`}
                  className="text-zinc-700 underline"
                >
                  here
                </Link>{' '}
                or{' '}
                <Link
                  href={`${appUrl}/unsubscribe?type=vote-milestones`}
                  className="text-zinc-700 underline"
                >
                  unsubscribe from vote milestone notifications
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

VoteMilestoneTemplate.PreviewProps = {
  userName: 'Alex',
  show: {
    id: '123',
    name: 'Winter Tour 2024',
    artistName: 'The Midnight',
    venue: 'Red Rocks Amphitheatre',
    date: 'December 15, 2024',
  },
  song: {
    title: 'Endless Summer',
    artist: 'The Midnight',
    votes: 100,
    position: 3,
  },
  milestone: 100,
  totalVotes: 1250,
  appUrl: 'https://MySetlist.app',
};

export default VoteMilestoneTemplate;

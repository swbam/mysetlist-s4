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

type Artist = {
  id: string;
  name: string;
  genre?: string;
  imageUrl?: string;
  upcomingShows: number;
  recentActivity?: string;
};

type ArtistFollowNotificationTemplateProps = {
  readonly userName: string;
  readonly artist: Artist;
  readonly followerName: string;
  readonly isFirstFollow?: boolean;
  readonly appUrl: string;
};

export const ArtistFollowNotificationTemplate = ({
  userName,
  artist,
  followerName,
  isFirstFollow = false,
  appUrl,
}: ArtistFollowNotificationTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>
        {isFirstFollow
          ? `🎉 ${followerName} just became your first follower!`
          : `🎵 ${followerName} started following you`}
      </Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                {isFirstFollow ? '🎉 Your First Follower!' : '🎵 New Follower'}
              </Text>
              <Text className="text-zinc-700">Hi {userName},</Text>
              <Text className="text-zinc-700">
                {isFirstFollow
                  ? `Congratulations! ${followerName} just became your first follower on MySetlist.`
                  : `Great news! ${followerName} started following ${artist.name} on MySetlist.`}
              </Text>

              <Section className="my-6 rounded-md border border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50 p-6">
                <Text className="mb-3 font-semibold text-lg text-zinc-900">
                  {artist.name}
                </Text>
                {artist.genre && (
                  <Text className="mb-2 text-zinc-700">
                    <strong>Genre:</strong> {artist.genre}
                  </Text>
                )}
                <Text className="mb-2 text-zinc-700">
                  <strong>Upcoming Shows:</strong> {artist.upcomingShows}
                </Text>
                {artist.recentActivity && (
                  <Text className="mb-2 text-zinc-700">
                    <strong>Recent Activity:</strong> {artist.recentActivity}
                  </Text>
                )}
              </Section>

              {isFirstFollow && (
                <Section className="my-6 rounded-md border border-yellow-200 bg-yellow-50 p-4">
                  <Text className="mb-2 font-medium text-zinc-700">
                    🌟 Tips for growing your following:
                  </Text>
                  <Text className="mb-1 text-sm text-zinc-600">
                    • Keep your profile updated with recent shows
                  </Text>
                  <Text className="mb-1 text-sm text-zinc-600">
                    • Share upcoming tour dates
                  </Text>
                  <Text className="mb-1 text-sm text-zinc-600">
                    • Engage with your fans in setlist comments
                  </Text>
                  <Text className="text-sm text-zinc-600">
                    • Post behind-the-scenes content
                  </Text>
                </Section>
              )}

              <Hr className="my-6" />

              <Section className="text-center">
                <Button
                  href={`${appUrl}/artists/${artist.id}/followers`}
                  className="mb-3 rounded-md bg-purple-600 px-6 py-3 font-medium text-white"
                >
                  View All Followers
                </Button>
                <br />
                <Button
                  href={`${appUrl}/artists/${artist.id}`}
                  className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white"
                >
                  Visit Your Profile
                </Button>
              </Section>

              <Hr className="my-6" />

              <Text className="text-sm text-zinc-500">
                You're receiving this notification because you manage the artist
                profile for {artist.name}. You can manage your notification
                preferences{' '}
                <Link
                  href={`${appUrl}/settings`}
                  className="text-zinc-700 underline"
                >
                  here
                </Link>{' '}
                or{' '}
                <Link
                  href={`${appUrl}/unsubscribe?type=follower-notifications`}
                  className="text-zinc-700 underline"
                >
                  unsubscribe from follower notifications
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

ArtistFollowNotificationTemplate.PreviewProps = {
  userName: 'Alex',
  artist: {
    id: '123',
    name: 'The Midnight',
    genre: 'Synthwave',
    upcomingShows: 5,
    recentActivity: 'Announced new album "Heroes"',
  },
  followerName: 'Sarah Johnson',
  isFirstFollow: true,
  appUrl: 'https://MySetlist.app',
};

export default ArtistFollowNotificationTemplate;

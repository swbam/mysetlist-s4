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

type Artist = {
  id: string;
  name: string;
  upcomingShows: number;
};

type Show = {
  id: string;
  name: string;
  artistName: string;
  venue: string;
  date: string;
};

type WeeklyDigestTemplateProps = {
  readonly userName: string;
  readonly weekOf: string;
  readonly followedArtists: Artist[];
  readonly upcomingShows: Show[];
  readonly newSetlists: Show[];
  readonly appUrl: string;
  readonly totalFollowedArtists: number;
};

export const WeeklyDigestTemplate = ({
  userName,
  weekOf,
  followedArtists,
  upcomingShows,
  newSetlists,
  appUrl,
  totalFollowedArtists,
}: WeeklyDigestTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>{`Your weekly music digest - ${weekOf}`}</Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                🎵 Your Weekly Music Digest
              </Text>
              <Text className="text-zinc-700">Hi {userName},</Text>
              <Text className="text-zinc-700">
                Here's what's happening with your favorite artists this week (
                {weekOf}).
              </Text>

              {/* Upcoming Shows Section */}
              {upcomingShows.length > 0 && (
                <>
                  <Hr className="my-6" />
                  <Text className="mb-4 font-semibold text-lg text-zinc-900">
                    🎫 Upcoming Shows This Week
                  </Text>
                  {upcomingShows.slice(0, 3).map((show, index) => (
                    <Section
                      key={index}
                      className="mb-3 rounded-md border border-blue-100 bg-blue-50 p-4"
                    >
                      <Text className="mb-1 font-semibold text-zinc-900">
                        {show.artistName}
                      </Text>
                      <Text className="mb-1 text-sm text-zinc-700">
                        {show.venue} • {show.date}
                      </Text>
                      <Link
                        href={`${appUrl}/shows/${show.id}`}
                        className="text-blue-600 text-sm underline"
                      >
                        View Details
                      </Link>
                    </Section>
                  ))}
                  {upcomingShows.length > 3 && (
                    <Text className="text-sm text-zinc-600">
                      And {upcomingShows.length - 3} more shows this week.
                    </Text>
                  )}
                </>
              )}

              {/* New Setlists Section */}
              {newSetlists.length > 0 && (
                <>
                  <Hr className="my-6" />
                  <Text className="mb-4 font-semibold text-lg text-zinc-900">
                    🎵 New Setlists Added
                  </Text>
                  {newSetlists.slice(0, 3).map((show, index) => (
                    <Section
                      key={index}
                      className="mb-3 rounded-md border border-green-100 bg-green-50 p-4"
                    >
                      <Text className="mb-1 font-semibold text-zinc-900">
                        {show.artistName}
                      </Text>
                      <Text className="mb-1 text-sm text-zinc-700">
                        {show.venue} • {show.date}
                      </Text>
                      <Link
                        href={`${appUrl}/setlists/${show.id}`}
                        className="text-green-600 text-sm underline"
                      >
                        View Setlist
                      </Link>
                    </Section>
                  ))}
                  {newSetlists.length > 3 && (
                    <Text className="text-sm text-zinc-600">
                      And {newSetlists.length - 3} more new setlists.
                    </Text>
                  )}
                </>
              )}

              {/* Artists Activity Section */}
              {followedArtists.length > 0 && (
                <>
                  <Hr className="my-6" />
                  <Text className="mb-4 font-semibold text-lg text-zinc-900">
                    🎭 Artist Activity
                  </Text>
                  <Text className="mb-4 text-zinc-700">
                    Here's what your followed artists have been up to:
                  </Text>
                  {followedArtists.slice(0, 5).map((artist, index) => (
                    <Section
                      key={index}
                      className="flex items-center justify-between border-zinc-100 border-b py-2 last:border-b-0"
                    >
                      <Text className="font-medium text-zinc-700">
                        {artist.name}
                      </Text>
                      <Text className="text-sm text-zinc-500">
                        {artist.upcomingShows} upcoming shows
                      </Text>
                    </Section>
                  ))}
                </>
              )}

              {/* Empty State */}
              {upcomingShows.length === 0 &&
                newSetlists.length === 0 &&
                followedArtists.length === 0 && (
                  <>
                    <Hr className="my-6" />
                    <Section className="py-8 text-center">
                      <Text className="mb-4 text-zinc-600">
                        It's been quiet this week! 😴
                      </Text>
                      <Text className="mb-6 text-zinc-600">
                        Follow more artists to get personalized updates about
                        shows and setlists.
                      </Text>
                      <Button
                        href={`${appUrl}/artists`}
                        className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white"
                      >
                        Discover Artists
                      </Button>
                    </Section>
                  </>
                )}

              <Hr className="my-6" />

              <Section className="text-center">
                <Button
                  href={`${appUrl}/dashboard`}
                  className="mb-4 rounded-md bg-zinc-900 px-6 py-3 font-medium text-white"
                >
                  View Your Dashboard
                </Button>
                <Text className="text-sm text-zinc-600">
                  You're following {totalFollowedArtists} artists
                </Text>
              </Section>

              <Hr className="my-6" />

              <Text className="text-sm text-zinc-500">
                You're receiving this weekly digest because you've enabled email
                notifications. You can manage your preferences{" "}
                <Link
                  href={`${appUrl}/settings`}
                  className="text-zinc-700 underline"
                >
                  here
                </Link>{" "}
                or{" "}
                <Link
                  href={`${appUrl}/unsubscribe?type=weekly-digest`}
                  className="text-zinc-700 underline"
                >
                  unsubscribe from weekly digests
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

WeeklyDigestTemplate.PreviewProps = {
  userName: "Alex",
  weekOf: "November 11-17, 2024",
  followedArtists: [
    { id: "1", name: "The Midnight", upcomingShows: 3 },
    { id: "2", name: "Bon Iver", upcomingShows: 1 },
    { id: "3", name: "Arctic Monkeys", upcomingShows: 0 },
  ],
  upcomingShows: [
    {
      id: "1",
      name: "Fall Tour",
      artistName: "The Midnight",
      venue: "The Fillmore",
      date: "Nov 15, 2024",
    },
    {
      id: "2",
      name: "Acoustic Sessions",
      artistName: "Bon Iver",
      venue: "Blue Note",
      date: "Nov 17, 2024",
    },
  ],
  newSetlists: [
    {
      id: "3",
      name: "World Tour",
      artistName: "Arctic Monkeys",
      venue: "Madison Square Garden",
      date: "Nov 12, 2024",
    },
  ],
  appUrl: "https://TheSet.app",
  totalFollowedArtists: 8,
};

export default WeeklyDigestTemplate;

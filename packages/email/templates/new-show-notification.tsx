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

type Show = {
  id: string;
  name: string;
  artistName: string;
  venue: string;
  date: string;
  time?: string;
  ticketUrl?: string;
  announcedAt: string;
};

type NewShowNotificationTemplateProps = {
  readonly userName: string;
  readonly show: Show;
  readonly appUrl: string;
};

export const NewShowNotificationTemplate = ({
  userName,
  show,
  appUrl,
}: NewShowNotificationTemplateProps) => (
  <Tailwind>
    <Html>
      <Head />
      <Preview>🎵 {show.artistName} just announced a new show!</Preview>
      <Body className="bg-zinc-50 font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-zinc-200 p-px">
            <Section className="rounded-[5px] bg-white p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                🎵 New Show Announcement!
              </Text>
              <Text className="text-zinc-700">Hi {userName},</Text>
              <Text className="text-zinc-700">
                Great news! <strong>{show.artistName}</strong> just announced a
                new show. Don't miss your chance to see them live!
              </Text>

              <Section className="my-6 rounded-md border border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
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
                <Text className="mt-3 text-sm text-zinc-500">
                  Announced: {show.announcedAt}
                </Text>
              </Section>

              <Hr className="my-6" />

              <Section className="space-y-3 text-center">
                <Text className="mb-4 text-zinc-600">
                  Act fast - tickets often sell out quickly!
                </Text>

                {show.ticketUrl && (
                  <Button
                    href={show.ticketUrl}
                    className="mb-3 rounded-md bg-green-600 px-8 py-3 font-medium text-white"
                  >
                    Get Tickets Now
                  </Button>
                )}

                <Button
                  href={`${appUrl}/shows/${show.id}`}
                  className="rounded-md bg-zinc-900 px-6 py-3 font-medium text-white"
                >
                  View Show Details
                </Button>
              </Section>

              <Hr className="my-6" />

              <Text className="text-sm text-zinc-500">
                You're receiving this notification because you follow{" "}
                {show.artistName}. You can manage your notification preferences{" "}
                <Link
                  href={`${appUrl}/settings`}
                  className="text-zinc-700 underline"
                >
                  here
                </Link>{" "}
                or{" "}
                <Link
                  href={`${appUrl}/unsubscribe?type=new-shows`}
                  className="text-zinc-700 underline"
                >
                  unsubscribe from new show notifications
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

NewShowNotificationTemplate.PreviewProps = {
  userName: "Alex",
  show: {
    id: "123",
    name: "Winter Acoustic Tour",
    artistName: "Bon Iver",
    venue: "The Greek Theatre",
    date: "December 12, 2024",
    time: "7:30 PM",
    ticketUrl: "https://example.com/tickets",
    announcedAt: "November 15, 2024",
  },
  appUrl: "https://TheSet.app",
};

export default NewShowNotificationTemplate;

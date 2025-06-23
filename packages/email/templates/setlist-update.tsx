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

type Song = {
  title: string;
  artist?: string;
  encore?: boolean;
};

type Show = {
  id: string;
  name: string;
  artistName: string;
  venue: string;
  date: string;
};

type SetlistUpdateTemplateProps = {
  readonly userName: string;
  readonly show: Show;
  readonly newSongs: Song[];
  readonly totalSongs: number;
  readonly appUrl: string;
  readonly updateType: 'new' | 'complete' | 'updated';
};

export const SetlistUpdateTemplate = ({
  userName,
  show,
  newSongs,
  totalSongs,
  appUrl,
  updateType,
}: SetlistUpdateTemplateProps) => {
  const getSubjectText = () => {
    switch (updateType) {
      case 'new':
        return 'New setlist available';
      case 'complete':
        return 'Setlist completed';
      case 'updated':
        return 'Setlist updated';
      default:
        return 'Setlist update';
    }
  };

  const getHeaderText = () => {
    switch (updateType) {
      case 'new':
        return '🎵 New Setlist Available!';
      case 'complete':
        return '✅ Setlist Complete!';
      case 'updated':
        return '🔄 Setlist Updated!';
      default:
        return '🎵 Setlist Update!';
    }
  };

  const getBodyText = () => {
    switch (updateType) {
      case 'new':
        return `A new setlist for ${show.artistName}'s show has been created. Check out what they played!`;
      case 'complete':
        return `The setlist for ${show.artistName}'s show is now complete with ${totalSongs} songs!`;
      case 'updated':
        return `The setlist for ${show.artistName}'s show has been updated with ${newSongs.length} new songs.`;
      default:
        return `The setlist for ${show.artistName}'s show has been updated.`;
    }
  };

  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>
          {getSubjectText()} - {show.artistName} at {show.venue}
        </Preview>
        <Body className="bg-zinc-50 font-sans">
          <Container className="mx-auto py-12">
            <Section className="mt-8 rounded-md bg-zinc-200 p-px">
              <Section className="rounded-[5px] bg-white p-8">
                <Text className="mt-0 mb-4 font-semibold text-2xl text-zinc-950">
                  {getHeaderText()}
                </Text>
                <Text className="text-zinc-700">
                  Hi {userName},
                </Text>
                <Text className="text-zinc-700">
                  {getBodyText()}
                </Text>
                
                <Section className="bg-zinc-50 p-6 rounded-md my-6">
                  <Text className="font-semibold text-zinc-900 mb-3">
                    {show.name}
                  </Text>
                  <Text className="text-zinc-700 mb-2">
                    <strong>Artist:</strong> {show.artistName}
                  </Text>
                  <Text className="text-zinc-700 mb-2">
                    <strong>Venue:</strong> {show.venue}
                  </Text>
                  <Text className="text-zinc-700 mb-4">
                    <strong>Date:</strong> {show.date}
                  </Text>
                  
                  {newSongs.length > 0 && (
                    <>
                      <Text className="font-semibold text-zinc-900 mb-2">
                        {updateType === 'new' ? 'Featured Songs:' : 'New Songs Added:'}
                      </Text>
                      <Section className="pl-4">
                        {newSongs.slice(0, 5).map((song, index) => (
                          <Text key={index} className="text-zinc-700 mb-1">
                            {song.encore ? '🎵 ' : '• '}{song.title}
                            {song.artist && song.artist !== show.artistName && ` (${song.artist})`}
                            {song.encore && ' (Encore)'}
                          </Text>
                        ))}
                        {newSongs.length > 5 && (
                          <Text className="text-zinc-500 text-sm mt-2">
                            ... and {newSongs.length - 5} more songs
                          </Text>
                        )}
                      </Section>
                    </>
                  )}
                  
                  <Text className="text-zinc-600 text-sm mt-4">
                    Total songs: {totalSongs}
                  </Text>
                </Section>

                <Hr className="my-6" />
                
                <Section className="text-center">
                  <Button
                    href={`${appUrl}/setlists/${show.id}`}
                    className="bg-zinc-900 text-white px-6 py-3 rounded-md font-medium"
                  >
                    View Complete Setlist
                  </Button>
                </Section>

                <Hr className="my-6" />
                
                <Text className="text-zinc-500 text-sm">
                  You're receiving this update because you follow {show.artistName} or attended this show.
                  You can manage your notification preferences{' '}
                  <Link href={`${appUrl}/settings`} className="text-zinc-700 underline">
                    here
                  </Link>{' '}
                  or{' '}
                  <Link href={`${appUrl}/unsubscribe?type=setlist-updates`} className="text-zinc-700 underline">
                    unsubscribe from setlist updates
                  </Link>.
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};

SetlistUpdateTemplate.PreviewProps = {
  userName: 'Alex',
  show: {
    id: '123',
    name: 'Summer Tour 2024',
    artistName: 'Arctic Monkeys',
    venue: 'Madison Square Garden',
    date: 'July 20, 2024',
  },
  newSongs: [
    { title: 'Do I Wanna Know?', encore: false },
    { title: 'R U Mine?', encore: false },
    { title: '505', encore: true },
    { title: 'I Wanna Be Yours', encore: true },
  ],
  totalSongs: 18,
  appUrl: 'https://theset.app',
  updateType: 'updated',
};

export default SetlistUpdateTemplate;
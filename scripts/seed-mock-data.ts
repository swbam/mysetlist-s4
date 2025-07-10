#!/usr/bin/env tsx

import { eq, sql } from 'drizzle-orm';
import {
  artistStats,
  artists,
  attendance,
  db,
  setlistSongs,
  setlists,
  showArtists,
  shows,
  songs,
  userFollowsArtists,
  userProfiles,
  users,
  venues,
  votes,
} from '../packages/database';

interface MockArtist {
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
  bio: string;
}

interface MockVenue {
  name: string;
  city: string;
  state: string;
  capacity: number;
  type: string;
}

class MockDataSeeder {
  private stats = {
    artists: 0,
    venues: 0,
    shows: 0,
    songs: 0,
    setlists: 0,
    users: 0,
    votes: 0,
    follows: 0,
    attendance: 0,
  };

  // Mock data definitions
  private mockArtists: MockArtist[] = [
    // Pop Artists
    {
      name: 'Taylor Swift',
      genres: ['pop', 'country', 'indie'],
      popularity: 98,
      followers: 95000000,
      bio: 'Multi-Grammy award-winning artist known for storytelling through music.',
    },
    {
      name: 'Billie Eilish',
      genres: ['pop', 'alternative', 'electropop'],
      popularity: 96,
      followers: 110000000,
      bio: 'Gen Z icon with a unique sound and visual aesthetic.',
    },
    {
      name: 'Olivia Rodrigo',
      genres: ['pop', 'pop rock'],
      popularity: 92,
      followers: 38000000,
      bio: 'Breakout star with emotionally charged pop anthems.',
    },
    {
      name: 'The Weeknd',
      genres: ['r&b', 'pop', 'soul'],
      popularity: 95,
      followers: 90000000,
      bio: 'Canadian singer known for dark, atmospheric R&B.',
    },
    {
      name: 'Dua Lipa',
      genres: ['pop', 'dance pop', 'synth-pop'],
      popularity: 91,
      followers: 88000000,
      bio: 'British pop sensation with disco-influenced hits.',
    },

    // Rock Artists
    {
      name: 'Coldplay',
      genres: ['rock', 'alternative rock', 'pop rock'],
      popularity: 85,
      followers: 80000000,
      bio: 'British rock band known for anthemic songs and spectacular live shows.',
    },
    {
      name: 'Imagine Dragons',
      genres: ['rock', 'pop rock', 'alternative'],
      popularity: 83,
      followers: 74000000,
      bio: 'Las Vegas rock band with arena-filling anthems.',
    },
    {
      name: 'Arctic Monkeys',
      genres: ['indie rock', 'garage rock', 'post-punk'],
      popularity: 81,
      followers: 45000000,
      bio: 'Sheffield band that defined a generation of British indie rock.',
    },
    {
      name: 'Foo Fighters',
      genres: ['rock', 'alternative rock', 'post-grunge'],
      popularity: 78,
      followers: 30000000,
      bio: "Dave Grohl's powerhouse rock band with decades of hits.",
    },
    {
      name: 'Twenty One Pilots',
      genres: ['alternative', 'indie pop', 'rock'],
      popularity: 79,
      followers: 32000000,
      bio: 'Genre-blending duo known for introspective lyrics.',
    },

    // Hip Hop Artists
    {
      name: 'Drake',
      genres: ['hip hop', 'rap', 'r&b'],
      popularity: 94,
      followers: 140000000,
      bio: 'Toronto rapper who redefined modern hip-hop.',
    },
    {
      name: 'Kendrick Lamar',
      genres: ['hip hop', 'rap', 'west coast'],
      popularity: 88,
      followers: 49000000,
      bio: 'Pulitzer Prize-winning rapper and lyricist.',
    },
    {
      name: 'Travis Scott',
      genres: ['hip hop', 'trap', 'rap'],
      popularity: 86,
      followers: 52000000,
      bio: 'Houston rapper known for psychedelic production and energetic shows.',
    },
    {
      name: 'Bad Bunny',
      genres: ['reggaeton', 'latin trap', 'latin'],
      popularity: 93,
      followers: 70000000,
      bio: 'Puerto Rican superstar breaking language barriers.',
    },
    {
      name: 'Post Malone',
      genres: ['hip hop', 'pop', 'rock'],
      popularity: 85,
      followers: 68000000,
      bio: 'Genre-defying artist blending hip-hop, pop, and rock.',
    },

    // Electronic Artists
    {
      name: 'Calvin Harris',
      genres: ['edm', 'dance', 'electro house'],
      popularity: 82,
      followers: 38000000,
      bio: 'Scottish DJ and producer with countless chart-toppers.',
    },
    {
      name: 'The Chainsmokers',
      genres: ['edm', 'pop', 'future bass'],
      popularity: 77,
      followers: 32000000,
      bio: 'DJ duo known for catchy electronic pop hits.',
    },
    {
      name: 'Marshmello',
      genres: ['edm', 'future bass', 'trap'],
      popularity: 79,
      followers: 56000000,
      bio: 'Masked DJ/producer with mainstream crossover success.',
    },
    {
      name: 'deadmau5',
      genres: ['progressive house', 'electro house', 'techno'],
      popularity: 74,
      followers: 17000000,
      bio: 'Canadian electronic music producer and performer.',
    },
    {
      name: 'Skrillex',
      genres: ['dubstep', 'edm', 'electronic'],
      popularity: 76,
      followers: 25000000,
      bio: 'Pioneer of American dubstep and bass music.',
    },

    // Indie/Alternative Artists
    {
      name: 'Tame Impala',
      genres: ['psychedelic rock', 'indie', 'neo-psychedelia'],
      popularity: 78,
      followers: 32000000,
      bio: "Kevin Parker's psychedelic music project from Australia.",
    },
    {
      name: 'The 1975',
      genres: ['indie rock', 'pop rock', 'alternative'],
      popularity: 77,
      followers: 29000000,
      bio: 'British band known for genre-bending and social commentary.',
    },
    {
      name: 'Glass Animals',
      genres: ['indie rock', 'psychedelic pop', 'alternative'],
      popularity: 76,
      followers: 28000000,
      bio: 'Oxford band with a unique blend of indie and electronic sounds.',
    },
    {
      name: 'Foster The People',
      genres: ['indie pop', 'alternative', 'indie rock'],
      popularity: 72,
      followers: 15000000,
      bio: 'LA band known for catchy indie pop anthems.',
    },
    {
      name: 'MGMT',
      genres: ['indie rock', 'psychedelic pop', 'new wave'],
      popularity: 71,
      followers: 18000000,
      bio: 'Experimental duo pushing the boundaries of pop music.',
    },
  ];

  private mockVenues: MockVenue[] = [
    // Large Arenas/Stadiums
    {
      name: 'Madison Square Garden',
      city: 'New York',
      state: 'NY',
      capacity: 20000,
      type: 'arena',
    },
    {
      name: 'The Forum',
      city: 'Los Angeles',
      state: 'CA',
      capacity: 17500,
      type: 'arena',
    },
    {
      name: 'United Center',
      city: 'Chicago',
      state: 'IL',
      capacity: 23500,
      type: 'arena',
    },
    {
      name: 'Barclays Center',
      city: 'Brooklyn',
      state: 'NY',
      capacity: 19000,
      type: 'arena',
    },
    {
      name: 'TD Garden',
      city: 'Boston',
      state: 'MA',
      capacity: 19600,
      type: 'arena',
    },

    // Music Venues
    {
      name: 'Red Rocks Amphitheatre',
      city: 'Morrison',
      state: 'CO',
      capacity: 9525,
      type: 'amphitheater',
    },
    {
      name: 'The Fillmore',
      city: 'San Francisco',
      state: 'CA',
      capacity: 1315,
      type: 'theater',
    },
    {
      name: 'House of Blues',
      city: 'Chicago',
      state: 'IL',
      capacity: 1800,
      type: 'club',
    },
    {
      name: 'The Troubadour',
      city: 'West Hollywood',
      state: 'CA',
      capacity: 500,
      type: 'club',
    },
    {
      name: 'Terminal 5',
      city: 'New York',
      state: 'NY',
      capacity: 3000,
      type: 'club',
    },

    // Theaters
    {
      name: 'Radio City Music Hall',
      city: 'New York',
      state: 'NY',
      capacity: 6000,
      type: 'theater',
    },
    {
      name: 'The Wiltern',
      city: 'Los Angeles',
      state: 'CA',
      capacity: 1850,
      type: 'theater',
    },
    {
      name: 'The Paramount Theatre',
      city: 'Seattle',
      state: 'WA',
      capacity: 2807,
      type: 'theater',
    },
    {
      name: 'Fox Theatre',
      city: 'Atlanta',
      state: 'GA',
      capacity: 4665,
      type: 'theater',
    },
    {
      name: 'Beacon Theatre',
      city: 'New York',
      state: 'NY',
      capacity: 2894,
      type: 'theater',
    },

    // Amphitheaters
    {
      name: 'Hollywood Bowl',
      city: 'Los Angeles',
      state: 'CA',
      capacity: 17500,
      type: 'amphitheater',
    },
    {
      name: 'Gorge Amphitheatre',
      city: 'George',
      state: 'WA',
      capacity: 27500,
      type: 'amphitheater',
    },
    {
      name: 'Merriweather Post Pavilion',
      city: 'Columbia',
      state: 'MD',
      capacity: 19300,
      type: 'amphitheater',
    },
    {
      name: 'Greek Theatre',
      city: 'Los Angeles',
      state: 'CA',
      capacity: 5900,
      type: 'amphitheater',
    },
    {
      name: 'Alpine Valley Music Theatre',
      city: 'East Troy',
      state: 'WI',
      capacity: 37000,
      type: 'amphitheater',
    },
  ];

  private songTemplates = [
    // Song title templates
    'Midnight {mood}',
    '{color} Lights',
    '{season} Dreams',
    '{city} Nights',
    'Electric {noun}',
    '{adjective} Love',
    'Dancing in the {place}',
    '{number} Reasons',
    'Lost in {place}',
    '{day} Morning',
    'Chasing {noun}',
    '{color} Sky',
    'Never {verb}',
    'Always {verb}',
    '{adjective} Days',
    'Golden {noun}',
    'Silver {noun}',
    'Crystal {noun}',
    'Burning {noun}',
    'Frozen {noun}',
    'Hidden {place}',
    'Secret {noun}',
    'Broken {noun}',
    'Perfect {noun}',
    'Endless {noun}',
    'Forever {adjective}',
    "Yesterday's {noun}",
    "Tomorrow's {noun}",
    "Tonight's {noun}",
    'Summer {noun}',
    'Winter {noun}',
    'Autumn {noun}',
    'Spring {noun}',
  ];

  private placeholders = {
    mood: ['Blues', 'Joy', 'Sorrow', 'Hope', 'Dream', 'Fear', 'Love', 'Peace'],
    color: [
      'Neon',
      'Blue',
      'Red',
      'Golden',
      'Silver',
      'Black',
      'White',
      'Purple',
    ],
    season: ['Summer', 'Winter', 'Spring', 'Autumn', 'Endless', 'Eternal'],
    city: ['Paris', 'Tokyo', 'London', 'NYC', 'LA', 'Chicago', 'Miami'],
    noun: ['Heart', 'Soul', 'Mind', 'Fire', 'Rain', 'Storm', 'Wave', 'Star'],
    adjective: [
      'Beautiful',
      'Dangerous',
      'Mysterious',
      'Electric',
      'Magnetic',
      'Cosmic',
    ],
    place: ['Dark', 'Light', 'Rain', 'Stars', 'Clouds', 'Fire', 'Ocean'],
    number: ['One', 'Two', 'Three', 'Seven', 'Hundred', 'Thousand', 'Million'],
    verb: ['Leave', 'Stay', 'Run', 'Hide', 'Dance', 'Sing', 'Cry', 'Laugh'],
    day: ['Monday', 'Friday', 'Sunday', 'Rainy', 'Sunny', 'Cloudy', 'Stormy'],
  };

  async seed(): Promise<void> {
    // Clear existing data first (optional)
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      await this.clearDatabase();
    }

    // Seed in order
    await this.seedArtists();
    await this.seedVenues();
    await this.seedShows();
    await this.seedSongs();
    await this.seedSetlists();
    await this.seedUsers();
    await this.seedInteractions();
    await this.updateStats();
  }

  private async clearDatabase(): Promise<void> {
    // Delete in reverse order of dependencies
    await db.delete(votes);
    await db.delete(attendance);
    await db.delete(userFollowsArtists);
    await db.delete(artistStats);
    await db.delete(userProfiles);
    await db.delete(users);
    await db.delete(setlistSongs);
    await db.delete(setlists);
    await db.delete(showArtists);
    await db.delete(shows);
    await db.delete(songs);
    await db.delete(venues);
    await db.delete(artists);
  }

  private async seedArtists(): Promise<void> {
    for (const mockArtist of this.mockArtists) {
      try {
        const slug = mockArtist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const [_artist] = await db
          .insert(artists)
          .values({
            name: mockArtist.name,
            slug,
            genres: JSON.stringify(mockArtist.genres),
            popularity: mockArtist.popularity,
            followers: mockArtist.followers,
            followerCount: Math.floor(mockArtist.followers / 1000),
            verified: true,
            bio: mockArtist.bio,
            imageUrl: `https://picsum.photos/seed/${slug}/400/400`,
            smallImageUrl: `https://picsum.photos/seed/${slug}/200/200`,
            trendingScore: mockArtist.popularity * 0.8 + Math.random() * 20,
            lastSyncedAt: new Date(),
          })
          .returning();

        this.stats.artists++;
      } catch (_error) {}
    }
  }

  private async seedVenues(): Promise<void> {
    for (const mockVenue of this.mockVenues) {
      try {
        const slug = mockVenue.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const [_venue] = await db
          .insert(venues)
          .values({
            name: mockVenue.name,
            slug,
            city: mockVenue.city,
            state: mockVenue.state,
            country: 'US',
            capacity: mockVenue.capacity,
            venueType: mockVenue.type,
            timezone: this.getTimezoneForState(mockVenue.state),
            latitude: this.getApproxLatitude(mockVenue.city),
            longitude: this.getApproxLongitude(mockVenue.city),
            imageUrl: `https://picsum.photos/seed/${slug}/600/400`,
          })
          .returning();

        this.stats.venues++;
      } catch (_error) {}
    }
  }

  private async seedShows(): Promise<void> {
    const artistList = await db.select().from(artists);
    const venueList = await db.select().from(venues);

    // Create 3-5 shows per artist
    for (const artist of artistList) {
      const showCount = Math.floor(Math.random() * 3) + 3;

      for (let i = 0; i < showCount; i++) {
        try {
          const venue = venueList[Math.floor(Math.random() * venueList.length)];
          const daysOffset = Math.floor(Math.random() * 180) - 60; // -60 to +120 days
          const showDate = new Date();
          showDate.setDate(showDate.getDate() + daysOffset);

          const status = showDate > new Date() ? 'upcoming' : 'completed';
          const tourNames = [
            'World Tour',
            'Summer Tour',
            'Acoustic Tour',
            'Festival Circuit',
            'Album Tour',
          ];
          const tourName =
            tourNames[Math.floor(Math.random() * tourNames.length)];

          const [show] = await db
            .insert(shows)
            .values({
              headlinerArtistId: artist.id,
              venueId: venue.id,
              name: `${artist.name} - ${tourName} at ${venue.name}`,
              slug: `${artist.slug}-${venue.slug}-${showDate.getTime()}`,
              date: showDate.toISOString().split('T')[0],
              startTime: `${19 + Math.floor(Math.random() * 3)}:00:00`,
              status,
              description: `Don't miss ${artist.name} live at ${venue.name}! Part of their ${tourName}.`,
              imageUrl: `https://picsum.photos/seed/show-${artist.id}-${i}/800/600`,
              minPrice: 25 + Math.floor(Math.random() * 75),
              maxPrice: 100 + Math.floor(Math.random() * 200),
              viewCount: Math.floor(Math.random() * 10000),
              attendeeCount: Math.floor(Math.random() * venue.capacity * 0.8),
              trendingScore:
                status === 'upcoming'
                  ? 20 + Math.random() * 30
                  : Math.random() * 20,
            })
            .returning();

          // Add to show_artists
          await db.insert(showArtists).values({
            showId: show.id,
            artistId: artist.id,
            artistType: 'headliner',
            orderIndex: 0,
          });

          this.stats.shows++;
        } catch (_error) {}
      }
    }
  }

  private async seedSongs(): Promise<void> {
    const artistList = await db.select().from(artists);

    for (const artist of artistList) {
      // Create 15-30 songs per artist
      const songCount = Math.floor(Math.random() * 15) + 15;
      const albumCount = Math.ceil(songCount / 10);

      for (let albumIndex = 0; albumIndex < albumCount; albumIndex++) {
        const albumName = `${artist.name} - Album ${albumIndex + 1}`;
        const songsInAlbum = Math.min(10, songCount - albumIndex * 10);

        for (let songIndex = 0; songIndex < songsInAlbum; songIndex++) {
          try {
            const songTitle = this.generateSongTitle();

            await db.insert(songs).values({
              title: songTitle,
              artist: artist.name,
              artistId: artist.id,
              album: albumName,
              durationMs: 180000 + Math.floor(Math.random() * 180000), // 3-6 minutes
              popularity: Math.floor(Math.random() * 100),
              isExplicit: Math.random() > 0.8,
              isPlayable: true,
              albumImageUrl: `https://picsum.photos/seed/album-${artist.id}-${albumIndex}/300/300`,
              releaseDate: new Date(
                Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .split('T')[0],
            });

            this.stats.songs++;
          } catch (_error) {}
        }
      }
    }
  }

  private async seedSetlists(): Promise<void> {
    const showList = await db.select().from(shows);
    const songsByArtist = await db.select().from(songs);

    for (const show of showList) {
      try {
        const artistSongs = songsByArtist.filter(
          (s) => s.artistId === show.headlinerArtistId
        );

        if (artistSongs.length < 10) {
          continue;
        }

        // Main set
        const [mainSet] = await db
          .insert(setlists)
          .values({
            showId: show.id,
            artistId: show.headlinerArtistId,
            type: show.status === 'completed' ? 'actual' : 'predicted',
            name: 'Main Set',
            orderIndex: 0,
            isLocked: show.status === 'completed',
          })
          .returning();

        // Add 12-18 songs to main set
        const mainSetCount = 12 + Math.floor(Math.random() * 7);
        const mainSetSongs = this.shuffleArray(artistSongs).slice(
          0,
          mainSetCount
        );

        for (let i = 0; i < mainSetSongs.length; i++) {
          await db.insert(setlistSongs).values({
            setlistId: mainSet.id,
            songId: mainSetSongs[i].id,
            position: i + 1,
            isPlayed: show.status === 'completed' ? Math.random() > 0.05 : null,
            upvotes: Math.floor(Math.random() * 200),
            downvotes: Math.floor(Math.random() * 50),
            netVotes: 0,
          });
        }

        this.stats.setlists++;

        // Encore (80% chance)
        if (Math.random() > 0.2) {
          const [encore] = await db
            .insert(setlists)
            .values({
              showId: show.id,
              artistId: show.headlinerArtistId,
              type: show.status === 'completed' ? 'actual' : 'predicted',
              name: 'Encore',
              orderIndex: 1,
              isLocked: show.status === 'completed',
            })
            .returning();

          // Add 2-4 songs to encore
          const encoreCount = 2 + Math.floor(Math.random() * 3);
          const encoreSongs = this.shuffleArray(artistSongs).slice(
            0,
            encoreCount
          );

          for (let i = 0; i < encoreSongs.length; i++) {
            await db.insert(setlistSongs).values({
              setlistId: encore.id,
              songId: encoreSongs[i].id,
              position: i + 1,
              isPlayed: show.status === 'completed' ? true : null,
              upvotes: Math.floor(Math.random() * 300),
              downvotes: Math.floor(Math.random() * 30),
              netVotes: 0,
            });
          }

          this.stats.setlists++;
        }
      } catch (_error) {}
    }
  }

  private async seedUsers(): Promise<void> {
    const userTemplates = [
      { email: 'john.doe@example.com', name: 'John Doe', username: 'johndoe' },
      {
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        username: 'janesmith',
      },
      {
        email: 'music.fan@example.com',
        name: 'Music Fan',
        username: 'musicfan',
      },
      {
        email: 'concert.lover@example.com',
        name: 'Concert Lover',
        username: 'concertlover',
      },
      {
        email: 'indie.kid@example.com',
        name: 'Indie Kid',
        username: 'indiekid',
      },
      {
        email: 'rock.star@example.com',
        name: 'Rock Star',
        username: 'rockstar',
      },
      {
        email: 'pop.princess@example.com',
        name: 'Pop Princess',
        username: 'popprincess',
      },
      {
        email: 'edm.raver@example.com',
        name: 'EDM Raver',
        username: 'edmraver',
      },
      {
        email: 'hip.hop.head@example.com',
        name: 'Hip Hop Head',
        username: 'hiphophead',
      },
      {
        email: 'festival.goer@example.com',
        name: 'Festival Goer',
        username: 'festivalgoer',
      },
      {
        email: 'vinyl.collector@example.com',
        name: 'Vinyl Collector',
        username: 'vinylcollector',
      },
      {
        email: 'live.music@example.com',
        name: 'Live Music Enthusiast',
        username: 'livemusic',
      },
      {
        email: 'setlist.tracker@example.com',
        name: 'Setlist Tracker',
        username: 'setlisttracker',
      },
      {
        email: 'front.row@example.com',
        name: 'Front Row Fan',
        username: 'frontrow',
      },
      {
        email: 'backstage.pass@example.com',
        name: 'Backstage Pass',
        username: 'backstagepass',
      },
    ];

    for (const template of userTemplates) {
      try {
        const [user] = await db
          .insert(users)
          .values({
            email: template.email,
            emailVerified: new Date(),
          })
          .returning();

        await db.insert(userProfiles).values({
          userId: user.id,
          username: template.username,
          displayName: template.name,
          bio: `${template.name} - Passionate about live music and discovering new artists!`,
          avatarUrl: `https://picsum.photos/seed/${template.username}/200/200`,
          favoriteGenres: JSON.stringify(this.getRandomGenres()),
          showsAttended: Math.floor(Math.random() * 100),
          songsVoted: Math.floor(Math.random() * 500),
        });

        this.stats.users++;
      } catch (_error) {}
    }
  }

  private async seedInteractions(): Promise<void> {
    const userList = await db.select().from(users);
    const artistList = await db.select().from(artists);
    const showList = await db.select().from(shows);
    const setlistSongsList = await db.select().from(setlistSongs).limit(200);

    // User follows
    for (const user of userList) {
      const followCount = 5 + Math.floor(Math.random() * 15);
      const artistsToFollow = this.shuffleArray(artistList).slice(
        0,
        followCount
      );

      for (const artist of artistsToFollow) {
        try {
          await db.insert(userFollowsArtists).values({
            userId: user.id,
            artistId: artist.id,
            followedAt: new Date(
              Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
            ),
          });
          this.stats.follows++;
        } catch (_error) {
          // Ignore duplicates
        }
      }
    }

    // User votes
    for (const user of userList) {
      const voteCount = 20 + Math.floor(Math.random() * 80);
      const songsToVote = this.shuffleArray(setlistSongsList).slice(
        0,
        voteCount
      );

      for (const song of songsToVote) {
        try {
          const voteType = Math.random() > 0.25 ? 'up' : 'down'; // 75% upvotes
          await db.insert(votes).values({
            userId: user.id,
            setlistSongId: song.id,
            voteType,
            votedAt: new Date(
              Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000
            ),
          });
          this.stats.votes++;
        } catch (_error) {
          // Ignore duplicates
        }
      }
    }

    // User attendance
    for (const user of userList) {
      const attendCount = 3 + Math.floor(Math.random() * 12);
      const showsToAttend = this.shuffleArray(showList).slice(0, attendCount);

      for (const show of showsToAttend) {
        try {
          await db.insert(attendance).values({
            userId: user.id,
            showId: show.id,
            status: show.status === 'completed' ? 'attended' : 'going',
            createdAt: new Date(
              Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
            ),
          });
          this.stats.attendance++;
        } catch (_error) {
          // Ignore duplicates
        }
      }
    }
  }

  private async updateStats(): Promise<void> {
    // Update artist stats
    const artistList = await db.select().from(artists);

    for (const artist of artistList) {
      const showCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(shows)
        .where(eq(shows.headlinerArtistId, artist.id));

      const upcomingShowCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(shows)
        .where(eq(shows.headlinerArtistId, artist.id))
        .where(eq(shows.status, 'upcoming'));

      const followerCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(userFollowsArtists)
        .where(eq(userFollowsArtists.artistId, artist.id));

      try {
        await db.insert(artistStats).values({
          artistId: artist.id,
          totalShows: Number(showCount[0].count),
          upcomingShows: Number(upcomingShowCount[0].count),
          totalVotes: Math.floor(Math.random() * 10000),
          avgShowRating: 3.5 + Math.random() * 1.5, // 3.5-5.0
          followerCount: Number(followerCount[0].count),
          lastShowDate: new Date(),
        });
      } catch (_error) {
        // Update if exists
        await db
          .update(artistStats)
          .set({
            totalShows: Number(showCount[0].count),
            upcomingShows: Number(upcomingShowCount[0].count),
            followerCount: Number(followerCount[0].count),
            updatedAt: new Date(),
          })
          .where(eq(artistStats.artistId, artist.id));
      }
    }

    // Update trending scores
    await db.execute(sql`
      UPDATE artists
      SET trending_score = popularity * 0.5 + RANDOM() * 50
    `);

    await db.execute(sql`
      UPDATE shows
      SET trending_score = 
        CASE 
          WHEN status = 'upcoming' THEN 30 + RANDOM() * 40
          ELSE RANDOM() * 20
        END
    `);
  }

  // Helper methods
  private generateSongTitle(): string {
    const template =
      this.songTemplates[Math.floor(Math.random() * this.songTemplates.length)];
    let title = template;

    // Replace placeholders
    Object.entries(this.placeholders).forEach(([key, values]) => {
      const placeholder = `{${key}}`;
      if (title.includes(placeholder)) {
        const value = values[Math.floor(Math.random() * values.length)];
        title = title.replace(placeholder, value);
      }
    });

    return title;
  }

  private getRandomGenres(): string[] {
    const allGenres = [
      'rock',
      'pop',
      'indie',
      'alternative',
      'hip-hop',
      'r&b',
      'electronic',
      'dance',
      'country',
      'jazz',
      'classical',
      'metal',
      'punk',
      'folk',
      'soul',
      'reggae',
      'latin',
      'blues',
      'funk',
      'disco',
    ];

    const count = 2 + Math.floor(Math.random() * 4); // 2-5 genres
    return this.shuffleArray(allGenres).slice(0, count);
  }

  private getTimezoneForState(state: string): string {
    const timezones: Record<string, string> = {
      NY: 'America/New_York',
      CA: 'America/Los_Angeles',
      IL: 'America/Chicago',
      TX: 'America/Chicago',
      CO: 'America/Denver',
      WA: 'America/Los_Angeles',
      MA: 'America/New_York',
      GA: 'America/New_York',
      TN: 'America/Chicago',
      MD: 'America/New_York',
      WI: 'America/Chicago',
    };
    return timezones[state] || 'America/New_York';
  }

  private getApproxLatitude(city: string): number {
    const latitudes: Record<string, number> = {
      'New York': 40.7128,
      'Los Angeles': 34.0522,
      Chicago: 41.8781,
      Boston: 42.3601,
      'San Francisco': 37.7749,
      Seattle: 47.6062,
      Denver: 39.7392,
      Atlanta: 33.749,
      Miami: 25.7617,
      Austin: 30.2672,
    };
    return latitudes[city] || 40.0;
  }

  private getApproxLongitude(city: string): number {
    const longitudes: Record<string, number> = {
      'New York': -74.006,
      'Los Angeles': -118.2437,
      Chicago: -87.6298,
      Boston: -71.0589,
      'San Francisco': -122.4194,
      Seattle: -122.3321,
      Denver: -104.9903,
      Atlanta: -84.388,
      Miami: -80.1918,
      Austin: -97.7431,
    };
    return longitudes[city] || -100.0;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Main execution
async function main() {
  const seeder = new MockDataSeeder();

  try {
    await seeder.seed();
  } catch (_error) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MockDataSeeder };

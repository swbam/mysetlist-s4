// Quick script to insert sample data via Supabase client
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertSampleData() {
  console.log('🚀 Inserting sample data...');

  try {
    // Insert sample artists with proper field names
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .insert([
        {
          name: 'Taylor Swift',
          slug: 'taylor-swift',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb859e4c14fa59296c8649e0e4',
          popularity: 95,
          followers: 89000000,
          follower_count: 89000000,
          monthly_listeners: 85000000,
          trending_score: 950,
          spotify_id: '06HL4z0CvFAxyc27GXpf02',
          genres: '["pop", "country"]'
        },
        {
          name: 'The Weeknd',
          slug: 'the-weeknd',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb0e08ea2c4d6789fbf5cccbbc',
          popularity: 92,
          followers: 45000000,
          follower_count: 45000000,
          monthly_listeners: 78000000,
          trending_score: 920,
          spotify_id: '1Xyo4u8uXC1ZmMpatF05PJ',
          genres: '["r&b", "pop"]'
        },
        {
          name: 'Bad Bunny',
          slug: 'bad-bunny',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb0c68f6c95232e716e8a4c2a3',
          popularity: 98,
          followers: 52000000,
          follower_count: 52000000,
          monthly_listeners: 95000000,
          trending_score: 980,
          spotify_id: '4q3ewBCX7sLwd24euuV69X',
          genres: '["reggaeton", "latin"]'
        },
        {
          name: 'Billie Eilish',
          slug: 'billie-eilish',
          image_url: 'https://i.scdn.co/image/ab6761610000e5ebc2b7c1b8ad2b04a6b2e1e6b7',
          popularity: 90,
          followers: 38000000,
          follower_count: 38000000,
          monthly_listeners: 65000000,
          trending_score: 900,
          spotify_id: '6qqNVTkY8uBg9cP3Jd8DAH',
          genres: '["pop", "alternative"]'
        },
        {
          name: 'Drake',
          slug: 'drake',
          image_url: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9',
          popularity: 94,
          followers: 67000000,
          follower_count: 67000000,
          monthly_listeners: 88000000,
          trending_score: 940,
          spotify_id: '3TVXtAsR1Inumwj472S9r4',
          genres: '["hip-hop", "rap"]'
        }
      ])
      .select();

    if (artistsError) {
      console.error('❌ Error inserting artists:', artistsError);
    } else {
      console.log('✅ Artists inserted successfully');
    }

    // Insert sample venues
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .insert([
        {
          name: 'Madison Square Garden',
          slug: 'madison-square-garden',
          capacity: 20789,
          city: 'New York',
          state: 'NY',
          country: 'USA',
          timezone: 'America/New_York'
        },
        {
          name: 'The Forum',
          slug: 'the-forum',
          capacity: 17505,
          city: 'Inglewood',
          state: 'CA',
          country: 'USA',
          timezone: 'America/Los_Angeles'
        },
        {
          name: 'Red Rocks Amphitheatre',
          slug: 'red-rocks-amphitheatre',
          capacity: 9525,
          city: 'Morrison',
          state: 'CO',
          country: 'USA',
          timezone: 'America/Denver'
        }
      ])
      .select();

    if (venuesError) {
      console.error('❌ Error inserting venues:', venuesError);
    } else {
      console.log('✅ Venues inserted successfully');
    }

    // Insert sample shows using real IDs
    if (artists && artists.length > 0 && venues && venues.length > 0) {
      const { data: shows, error: showsError } = await supabase
        .from('shows')
        .insert([
          {
            name: 'Taylor Swift - The Eras Tour',
            slug: 'taylor-swift-eras-tour-msg-2024',
            date: '2024-08-15',
            venue_id: venues[0].id,
            headliner_artist_id: artists[0].id,
            vote_count: 2500,
            attendee_count: 20789,
            view_count: 15000,
            setlist_count: 3,
            trending_score: 950
          },
          {
            name: 'Bad Bunny World Tour',
            slug: 'bad-bunny-world-tour-forum-2024',
            date: '2024-09-20',
            venue_id: venues[1].id,
            headliner_artist_id: artists[2].id,
            vote_count: 1800,
            attendee_count: 17505,
            view_count: 12000,
            setlist_count: 2,
            trending_score: 920
          },
          {
            name: 'The Weeknd - After Hours Tour',
            slug: 'weeknd-after-hours-red-rocks-2024',
            date: '2024-07-10',
            venue_id: venues[2].id,
            headliner_artist_id: artists[1].id,
            vote_count: 1200,
            attendee_count: 9525,
            view_count: 8000,
            setlist_count: 1,
            trending_score: 880
          }
        ])
        .select();

      if (showsError) {
        console.error('❌ Error inserting shows:', showsError);
      } else {
        console.log('✅ Shows inserted successfully');
      }
    } else {
      console.log('⚠️ Skipping shows - missing artists or venues data');
    }

    console.log('🎉 Sample data insertion complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

insertSampleData();
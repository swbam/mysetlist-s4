const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yzwkimtdaabyjbpykquu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTQ0NDY3MCwiZXhwIjoyMDQ1MDIwNjcwfQ.6lCBSPxerFdHqOIkTyKOoCtrrmgortHdMj85WeJVGHk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleShows() {
  console.log('Getting artists and venues...');
  
  // Get existing artists and venues
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name, slug')
    .limit(4);
    
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, city, state')
    .limit(4);
    
  if (!artists?.length || !venues?.length) {
    console.error('No artists or venues found');
    return;
  }
  
  console.log(`Found ${artists.length} artists and ${venues.length} venues`);
  
  // Sample shows data
  const sampleShows = [
    {
      name: 'Metallica World Tour 2024',
      slug: 'metallica-world-tour-2024',
      headliner_artist_id: artists.find(a => a.name === 'Metallica')?.id,
      venue_id: venues[0]?.id,
      date: '2024-12-15T20:00:00Z',
      status: 'upcoming',
      trending_score: 950.5,
      vote_count: 245,
      attendee_count: 1200,
      view_count: 3500,
      ticket_url: 'https://example.com/metallica-tickets',
      description: 'Heavy metal legends return with their biggest tour yet!'
    },
    {
      name: 'Taylor Swift Eras Tour NYC',
      slug: 'taylor-swift-eras-tour-nyc',
      headliner_artist_id: artists.find(a => a.name === 'Taylor Swift')?.id,
      venue_id: venues[1]?.id,
      date: '2024-11-28T19:30:00Z',
      status: 'upcoming',
      trending_score: 880.2,
      vote_count: 412,
      attendee_count: 2100,
      view_count: 5200,
      ticket_url: 'https://example.com/taylor-swift-tickets',
      description: 'The biggest pop tour of the decade comes to NYC!'
    },
    {
      name: 'The Weeknd After Hours Tour',
      slug: 'the-weeknd-after-hours-tour',
      headliner_artist_id: artists.find(a => a.name === 'The Weeknd')?.id,
      venue_id: venues[2]?.id,
      date: '2024-10-20T21:00:00Z',
      status: 'upcoming',
      trending_score: 720.8,
      vote_count: 189,
      attendee_count: 950,
      view_count: 2100,
      ticket_url: 'https://example.com/weeknd-tickets',
      description: 'Dark R&B vibes in an intimate venue setting'
    },
    {
      name: 'Drake Nothing Was The Same Anniversary',
      slug: 'drake-nothing-was-the-same-anniversary',
      headliner_artist_id: artists.find(a => a.name === 'Drake')?.id,
      venue_id: venues[3]?.id,
      date: '2024-09-30T20:30:00Z',
      status: 'upcoming',
      trending_score: 650.3,
      vote_count: 156,
      attendee_count: 780,
      view_count: 1800,
      ticket_url: 'https://example.com/drake-tickets',
      description: 'Celebrating 10 years of this classic hip-hop album'
    }
  ];
  
  console.log('Adding sample shows...');
  
  for (const show of sampleShows) {
    const { data, error } = await supabase
      .from('shows')
      .insert([show])
      .select();
      
    if (error) {
      console.error(`Error adding show ${show.name}:`, error);
    } else {
      console.log(`✓ Added show: ${show.name}`);
    }
  }
  
  console.log('Sample shows added successfully!');
  
  // Verify the shows were added
  const { data: verifyShows } = await supabase
    .from('shows')
    .select('id, name, trending_score')
    .gt('trending_score', 0);
    
  console.log(`\nVerification: Found ${verifyShows?.length || 0} shows with trending scores`);
}

addSampleShows().catch(console.error);
const { createClient } = require('@supabase/supabase-js');

// Initialize with mock data for trending page demonstration
const mockData = [
  {
    id: 'mock-artist-1',
    name: 'Taylor Swift',
    slug: 'taylor-swift',
    image_url: 'https://i.scdn.co/image/ab6761610000e5eb859e4c14fa59296c8649e0e4',
    popularity: 95,
    followers: 89000000,
    follower_count: 89000000,
    trending_score: 950,
    genres: JSON.stringify(['pop', 'country']),
    upcoming_shows: 15,
    total_shows: 150,
    previous_followers: 85000000,
    previous_popularity: 92
  },
  {
    id: 'mock-artist-2',
    name: 'Bad Bunny',
    slug: 'bad-bunny',
    image_url: 'https://i.scdn.co/image/ab6761610000e5eb0c68f6c95232e716e8a4c2a3',
    popularity: 98,
    followers: 52000000,
    follower_count: 52000000,
    trending_score: 980,
    genres: JSON.stringify(['reggaeton', 'latin']),
    upcoming_shows: 22,
    total_shows: 85,
    previous_followers: 48000000,
    previous_popularity: 94
  },
  {
    id: 'mock-artist-3',
    name: 'Drake',
    slug: 'drake',
    image_url: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9',
    popularity: 94,
    followers: 67000000,
    follower_count: 67000000,
    trending_score: 940,
    genres: JSON.stringify(['hip-hop', 'rap']),
    upcoming_shows: 18,
    total_shows: 120,
    previous_followers: 63000000,
    previous_popularity: 91
  },
  {
    id: 'mock-artist-4',
    name: 'The Weeknd',
    slug: 'the-weeknd',
    image_url: 'https://i.scdn.co/image/ab6761610000e5eb0e08ea2c4d6789fbf5cccbbc',
    popularity: 92,
    followers: 45000000,
    follower_count: 45000000,
    trending_score: 920,
    genres: JSON.stringify(['r&b', 'pop']),
    upcoming_shows: 12,
    total_shows: 95,
    previous_followers: 43000000,
    previous_popularity: 90
  },
  {
    id: 'mock-artist-5',
    name: 'Billie Eilish',
    slug: 'billie-eilish',
    image_url: 'https://i.scdn.co/image/ab6761610000e5ebc2b7c1b8ad2b04a6b2e1e6b7',
    popularity: 90,
    followers: 38000000,
    follower_count: 38000000,
    trending_score: 900,
    genres: JSON.stringify(['pop', 'alternative']),
    upcoming_shows: 10,
    total_shows: 65,
    previous_followers: 35000000,
    previous_popularity: 87
  }
];

console.log('Mock trending data ready for artists:');
mockData.forEach(artist => {
  console.log(`- ${artist.name} (trending score: ${artist.trending_score})`);
});

console.log('\nTo insert this data, ensure your database environment variables are configured.');
console.log('This provides 5 trending artists with realistic growth metrics.');
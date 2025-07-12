const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'MySetlist/1.0 (https://mysetlist.com)';

// Rate limit: 1 request per second for MusicBrainz
let lastMusicBrainzRequest = 0;
const MIN_MUSICBRAINZ_INTERVAL = 1000;

async function rateLimitMusicBrainz() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastMusicBrainzRequest;
  
  if (timeSinceLastRequest < MIN_MUSICBRAINZ_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_MUSICBRAINZ_INTERVAL - timeSinceLastRequest)
    );
  }
  
  lastMusicBrainzRequest = Date.now();
}

export async function resolveMusicBrainzMbid(artistName: string): Promise<string | null> {
  try {
    await rateLimitMusicBrainz();
    
    const url = `${MUSICBRAINZ_BASE_URL}/artist?query=${encodeURIComponent(artistName)}&limit=1&fmt=json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`MusicBrainz API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.artists && data.artists.length > 0) {
      const artist = data.artists[0];
      
      // Check if the match is good enough (simple similarity check)
      const normalizedSearchName = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedResultName = artist.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (normalizedSearchName === normalizedResultName || 
          artist.score >= 90) { // MusicBrainz provides a score
        return artist.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to resolve MusicBrainz MBID:', error);
    return null;
  }
}
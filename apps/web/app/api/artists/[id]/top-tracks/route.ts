import { NextRequest, NextResponse } from 'next/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    // Mock top tracks data for now
    // In real implementation, this would fetch from Spotify API or database
    const mockTracks = [
      {
        id: `track_${id}_1`,
        name: "Popular Song #1",
        duration_ms: 180000,
        popularity: 85,
        preview_url: null,
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${id}_1`
        }
      },
      {
        id: `track_${id}_2`,
        name: "Popular Song #2", 
        duration_ms: 210000,
        popularity: 78,
        preview_url: null,
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${id}_2`
        }
      },
      {
        id: `track_${id}_3`,
        name: "Popular Song #3",
        duration_ms: 195000,
        popularity: 72,
        preview_url: null,
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${id}_3`
        }
      },
      {
        id: `track_${id}_4`,
        name: "Popular Song #4",
        duration_ms: 165000,
        popularity: 68,
        preview_url: null,
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${id}_4`
        }
      },
      {
        id: `track_${id}_5`,
        name: "Popular Song #5",
        duration_ms: 220000,
        popularity: 65,
        preview_url: null,
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${id}_5`
        }
      }
    ];
    
    return NextResponse.json({ 
      tracks: mockTracks,
      total: mockTracks.length 
    });
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top tracks' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getArtistBySlug } from '@repo/database/src/queries/artists';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Artist slug is required' },
        { status: 400 }
      );
    }

    // Use Drizzle ORM query function
    const result = await getArtistBySlug(slug);

    if (!result) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    const { artist, showCount, upcomingShowCount, followerCount } = result;

    // Transform the artist data for API response  
    const artistResponse = {
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      imageUrl: artist.imageUrl,
      smallImageUrl: artist.smallImageUrl,
      genres: artist.genres ? JSON.parse(artist.genres) : [],
      popularity: artist.popularity || 0,
      followers: artist.followers || 0,
      verified: artist.verified || false,
      bio: artist.bio,
      externalUrls: artist.externalUrls ? JSON.parse(artist.externalUrls) : {},
      spotifyId: artist.spotifyId,
      createdAt: artist.createdAt,
      updatedAt: artist.updatedAt,
      // Additional data from the query
      showCount: showCount || 0,
      upcomingShowCount: upcomingShowCount || 0,
      followerCount: followerCount || 0,
    };

    return NextResponse.json({ artist: artistResponse });
  } catch (error) {
    console.error('Error fetching artist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artist' },
      { status: 500 }
    );
  }
}

// Optional: Handle other HTTP methods if needed
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
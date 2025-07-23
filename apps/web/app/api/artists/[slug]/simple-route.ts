import { NextRequest, NextResponse } from 'next/server';

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

    // Import postgres directly without drizzle schema
    const postgres = (await import('postgres')).default;
    const client = postgres(process.env.DATABASE_URL!, { max: 1 });
    
    // Direct SQL query to get artist by slug
    const [artist] = await client`
      SELECT 
        id,
        name,
        slug,
        image_url as "imageUrl",
        small_image_url as "smallImageUrl",
        genres,
        popularity,
        followers,
        verified,
        bio,
        external_urls as "externalUrls",
        spotify_id as "spotifyId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM artists 
      WHERE slug = ${slug}
    `;

    await client.end();

    if (!artist) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const artistResponse = {
      ...artist,
      genres: artist.genres ? JSON.parse(artist.genres) : [],
      externalUrls: artist.externalUrls ? JSON.parse(artist.externalUrls) : {},
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
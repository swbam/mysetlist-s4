import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { shows, venues, artists } from '@repo/database';
import { eq } from 'drizzle-orm';
import { triggerNewShowNotifications } from '@/lib/email-triggers';

// Protect webhook endpoint
function isValidWebhookRequest(request: NextRequest): boolean {
  const webhookSecret = process.env.TICKETMASTER_WEBHOOK_SECRET;
  const signature = request.headers.get('x-ticketmaster-signature');
  
  if (!webhookSecret || !signature) {
    return false;
  }
  
  // In production, verify the signature against the payload
  // For now, just check if it matches the secret
  return signature === webhookSecret;
}

export async function POST(request: NextRequest) {
  // Verify webhook authenticity
  if (!isValidWebhookRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const { event, data } = payload;

    switch (event) {
      case 'show.created':
        await handleShowCreated(data);
        break;
      
      case 'show.updated':
        await handleShowUpdated(data);
        break;
      
      case 'show.cancelled':
        await handleShowCancelled(data);
        break;
      
      case 'artist.updated':
        await handleArtistUpdated(data);
        break;
      
      case 'venue.updated':
        await handleVenueUpdated(data);
        break;
      
      default:
        console.log(`Unknown webhook event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleShowCreated(data: any) {
  try {
    // Extract show data from webhook payload
    const { ticketmasterId, name, date, startTime, artistId, venueData, ticketUrl } = data;

    // Find or create venue
    let venue = null;
    if (venueData) {
      venue = await db
        .select()
        .from(venues)
        .where(eq(venues.name, venueData.name))
        .limit(1);

      if (venue.length === 0) {
        const [newVenue] = await db
          .insert(venues)
          .values({
            name: venueData.name,
            slug: createSlug(venueData.name),
            address: venueData.address,
            city: venueData.city,
            state: venueData.state,
            country: venueData.country,
            latitude: venueData.latitude,
            longitude: venueData.longitude,
            timezone: venueData.timezone || 'UTC',
          })
          .returning();
        venue = [newVenue];
      }
    }

    // Create show
    const [show] = await db
      .insert(shows)
      .values({
        ticketmasterId,
        name,
        slug: createSlug(name),
        date,
        startTime,
        headlinerArtistId: artistId,
        venueId: venue?.[0]?.id,
        ticketUrl,
        status: 'upcoming',
      })
      .returning();

    // Trigger new show notifications
    if (show) {
      await triggerNewShowNotifications(show.id);
    }

    console.log(`Created new show: ${show.id} - ${name}`);
  } catch (error) {
    console.error('Error handling show.created webhook:', error);
    throw error;
  }
}

async function handleShowUpdated(data: any) {
  try {
    const { ticketmasterId, updates } = data;

    await db
      .update(shows)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(shows.ticketmasterId, ticketmasterId));

    console.log(`Updated show: ${ticketmasterId}`);
  } catch (error) {
    console.error('Error handling show.updated webhook:', error);
    throw error;
  }
}

async function handleShowCancelled(data: any) {
  try {
    const { ticketmasterId } = data;

    await db
      .update(shows)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(shows.ticketmasterId, ticketmasterId));

    // TODO: Send cancellation notifications to users

    console.log(`Cancelled show: ${ticketmasterId}`);
  } catch (error) {
    console.error('Error handling show.cancelled webhook:', error);
    throw error;
  }
}

async function handleArtistUpdated(data: any) {
  try {
    const { spotifyId, updates } = data;

    if (spotifyId) {
      await db
        .update(artists)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(artists.spotifyId, spotifyId));

      console.log(`Updated artist: ${spotifyId}`);
    }
  } catch (error) {
    console.error('Error handling artist.updated webhook:', error);
    throw error;
  }
}

async function handleVenueUpdated(data: any) {
  try {
    const { venueId, updates } = data;

    await db
      .update(venues)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId));

    console.log(`Updated venue: ${venueId}`);
  } catch (error) {
    console.error('Error handling venue.updated webhook:', error);
    throw error;
  }
}

function createSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
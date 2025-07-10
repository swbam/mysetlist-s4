import { db } from '@repo/database';
import {
  artists,
  emailQueue,
  setlistSongs,
  setlists,
  shows,
  users,
  venues,
  votes,
} from '@repo/database';
import { and, eq, isNotNull } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { triggerNewShowNotifications } from '~/lib/email-triggers';

// Protect webhook endpoint
function isValidWebhookRequest(request: NextRequest): boolean {
  const webhookSecret = process.env['TICKETMASTER_WEBHOOK_SECRET'];
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
    }

    return NextResponse.json({ received: true });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleShowCreated(data: any) {
  // Extract show data from webhook payload
  const {
    ticketmasterId,
    name,
    date,
    startTime,
    artistId,
    venueData,
    ticketUrl,
  } = data;

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
      venueId: venue?.[0]?.id || null,
      ticketUrl,
      status: 'upcoming',
    })
    .returning();

  // Trigger new show notifications
  if (show) {
    await triggerNewShowNotifications(show.id);
  }
}

async function handleShowUpdated(data: any) {
  const { ticketmasterId, updates } = data;

  await db
    .update(shows)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(shows.ticketmasterId, ticketmasterId));
}

async function handleShowCancelled(data: any) {
  const { ticketmasterId } = data;

  await db
    .update(shows)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(eq(shows.ticketmasterId, ticketmasterId));

  // Queue cancellation notification emails
  const affectedShow = await db
    .select({
      id: shows.id,
      name: shows.name,
      date: shows.date,
    })
    .from(shows)
    .where(eq(shows.ticketmasterId, ticketmasterId))
    .limit(1);

  const show = affectedShow[0];
  if (show) {

    // Get users who have interacted with this show
    const affectedUsers = await db
      .selectDistinct({
        userId: votes.userId,
        email: users.email,
        displayName: users.displayName,
      })
      .from(votes)
      .innerJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
      .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
      .innerJoin(users, eq(votes.userId, users.id))
      .where(and(eq(setlists.showId, show.id), isNotNull(users.email)));

    // Queue notification emails
    for (const user of affectedUsers) {
      await db.insert(emailQueue).values({
        userId: user.userId,
        emailType: 'show_reminder', // Using closest available type
        emailData: JSON.stringify({
          to: user.email!,
          subject: `Show Cancelled: ${show.name}`,
          template: 'show-cancelled',
          data: {
            userName: user.displayName || 'there',
            showName: show.name,
            showDate: show.date,
          },
        }),
        scheduledFor: new Date(),
      });
    }
  } else {
  }
}

async function handleArtistUpdated(data: any) {
  const { spotifyId, updates } = data;

  if (spotifyId) {
    await db
      .update(artists)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(artists.spotifyId, spotifyId));
  }
}

async function handleVenueUpdated(data: any) {
  const { venueId, updates } = data;

  await db
    .update(venues)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(venues.id, venueId));
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

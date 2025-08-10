import { db } from "@repo/database";
import { venues } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function upsertVenue(tmVenue: any) {
  if (!tmVenue || !tmVenue.name) {
    throw new Error("Invalid venue data - missing name");
  }

  const venueName = tmVenue.name;
  const venueCity = tmVenue.city?.name || "";

  // Check if venue already exists by name and city
  const existingVenue = await db
    .select()
    .from(venues)
    .where(and(eq(venues.name, venueName), eq(venues.city, venueCity)))
    .limit(1);

  if (existingVenue.length > 0 && existingVenue[0]) {
    const venueId = existingVenue[0].id;
    // Update existing venue with new data
    await db
      .update(venues)
      .set({
        address: formatAddress(tmVenue),
        state: tmVenue.state?.stateCode || tmVenue.state?.name || null,
        country: tmVenue.country?.countryCode || tmVenue.country?.name || null,
        postalCode: tmVenue.postalCode || null,
        ...(tmVenue.location?.latitude && {
          latitude: Number.parseFloat(tmVenue.location.latitude),
        }),
        ...(tmVenue.location?.longitude && {
          longitude: Number.parseFloat(tmVenue.location.longitude),
        }),
        ...(tmVenue.timezone && { timezone: tmVenue.timezone }),
        ...(tmVenue.url && { website: tmVenue.url }),
        ...(extractPhoneNumber(tmVenue) && {
          phoneNumber: extractPhoneNumber(tmVenue),
        }),
        ...(extractCapacity(tmVenue) && { capacity: extractCapacity(tmVenue) }),
        ...(tmVenue.images?.[0]?.url && { imageUrl: tmVenue.images[0].url }),
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId));

    return existingVenue[0];
  }

  // Create new venue
  const slug = generateSlug(venueName);
  const newVenue = {
    id: nanoid(),
    name: venueName,
    slug,
    city: venueCity,
    country: tmVenue.country?.countryCode || tmVenue.country?.name || "US",
    timezone: tmVenue.timezone || "UTC",
    address: formatAddress(tmVenue),
    state: tmVenue.state?.stateCode || tmVenue.state?.name || null,
    postalCode: tmVenue.postalCode || null,
    ...(tmVenue.location?.latitude && {
      latitude: Number.parseFloat(tmVenue.location.latitude),
    }),
    ...(tmVenue.location?.longitude && {
      longitude: Number.parseFloat(tmVenue.location.longitude),
    }),
    ...(tmVenue.url && { website: tmVenue.url }),
    ...(extractPhoneNumber(tmVenue) && {
      phoneNumber: extractPhoneNumber(tmVenue),
    }),
    ...(extractCapacity(tmVenue) && { capacity: extractCapacity(tmVenue) }),
    ...(tmVenue.images?.[0]?.url && { imageUrl: tmVenue.images[0].url }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(venues).values(newVenue);

  return newVenue;
}

function formatAddress(venue: any): string | null {
  if (!venue.address) return null;

  const parts: any[] = [];
  if (venue.address.line1) parts.push(venue.address.line1);
  if (venue.address.line2) parts.push(venue.address.line2);

  return parts.length > 0 ? parts.join(", ") : null;
}

function extractPhoneNumber(venue: any): string | null {
  if (venue.boxOfficeInfo?.phoneNumberDetail) {
    return venue.boxOfficeInfo.phoneNumberDetail;
  }
  return null;
}

function extractCapacity(_venue: any): number | null {
  // Ticketmaster doesn't always provide capacity
  // This would need to be enriched from other sources
  return null;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

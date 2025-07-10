#!/usr/bin/env tsx

import { isNotNull } from 'drizzle-orm';
import { db } from '../packages/database';
import { artists } from '../packages/database';

async function checkTicketmasterIds() {
  const artistsWithTm = await db
    .select({
      id: artists.id,
      name: artists.name,
      ticketmasterId: artists.ticketmasterId,
    })
    .from(artists)
    .where(isNotNull(artists.ticketmasterId))
    .limit(10);
  artistsWithTm.forEach((_a) => {});
}

checkTicketmasterIds().catch(console.error);

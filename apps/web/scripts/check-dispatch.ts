#!/usr/bin/env tsx

import { artists } from '@repo/database/src/schema';
import { eq } from 'drizzle-orm';
import { db } from './db-client';

async function check() {
  const dispatch = await db
    .select()
    .from(artists)
    .where(eq(artists.slug, 'dispatch'));
  console.log('Dispatch in DB:', dispatch.length > 0 ? 'Yes' : 'No');
  if (dispatch.length > 0) {
    console.log('Artist ID:', dispatch[0].id);
    console.log('Name:', dispatch[0].name);
    console.log('Spotify ID:', dispatch[0].spotifyId);
  }
}

check();

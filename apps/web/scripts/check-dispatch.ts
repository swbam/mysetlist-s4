#!/usr/bin/env tsx

import { artists } from "@repo/database/src/schema"
import { eq } from "drizzle-orm"
import { db } from "./db-client"

async function check() {
  const dispatch = await db
    .select()
    .from(artists)
    .where(eq(artists.slug, "dispatch"))
  if (dispatch.length > 0) {
  }
}

check()

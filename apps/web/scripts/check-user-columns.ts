#!/usr/bin/env tsx

import { sql } from "drizzle-orm";
import { db } from "./db-client";

async function check() {
  try {
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
    `);
    if (result && Array.isArray(result)) {
    }
  } catch (_error) {}
}

check();

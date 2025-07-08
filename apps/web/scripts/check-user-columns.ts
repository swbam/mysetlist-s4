#!/usr/bin/env tsx

import { sql } from 'drizzle-orm';
import { db } from './db-client';

async function check() {
  try {
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
    `);
    console.log('Result:', result);
    if (result && Array.isArray(result)) {
      console.log(
        'User columns:',
        result.map((r: any) => r.column_name)
      );
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

check();

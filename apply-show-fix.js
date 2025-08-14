import { db } from "./packages/database/src/index.js";

async function applyShowFix() {
  try {
    console.log("Applying database fix for nullable headliner_artist_id...");
    
    await db.execute(`
      ALTER TABLE shows 
      ALTER COLUMN headliner_artist_id DROP NOT NULL;
    `);
    
    console.log("Successfully made headliner_artist_id nullable");
  } catch (error) {
    console.error("Error applying fix:", error);
  }
}

applyShowFix();
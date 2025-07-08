#!/usr/bin/env node

async function runTrendingUpdate() {
  const supabaseUrl = 'https://yzwkimtdaabyjbpykquu.supabase.co';
  const supabaseKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY5MjMxNiwiZXhwIjoyMDY2MjY4MzE2fQ.ZMorLC_eZke3bvBAF0zyzqUONxpomfTN2RpE_mLjz18';

  console.log('🚀 Running trending update...');

  try {
    // Call update-trending function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/update-trending`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error:', data);
      process.exit(1);
    }

    console.log('✅ Success:', data);

    // Also run scheduled-sync to sync some artists
    console.log('🔄 Running scheduled sync...');
    const syncResponse = await fetch(
      `${supabaseUrl}/functions/v1/scheduled-sync`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'artists', limit: 5 }),
      }
    );

    const syncData = await syncResponse.json();

    if (syncResponse.ok) {
      console.log('✅ Sync success:', syncData);
    } else {
      console.error('❌ Sync error:', syncData);
    }
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  }
}

runTrendingUpdate();

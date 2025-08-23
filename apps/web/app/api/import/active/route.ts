// MySetlist-S4 Active Imports Endpoint
// File: apps/web/app/api/import/active/route.ts
// Get all active import jobs with their status

import { NextRequest, NextResponse } from 'next/server';
import { getActiveImports, getImportStatistics } from '~/lib/import-status';
import { createServiceClient } from '~/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    // Verify authentication
    const supabase = createServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeStats = searchParams.get('includeStats') === 'true';

    // Get active imports
    const activeImports = await getActiveImports();

    // Build response
    const response: any = {
      imports: activeImports,
      timestamp: new Date().toISOString(),
    };

    // Optionally include statistics
    if (includeStats) {
      const stats = await getImportStatistics(7); // Last 7 days
      response.statistics = stats;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get active imports:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve active imports',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

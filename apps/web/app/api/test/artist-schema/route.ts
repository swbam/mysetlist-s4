import { createServiceClient } from '~/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createServiceClient();
    
    // Get table schema information
    let columns: any = null;
    let schemaError: any = null;
    try {
      const result = await supabase
        .rpc('get_table_columns', { table_name: 'artists' });
      columns = result.data;
      schemaError = result.error;
    } catch (error) {
      schemaError = error;
    }
    
    // Try a simple query
    const { data: artist, error: queryError } = await supabase
      .from('artists')
      .select('*')
      .limit(1)
      .single();
    
    // Get column names from result if schema query failed
    const columnNames = artist ? Object.keys(artist) : [];
    
    return NextResponse.json({
      success: true,
      columns: columns || columnNames,
      hasData: !!artist,
      hasMbidColumn: columnNames.includes('mbid'),
      sampleArtist: artist,
      errors: {
        schema: schemaError?.message,
        query: queryError?.message
      }
    });
  } catch (error) {
    console.error('Artist schema test error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Artist schema test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
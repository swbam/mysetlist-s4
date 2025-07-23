import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || typeof body.value !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: name, value' },
        { status: 400 }
      );
    }

    // Log to console in development
    if (process.env['NODE_ENV'] === 'development') {
      console.log('Web Vital:', {
        name: body.name,
        value: body.value,
        rating: body.rating || 'good',
        navigationType: body.navigationType,
        timestamp: body.timestamp || new Date().toISOString()
      });
    }

    // In production, you could send this to a service like:
    // - Google Analytics 4
    // - PostHog
    // - Mixpanel
    // - Custom analytics endpoint
    // For now, just acknowledge receipt

    return NextResponse.json({ 
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing web vital:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
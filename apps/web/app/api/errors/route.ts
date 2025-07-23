import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the error (in production you might send to a service like Sentry)
    console.error('Client-side error:', {
      error: body.error,
      errorInfo: body.errorInfo,
      url: body.url,
      timestamp: body.timestamp,
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log client error:', error);
    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    );
  }
}
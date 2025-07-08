import { getCSRFToken } from '@/lib/csrf';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = await getCSRFToken();

    return NextResponse.json({
      token,
      message: 'CSRF token generated successfully',
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

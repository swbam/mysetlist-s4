import { sendWeeklyDigests } from '@/actions/email-notifications';
import { type NextRequest, NextResponse } from 'next/server';

// Protect the cron endpoint
function isValidCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env['CRON_SECRET'];

  if (!cronSecret) {
    console.warn('CRON_SECRET not set');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// Send weekly digests every Monday at 8 AM
export async function GET(request: NextRequest) {
  // Check authorization for cron jobs
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting weekly digest cron job...');

    const result = await sendWeeklyDigests();

    console.log(`Weekly digests sent to ${result.usersNotified} users`);

    return NextResponse.json({
      success: true,
      usersNotified: result.usersNotified,
    });
  } catch (error) {
    console.error('Weekly digest cron job failed:', error);
    return NextResponse.json(
      { error: 'Weekly digest failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

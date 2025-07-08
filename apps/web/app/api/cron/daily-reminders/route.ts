import { sendDailyShowReminders } from '@/actions/email-notifications';
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

// Send daily show reminders at 9 AM
export async function GET(request: NextRequest) {
  // Check authorization for cron jobs
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting daily show reminders cron job...');

    const result = await sendDailyShowReminders();

    console.log(
      `Daily reminders sent: ${result.usersNotified} users, ${result.showsNotified} shows`
    );

    return NextResponse.json({
      success: true,
      usersNotified: result.usersNotified,
      showsNotified: result.showsNotified,
    });
  } catch (error) {
    console.error('Daily reminders cron job failed:', error);
    return NextResponse.json(
      { error: 'Daily reminders failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

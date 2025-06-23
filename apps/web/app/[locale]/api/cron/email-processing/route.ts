import { NextRequest, NextResponse } from 'next/server';
import { 
  processQueuedEmails, 
  sendDailyShowReminders, 
  sendWeeklyDigests 
} from '../../../actions/email-notifications';
import { db } from '@repo/database';
import { emailQueue, emailLogs } from '@repo/database/src/schema';
import { lte, eq } from 'drizzle-orm';

// Protect the cron endpoint
function isValidCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn('CRON_SECRET not set');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

// Process queued emails every 5 minutes
export async function GET(request: NextRequest) {
  // Check authorization for cron jobs
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    console.log('Starting email processing cron job...');
    
    // Process queued emails
    const queueResult = await processQueuedEmails();
    console.log(`Processed ${queueResult.processed} queued emails, ${queueResult.successful} successful, ${queueResult.failed} failed`);
    
    return NextResponse.json({
      success: true,
      processed: queueResult.processed,
      successful: queueResult.successful,
      failed: queueResult.failed,
    });
  } catch (error) {
    console.error('Email processing cron job failed:', error);
    return NextResponse.json(
      { error: 'Email processing failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Alternative POST endpoint for manual triggering
export async function POST(request: NextRequest) {
  // Check authorization
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { action } = await request.json();
  
  try {
    switch (action) {
      case 'process_queue':
        const queueResult = await processQueuedEmails();
        return NextResponse.json(queueResult);
        
      case 'daily_reminders':
        const reminderResult = await sendDailyShowReminders();
        return NextResponse.json(reminderResult);
        
      case 'weekly_digest':
        const digestResult = await sendWeeklyDigests();
        return NextResponse.json(digestResult);
        
      case 'cleanup':
        // Clean up old email logs (older than 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        const deletedLogs = await db
          .delete(emailLogs)
          .where(lte(emailLogs.createdAt, ninetyDaysAgo));
          
        // Clean up old sent/failed queue items (older than 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const deletedQueue = await db
          .delete(emailQueue)
          .where(
            lte(emailQueue.createdAt, sevenDaysAgo)
          );
        
        return NextResponse.json({
          success: true,
          deletedLogs: 0, // Drizzle doesn't return rowCount
          deletedQueue: 0,
        });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error(`Email action '${action}' failed:`, error);
    return NextResponse.json(
      { error: `Action '${action}' failed`, details: (error as Error).message },
      { status: 500 }
    );
  }
}
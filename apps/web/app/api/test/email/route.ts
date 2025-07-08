import { 
  sendWelcomeEmailAction,
  sendEmailNotification,
  queueEmail,
  processQueuedEmails
} from '@/actions/email-notifications';
import { sendWelcomeEmail, sendShowReminderEmail } from '@repo/email';
import { type NextRequest, NextResponse } from 'next/server';

// Test endpoint for email functionality - protected by admin check
export async function POST(request: NextRequest) {
  try {
    // Basic auth check - in production, use proper auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env['EMAIL_SYSTEM_TOKEN']}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await request.json();

    switch (action) {
      case 'test-welcome':
        // Test welcome email
        const welcomeResult = await sendWelcomeEmail({
          to: [{ email: data.email || 'test@example.com', name: data.name || 'Test User' }],
          name: data.name || 'Test User',
          appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app',
        });
        
        return NextResponse.json({
          success: welcomeResult.success,
          message: 'Welcome email test sent',
          result: welcomeResult,
        });

      case 'test-reminder':
        // Test show reminder email
        const reminderResult = await sendShowReminderEmail({
          to: [{ email: data.email || 'test@example.com', name: data.name || 'Test User' }],
          userName: data.name || 'Test User',
          show: {
            id: 'test-show-id',
            name: 'Test Show',
            artistName: 'Test Artist',
            venue: 'Test Venue',
            date: new Date().toLocaleDateString(),
            time: '8:00 PM',
          },
          daysUntilShow: 1,
          appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app',
        });
        
        return NextResponse.json({
          success: reminderResult.success,
          message: 'Show reminder email test sent',
          result: reminderResult,
        });

      case 'test-notification':
        // Test generic notification
        const notificationResult = await sendEmailNotification({
          to: data.email || 'test@example.com',
          subject: data.subject || 'Test Email Notification',
          content: data.content || '<h1>Test Email</h1><p>This is a test email from MySetlist.</p>',
        });
        
        return NextResponse.json({
          success: notificationResult.success,
          message: 'Test notification sent',
          result: notificationResult,
        });

      case 'test-queue':
        // Test email queue
        const queueResult = await queueEmail({
          userId: data.userId || 'test-user-id',
          emailType: 'welcome',
          emailData: { test: true },
          scheduledFor: new Date(),
        });
        
        return NextResponse.json({
          success: queueResult.success,
          message: 'Email queued for sending',
          result: queueResult,
        });

      case 'process-queue':
        // Process email queue
        const processResult = await processQueuedEmails();
        
        return NextResponse.json({
          success: processResult.success,
          message: 'Email queue processed',
          result: processResult,
        });

      case 'test-all':
        // Test all email types
        const results = {
          welcome: false,
          reminder: false,
          notification: false,
        };

        try {
          const welcomeTest = await sendWelcomeEmail({
            to: [{ email: data.email || 'test@example.com', name: 'Test User' }],
            name: 'Test User',
          });
          results.welcome = welcomeTest.success;
        } catch (error) {
          console.error('Welcome email test failed:', error);
        }

        try {
          const reminderTest = await sendShowReminderEmail({
            to: [{ email: data.email || 'test@example.com', name: 'Test User' }],
            userName: 'Test User',
            show: {
              id: 'test-show',
              name: 'Test Concert',
              artistName: 'Test Artist',
              venue: 'Test Venue',
              date: new Date().toLocaleDateString(),
            },
            daysUntilShow: 1,
          });
          results.reminder = reminderTest.success;
        } catch (error) {
          console.error('Reminder email test failed:', error);
        }

        try {
          const notificationTest = await sendEmailNotification({
            to: data.email || 'test@example.com',
            subject: 'MySetlist Test Email',
            content: '<h1>All Systems Operational</h1><p>Email system is working correctly.</p>',
          });
          results.notification = notificationTest.success;
        } catch (error) {
          console.error('Notification email test failed:', error);
        }

        return NextResponse.json({
          success: Object.values(results).every(r => r),
          message: 'All email tests completed',
          results,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Valid actions: test-welcome, test-reminder, test-notification, test-queue, process-queue, test-all' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json(
      {
        error: 'Email test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if email system is configured
export async function GET() {
  const isConfigured = {
    resendToken: !!process.env['RESEND_TOKEN'],
    resendFrom: !!process.env['RESEND_FROM'],
    emailFrom: !!process.env['EMAIL_FROM'],
    appUrl: !!process.env['NEXT_PUBLIC_APP_URL'],
  };

  const allConfigured = Object.values(isConfigured).every(v => v);

  return NextResponse.json({
    configured: allConfigured,
    status: isConfigured,
    message: allConfigured 
      ? 'Email system is properly configured' 
      : 'Email system is missing configuration',
  });
}
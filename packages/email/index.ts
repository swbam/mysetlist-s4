import { Resend } from 'resend';
import { keys } from './keys';

export const resend = new Resend(
  keys().RESEND_TOKEN || 'dummy-token-for-build'
);

// Export keys for external use
export { keys };

// Export all email services
export * from './services';

// Export all email templates
export { ContactTemplate } from './templates/contact';
export { WelcomeTemplate } from './templates/welcome';
export { ShowReminderTemplate } from './templates/show-reminder';
export { NewShowNotificationTemplate } from './templates/new-show-notification';
export { SetlistUpdateTemplate } from './templates/setlist-update';
export { WeeklyDigestTemplate } from './templates/weekly-digest';
export { PasswordResetTemplate } from './templates/password-reset';
export { EmailVerificationTemplate } from './templates/email-verification';

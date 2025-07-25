'use server';

import { keys, getResendClient } from '@repo/email';
import { ContactTemplate } from '@repo/email/templates/contact';
import { parseError } from '@repo/observability/error';

export const contact = async (
  name: string,
  email: string,
  message: string
): Promise<{
  error?: string;
}> => {
  try {
    // Rate limiting removed - Redis not configured

    const emailKeys = keys();
    const fromEmail = emailKeys.RESEND_FROM || 'noreply@example.com';
    const resend = getResendClient();
    await resend.emails.send({
      from: fromEmail,
      to: fromEmail,
      subject: 'Contact form submission',
      replyTo: email,
      react: <ContactTemplate name={name} email={email} message={message} />,
    });

    return {};
  } catch (error) {
    const errorMessage = parseError(error);

    return { error: errorMessage };
  }
};

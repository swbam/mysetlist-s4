import { env } from "@repo/env";
import { Resend } from "resend";

export class EmailService {
  private resend: Resend;

  constructor() {
    // Initialize Resend with API key from environment
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(email: string, displayName?: string): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: "TheSet <welcome@theset.live>",

        to: [email],
        subject: "Welcome to TheSet! 🎵",
        html: this.getWelcomeEmailTemplate(displayName || "Music Fan"),
      });

      if (error) {
        console.error("Error sending welcome email:", error);
        throw new Error(`Failed to send welcome email: ${error.message}`);
      }

      console.log("Welcome email sent successfully:", data?.id);
    } catch (error) {
      console.error("Error in sendWelcomeEmail:", error);
      // Don't throw error to prevent signup failure
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      // Generate a secure reset token (in production, this should be stored in database)
      const resetToken = this.generateSecureToken();
      const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

      const { data, error } = await this.resend.emails.send({
        from: "TheSet <security@theset.live>",

        to: [email],
        subject: "Reset Your TheSet Password",
        html: this.getPasswordResetEmailTemplate(resetUrl),
      });

      if (error) {
        console.error("Error sending password reset email:", error);
        throw new Error(
          `Failed to send password reset email: ${error.message}`,
        );
      }

      console.log("Password reset email sent successfully:", data?.id);
    } catch (error) {
      console.error("Error in sendPasswordResetEmail:", error);
      throw error;
    }
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(
    email: string,
    verificationUrl: string,
  ): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: "TheSet <verify@theset.live>",

        to: [email],
        subject: "Verify Your TheSet Email Address",
        html: this.getEmailVerificationTemplate(verificationUrl),
      });

      if (error) {
        console.error("Error sending email verification:", error);
        throw new Error(`Failed to send email verification: ${error.message}`);
      }

      console.log("Email verification sent successfully:", data?.id);
    } catch (error) {
      console.error("Error in sendEmailVerificationEmail:", error);
      throw error;
    }
  }

  /**
   * Send security notification email
   */
  async sendSecurityNotificationEmail(
    email: string,
    action: string,
    details: string,
  ): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: "TheSet <security@theset.live>",

        to: [email],
        subject: "Security Alert - TheSet Account Activity",
        html: this.getSecurityNotificationTemplate(action, details),
      });

      if (error) {
        console.error("Error sending security notification:", error);
        throw new Error(
          `Failed to send security notification: ${error.message}`,
        );
      }

      console.log("Security notification sent successfully:", data?.id);
    } catch (error) {
      console.error("Error in sendSecurityNotificationEmail:", error);
      // Don't throw error for security notifications
    }
  }

  /**
   * Generate secure token for password reset
   */
  private generateSecureToken(): string {
    if (typeof globalThis.crypto?.getRandomValues === "function") {
      const array = new Uint8Array(32);
      globalThis.crypto.getRandomValues(array);
      return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
    }
    // Fallback to a simple random string (not cryptographically secure)
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Welcome email template
   */
  private getWelcomeEmailTemplate(displayName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to TheSet</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #1DB954; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; background: #1DB954; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎵 TheSet</div>
            </div>
            
            <div class="content">
              <h2>Welcome to TheSet, ${displayName}!</h2>
              
              <p>We're excited to have you join our community of music lovers! TheSet is your go-to platform for discovering, tracking, and voting on live music setlists.</p>
              
              <p>Here's what you can do with your new account:</p>
              <ul>
                <li>🎤 Vote on predicted setlists for upcoming shows</li>
                <li>🎵 Follow your favorite artists and get notified about new shows</li>
                <li>📍 Discover concerts near you</li>
                <li>🎯 See real-time setlist updates during live shows</li>
                <li>🎸 Connect your Spotify account for personalized recommendations</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Explore TheSet</a>
              </div>
              
              <p>If you have any questions, feel free to reach out to our support team. We're here to help!</p>
              
              <p>Rock on! 🤘<br>The TheSet Team</p>
            </div>
            
            <div class="footer">
              <p>You're receiving this email because you signed up for MySetlist.</p>
              <p>TheSet • <a href="${env.NEXT_PUBLIC_APP_URL}">theset.live</a></p>

            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Password reset email template
   */
  private getPasswordResetEmailTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your TheSet Password</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #1DB954; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎵 TheSet</div>
            </div>
            
            <div class="content">
              <h2>Reset Your Password</h2>
              
              <p>We received a request to reset your TheSet password. If you made this request, click the button below to set a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                  <li>This link will expire in 1 hour for security reasons</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Never share this link with anyone</li>
                </ul>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f1f1f1; padding: 10px; border-radius: 4px; font-family: monospace;">${resetUrl}</p>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              
              <p>Stay secure! 🔒<br>The TheSet Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated security email from MySetlist.</p>
              <p>TheSet • <a href="${env.NEXT_PUBLIC_APP_URL}">theset.live</a></p>

            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Email verification template
   */
  private getEmailVerificationTemplate(verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your TheSet Email</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #1DB954; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; background: #1DB954; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎵 TheSet</div>
            </div>
            
            <div class="content">
              <h2>Verify Your Email Address</h2>
              
              <p>Thanks for signing up for TheSet! To complete your account setup, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #f1f1f1; padding: 10px; border-radius: 4px; font-family: monospace;">${verificationUrl}</p>
              
              <p>Once verified, you'll be able to:</p>
              <ul>
                <li>Receive notifications about your favorite artists</li>
                <li>Get show reminders and setlist updates</li>
                <li>Access all TheSet features</li>
              </ul>
              
              <p>Welcome to the community! 🎵<br>The TheSet Team</p>
            </div>
            
            <div class="footer">
              <p>You're receiving this email because you signed up for MySetlist.</p>
              <p>TheSet • <a href="${env.NEXT_PUBLIC_APP_URL}">theset.live</a></p>

            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Security notification template
   */
  private getSecurityNotificationTemplate(
    action: string,
    details: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Security Alert - TheSet</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #1DB954; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 8px; }
            .alert { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎵 TheSet</div>
            </div>
            
            <div class="content">
              <h2>🔒 Security Alert</h2>
              
              <div class="alert">
                <strong>Account Activity Detected:</strong> ${action}
              </div>
              
              <p><strong>Details:</strong> ${details}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              
              <p>If this was you, no action is needed. If you don't recognize this activity, please:</p>
              <ul>
                <li>Change your password immediately</li>
                <li>Review your account settings</li>
                <li>Contact our support team if you need help</li>
              </ul>
              
              <p>Stay secure! 🔒<br>The TheSet Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated security notification from MySetlist.</p>
              <p>TheSet • <a href="${env.NEXT_PUBLIC_APP_URL}">theset.live</a></p>

            </div>
          </div>
        </body>
      </html>
    `;
  }
}

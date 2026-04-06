// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Email Service
 * Production-ready email sending via Resend (primary) or SendGrid (fallback)
 */

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  provider?: 'resend' | 'sendgrid' | 'development';
  error?: string;
}

// Email delivery tracking for monitoring
let emailStats = {
  sent: 0,
  failed: 0,
  lastError: null as string | null,
  lastSentAt: null as number | null,
};

export function getEmailStats() {
  return { ...emailStats };
}

/**
 * Send an email using Resend (primary) with SendGrid fallback
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const result = await sendEmailWithDetails(options);
  return result.success;
}

/**
 * Send an email with detailed result information
 */
export async function sendEmailWithDetails(options: EmailOptions): Promise<EmailResult> {
  const {
    to,
    subject,
    html,
    text,
    from = 'Aminy <noreply@aminy.ai>',
    replyTo = 'support@aminy.ai',
    tags = [],
  } = options;

  // Validate email address
  if (!to || !isValidEmail(to)) {
    console.error('[Email] Invalid recipient email:', to);
    return { success: false, error: 'Invalid recipient email' };
  }

  // Check if we're in development mode with no email keys
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development' ||
                        Deno.env.get('DENO_ENV') === 'development';

  // If no email providers configured
  if (!RESEND_API_KEY && !SENDGRID_API_KEY) {
    if (isDevelopment) {
      console.log('[Email] Development mode - would send email:', { to, subject });
      return { success: true, provider: 'development', messageId: `dev_${Date.now()}` };
    }
    console.error('[Email] No email provider configured (RESEND_API_KEY or SENDGRID_API_KEY required)');
    emailStats.failed++;
    emailStats.lastError = 'No email provider configured';
    return { success: false, error: 'No email provider configured' };
  }

  // Try Resend first (primary provider)
  if (RESEND_API_KEY) {
    const resendResult = await sendViaResend({
      to, subject, html, text, from, replyTo, tags, apiKey: RESEND_API_KEY
    });

    if (resendResult.success) {
      emailStats.sent++;
      emailStats.lastSentAt = Date.now();
      return resendResult;
    }

    console.warn('[Email] Resend failed, trying SendGrid fallback:', resendResult.error);
  }

  // Fallback to SendGrid
  if (SENDGRID_API_KEY) {
    const sendgridResult = await sendViaSendGrid({
      to, subject, html, text, from, replyTo, apiKey: SENDGRID_API_KEY
    });

    if (sendgridResult.success) {
      emailStats.sent++;
      emailStats.lastSentAt = Date.now();
      return sendgridResult;
    }

    emailStats.failed++;
    emailStats.lastError = sendgridResult.error || 'SendGrid failed';
    return sendgridResult;
  }

  // If we get here, Resend was configured but failed and no SendGrid fallback
  emailStats.failed++;
  emailStats.lastError = 'Primary provider failed, no fallback configured';
  return { success: false, error: 'Email delivery failed' };
}

/**
 * Send email via Resend API
 */
async function sendViaResend(params: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from: string;
  replyTo: string;
  tags: { name: string; value: string }[];
  apiKey: string;
}): Promise<EmailResult> {
  const { to, subject, html, text, from, replyTo, tags, apiKey } = params;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: html || undefined,
        text: text || undefined,
        reply_to: replyTo,
        tags: tags.length > 0 ? tags : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Email] Resend API error:', response.status, errorText);
      return {
        success: false,
        provider: 'resend',
        error: `Resend API error: ${response.status}`
      };
    }

    const data = await response.json();
    console.log('[Email] Sent via Resend:', { to, subject, messageId: data.id });

    return {
      success: true,
      provider: 'resend',
      messageId: data.id
    };
  } catch (error) {
    console.error('[Email] Resend request failed:', error);
    return {
      success: false,
      provider: 'resend',
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(params: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from: string;
  replyTo: string;
  apiKey: string;
}): Promise<EmailResult> {
  const { to, subject, html, text, from, replyTo, apiKey } = params;

  // Parse "Name <email>" format
  const fromMatch = from.match(/^(.+)\s*<(.+)>$/);
  const fromEmail = fromMatch ? fromMatch[2] : from;
  const fromName = fromMatch ? fromMatch[1].trim() : 'Aminy';

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
        }],
        from: { email: fromEmail, name: fromName },
        reply_to: { email: replyTo },
        subject,
        content: [
          ...(text ? [{ type: 'text/plain', value: text }] : []),
          ...(html ? [{ type: 'text/html', value: html }] : []),
        ],
      }),
    });

    // SendGrid returns 202 for success, not 200
    if (response.status !== 202 && !response.ok) {
      const errorText = await response.text();
      console.error('[Email] SendGrid API error:', response.status, errorText);
      return {
        success: false,
        provider: 'sendgrid',
        error: `SendGrid API error: ${response.status}`
      };
    }

    // SendGrid doesn't return message ID in response body
    const messageId = response.headers.get('x-message-id') || `sg_${Date.now()}`;
    console.log('[Email] Sent via SendGrid:', { to, subject, messageId });

    return {
      success: true,
      provider: 'sendgrid',
      messageId
    };
  } catch (error) {
    console.error('[Email] SendGrid request failed:', error);
    return {
      success: false,
      provider: 'sendgrid',
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Basic email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Send a batch of emails (with rate limiting)
 */
export async function sendBatchEmails(
  emails: EmailOptions[],
  delayMs: number = 100
): Promise<{ successful: number; failed: number; results: EmailResult[] }> {
  const results: EmailResult[] = [];
  let successful = 0;
  let failed = 0;

  for (const email of emails) {
    const result = await sendEmailWithDetails(email);
    results.push(result);

    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    // Rate limit to avoid hitting API limits
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { successful, failed, results };
}

/**
 * Send report sharing email
 */
export async function sendReportShareEmail(
  recipientEmail: string,
  senderName: string,
  childName: string,
  reportUrl: string,
  message?: string
): Promise<boolean> {
  const subject = `${senderName} shared a progress report for ${childName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; }
    .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
    .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
    .message { background: #f1f5f9; padding: 20px; border-left: 4px solid #0891b2; margin: 20px 0; border-radius: 4px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
    .security-note { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">Aminy Progress Report</h1>
  </div>
  
  <div class="content">
    <p>Hi there,</p>
    
    <p><strong>${senderName}</strong> has shared a progress report for <strong>${childName}</strong> with you.</p>
    
    ${message ? `<div class="message">${message}</div>` : ''}
    
    <p>You can view the report using the secure link below:</p>
    
    <center>
      <a href="${reportUrl}" class="button">View Report</a>
    </center>
    
    <div class="security-note">
      <strong>🔒 Security Note:</strong> This link will expire in 7 days for your privacy and security. 
      If you need to access this report after it expires, please contact ${senderName}.
    </div>
    
    <p>If you have any questions about this report, please reply directly to ${senderName} or contact Aminy support.</p>
    
    <p>Best regards,<br>The Aminy Team</p>
  </div>
  
  <div class="footer">
    <p>This email was sent by Aminy on behalf of ${senderName}.</p>
    <p>If you believe you received this email in error, please contact support@aminy.ai</p>
    <p>&copy; ${new Date().getFullYear()} Aminy AI. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  const text = `
${senderName} shared a progress report for ${childName}

${message ? `Message: ${message}\n\n` : ''}

View the report: ${reportUrl}

Security Note: This link will expire in 7 days for privacy and security.

--
Aminy AI
support@aminy.ai
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
    from: 'Aminy <reports@aminy.ai>',
    replyTo: 'support@aminy.ai',
  });
}

/**
 * Send trial expiration reminder
 */
export async function sendTrialExpirationEmail(
  userEmail: string,
  userName: string,
  daysLeft: number
): Promise<boolean> {
  const subject = daysLeft === 0 
    ? 'Your Aminy trial has ended' 
    : `Your Aminy trial ends in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; }
    .header { text-align: center; padding: 20px; }
    .content { background: white; padding: 30px; }
    .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
    .highlight { background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="content">
    <p>Hi ${userName},</p>
    
    ${daysLeft === 0 ? `
      <p>Your 14-day free trial of Aminy has ended. We hope it's been helpful!</p>
      
      <p>To continue using all of Aminy's features, including unlimited AI chat, full Aminy Jr access, 
      and adaptive daily plans, you'll need to upgrade to a paid plan.</p>
    ` : `
      <p>Just a friendly reminder that your 14-day free trial ends in <strong>${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}</strong>.</p>
      
      <p>We hope Aminy has been helping make your days easier. To keep the support going, 
      make sure to upgrade before your trial ends.</p>
    `}
    
    <div class="highlight">
      <strong>What you get with Core ($69/month):</strong>
      <ul>
        <li>✨ Unlimited AI chat (text & voice)</li>
        <li>🎯 Full Aminy Jr suite</li>
        <li>📊 Adaptive plan builder</li>
        <li>💪 Replaces multiple apps</li>
      </ul>
    </div>
    
    <center>
      <a href="https://app.aminy.ai/upgrade" class="button">Upgrade Now</a>
    </center>
    
    <p>Questions? We're here to help at support@aminy.ai</p>
    
    <p>– The Aminy Team 💙</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
    from: 'Aminy <hello@aminy.ai>',
  });
}

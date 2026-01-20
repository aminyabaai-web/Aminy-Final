/**
 * Email Service
 * Stub for sending emails via third-party service
 * Placeholders for real email service integration
 */

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email using configured email service
 * PLACEHOLDER: Replace with actual email service (Resend, SendGrid, etc.)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const {
    to,
    subject,
    html,
    text,
    from = 'Aminy <noreply@aminy.ai>',
    replyTo = 'support@aminy.ai'
  } = options;

  // ============================================================================
  // OPTION 1: Resend (Recommended for modern apps)
  // ============================================================================
  // Uncomment and configure when you have Resend API key
  /*
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html: html || text,
        reply_to: replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend email error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email via Resend:', error);
    return false;
  }
  */

  // ============================================================================
  // OPTION 2: SendGrid
  // ============================================================================
  // Uncomment and configure when you have SendGrid API key
  /*
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
  if (!SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
        }],
        from: { email: from.match(/<(.+)>/)?.[1] || from, name: 'Aminy' },
        subject,
        content: [
          { type: 'text/html', value: html || text || '' }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid email error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email via SendGrid:', error);
    return false;
  }
  */

  // ============================================================================
  // OPTION 3: Supabase Email (for transactional emails)
  // ============================================================================
  // This is available if you have Supabase Auth email configured
  // But it's not ideal for custom emails like report sharing

  // ============================================================================
  // DEVELOPMENT MODE: Log email instead of sending
  // ============================================================================

  // Return true to simulate successful send in development
  return true;
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
      <p>Your 7-day free trial of Aminy has ended. We hope it's been helpful!</p>
      
      <p>To continue using all of Aminy's features, including unlimited AI chat, full Aminy Jr access, 
      and adaptive daily plans, you'll need to upgrade to a paid plan.</p>
    ` : `
      <p>Just a friendly reminder that your 7-day free trial ends in <strong>${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}</strong>.</p>
      
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

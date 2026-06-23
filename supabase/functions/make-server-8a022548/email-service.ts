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
 * Send an email using Resend email service
 * Production-ready email delivery for retention, notifications, and sharing
 *
 * NOTE: If you haven't verified your domain with Resend, emails will be sent
 * from 'Aminy <onboarding@resend.dev>' (Resend's sandbox address).
 * To use your own domain:
 * 1. Verify your domain at https://resend.com/domains
 * 2. Set RESEND_VERIFIED_DOMAIN=true in Supabase secrets
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const {
    to,
    subject,
    html,
    text,
    from = 'Aminy <noreply@aminy.ai>',
    replyTo = 'aminyaba.ai@gmail.com'
  } = options;

  // Get Resend API key from environment
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const VERIFIED_DOMAIN = Deno.env.get('RESEND_VERIFIED_DOMAIN') === 'true';

  if (!RESEND_API_KEY) {
    console.error('[Email] RESEND_API_KEY not configured - email not sent');
    console.log('[Email] Would have sent:', { to, subject, from });
    // In development without API key, log and return true to not block flows
    return true;
  }

  // Use Resend's sandbox address if domain not verified
  // This allows testing before domain verification is complete
  const actualFrom = VERIFIED_DOMAIN ? from : 'Aminy <onboarding@resend.dev>';

  try {
    console.log('[Email] Sending email via Resend:', { to, subject, from: actualFrom });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: actualFrom,
        to,
        subject,
        html: html || text,
        reply_to: replyTo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Email] Resend API error:', response.status, errorText);
      // Throw with details so endpoint can return useful error
      throw new Error(`Resend API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('[Email] Email sent successfully:', result.id);
    return true;
  } catch (error) {
    console.error('[Email] Error sending email via Resend:', error);
    // Re-throw to let caller handle with details
    throw error;
  }
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
    <p>If you believe you received this email in error, please contact aminyaba.ai@gmail.com</p>
    <p>&copy; ${new Date().getFullYear()} Aminy LLC. All rights reserved.</p>
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
aminyaba.ai@gmail.com
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
    from: 'Aminy <noreply@aminy.ai>',
    replyTo: 'aminyaba.ai@gmail.com',
  });
}

/**
 * Send welcome email after onboarding completion
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  childName: string
): Promise<boolean> {
  const subject = `Welcome to Aminy, ${userName.split(' ')[0]}! 🎉`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; }
    .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
    .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
    .tip-box { background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">Welcome to Aminy!</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Your AI partner for ${childName}'s journey</p>
  </div>

  <div class="content">
    <p>Hi ${userName.split(' ')[0]},</p>

    <p>I'm so glad you're here. You've just taken an important step by joining Aminy — and I want you to know: <strong>you're not alone anymore.</strong></p>

    <p>I'm here 24/7 to help you navigate the day-to-day challenges of supporting ${childName}. Whether it's 2am and you need someone to talk to, or you're trying to figure out how to handle a meltdown at the grocery store — I've got your back.</p>

    <div class="tip-box">
      <strong>🎯 Quick Start Tips:</strong>
      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
        <li>Start each morning with a quick check-in (it takes 60 seconds)</li>
        <li>Ask me anything — no question is too small</li>
        <li>Use voice chat when your hands are full</li>
        <li>Check out Aminy Jr for activities ${childName} can do</li>
      </ul>
    </div>

    <center>
      <a href="https://aminy.ai" class="button">Open Aminy</a>
    </center>

    <p>Your 7-day free trial starts now. No credit card needed to explore everything Aminy has to offer.</p>

    <p>I'm already learning about ${childName} from our onboarding chat. The more we talk, the more personalized my support becomes.</p>

    <p>You've got this — and I've got you. 💙</p>

    <p>– Aminy</p>
  </div>

  <div class="footer">
    <p>Questions? Reply to this email or reach us at aminyaba.ai@gmail.com</p>
    <p>&copy; ${new Date().getFullYear()} Aminy LLC. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
    from: 'Aminy <noreply@aminy.ai>',
    replyTo: 'aminyaba.ai@gmail.com',
  });
}

/**
 * Send re-engagement email when user hasn't been active
 */
export async function sendReEngagementEmail(
  userEmail: string,
  userName: string,
  childName: string,
  daysSinceLastActivity: number
): Promise<boolean> {
  const subject = daysSinceLastActivity <= 3
    ? `${userName.split(' ')[0]}, I'm here when you need me`
    : `Thinking of you and ${childName} 💙`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; }
    .content { background: white; padding: 30px; }
    .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
    .gentle-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="content">
    <p>Hi ${userName.split(' ')[0]},</p>

    ${daysSinceLastActivity <= 3 ? `
      <p>Just a gentle note to say I'm here whenever you're ready. No pressure — parenting is hard enough without apps making you feel guilty.</p>

      <p>When you have a moment, I'd love to hear how things are going with ${childName}. Even a quick 30-second check-in helps me understand how to support you better.</p>
    ` : `
      <p>I know life gets busy — especially when you're supporting ${childName} through each day. There's no judgment here, only understanding.</p>

      <p>I've been thinking about some things that might help when you're ready:</p>

      <div class="gentle-box">
        <strong>Some parents find these helpful after a break:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>A quick voice chat while doing dishes or driving</li>
          <li>Reviewing what strategies worked before</li>
          <li>Just venting about a tough moment</li>
        </ul>
      </div>
    `}

    <center>
      <a href="https://aminy.ai" class="button">Open Aminy</a>
    </center>

    <p>Remember: progress isn't linear, and neither is self-care. I'm here when you need me.</p>

    <p>– Aminy 💙</p>
  </div>

  <div class="footer">
    <p>Don't want these reminders? <a href="https://aminy.ai/settings/notifications">Update your preferences</a></p>
    <p>&copy; ${new Date().getFullYear()} Aminy LLC. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
    from: 'Aminy <noreply@aminy.ai>',
    replyTo: 'aminyaba.ai@gmail.com',
  });
}

/**
 * Send weekly digest email with progress summary
 */
export async function sendWeeklyDigestEmail(
  userEmail: string,
  userName: string,
  childName: string,
  weekStats: {
    checkIns: number;
    aiChats: number;
    activitiesCompleted: number;
    streakDays: number;
    topWin?: string;
  }
): Promise<boolean> {
  const subject = `${childName}'s Week in Review 📊`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; }
    .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .stat-box { background: #f8fafc; padding: 20px; border-radius: 12px; text-align: center; }
    .stat-number { font-size: 32px; font-weight: bold; color: #0891b2; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 5px; }
    .win-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">${childName}'s Week</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Your weekly progress summary</p>
  </div>

  <div class="content">
    <p>Hi ${userName.split(' ')[0]},</p>

    <p>Here's how your week with Aminy went:</p>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-number">${weekStats.checkIns}</div>
        <div class="stat-label">Check-ins</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${weekStats.aiChats}</div>
        <div class="stat-label">AI Conversations</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${weekStats.activitiesCompleted}</div>
        <div class="stat-label">Activities Done</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${weekStats.streakDays}</div>
        <div class="stat-label">Day Streak 🔥</div>
      </div>
    </div>

    ${weekStats.topWin ? `
      <div class="win-box">
        <strong>🏆 This Week's Win:</strong>
        <p style="margin: 10px 0 0 0;">${weekStats.topWin}</p>
      </div>
    ` : ''}

    <p>Every interaction, every small moment of connection matters. You're doing amazing work.</p>

    <center>
      <a href="https://aminy.ai" class="button">Continue Your Journey</a>
    </center>

    <p>See you next week! 💙</p>

    <p>– The Aminy Team</p>
  </div>

  <div class="footer">
    <p>Manage email preferences in <a href="https://aminy.ai/settings/notifications">Settings</a></p>
    <p>&copy; ${new Date().getFullYear()} Aminy LLC. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
    from: 'Aminy <noreply@aminy.ai>',
    replyTo: 'aminyaba.ai@gmail.com',
  });
}

/**
 * Send trial expiration reminder
 */
/**
 * Churn Prevention Email Sequence
 * Sends targeted emails during and after trial to reduce churn
 */

export type ChurnEmailType =
  | 'trial_progress' // Day 4: Highlight progress made
  | 'trial_ending' // Day 6: Urgency before trial ends
  | 'trial_expired_offer'; // Day 8: Win-back with special offer

export async function sendChurnPreventionEmail(
  userEmail: string,
  userName: string,
  childName: string,
  emailType: ChurnEmailType,
  metadata?: {
    progressStats?: {
      aiChats: number;
      jrSessions: number;
      daysActive: number;
    };
    offerCode?: string;
    offerDiscount?: number;
  }
): Promise<boolean> {
  const { progressStats, offerCode = 'COMEBACK50', offerDiscount = 50 } = metadata || {};

  const subjects: Record<ChurnEmailType, string> = {
    trial_progress: `${userName}, you're making great progress with ${childName} 💙`,
    trial_ending: `One more day of your Aminy trial`,
    trial_expired_offer: `${userName}, we miss you - ${offerDiscount}% off to come back`,
  };

  const getHtml = (): string => {
    const baseStyles = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background: #f8fafc; }
      .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
      .button-secondary { background: #f1f5f9; color: #0891b2; }
      .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
      .stat-box { background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center; }
      .stat-number { font-size: 24px; font-weight: bold; color: #0891b2; }
      .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
      .highlight { background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%); border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
      .offer-box { background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border: 2px solid #f59e0b; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; }
      .offer-code { font-size: 24px; font-weight: bold; color: #d97706; letter-spacing: 2px; padding: 12px 24px; background: white; border-radius: 8px; display: inline-block; margin: 12px 0; }
      .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; }
    `;

    if (emailType === 'trial_progress') {
      return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="card">
    <p>Hi ${userName},</p>

    <p>We've been watching your journey with Aminy, and we're impressed! 🌟</p>

    <p>Here's what you've accomplished so far:</p>

    ${progressStats ? `
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-number">${progressStats.aiChats}</div>
        <div class="stat-label">AI Conversations</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${progressStats.jrSessions}</div>
        <div class="stat-label">Jr Sessions</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${progressStats.daysActive}</div>
        <div class="stat-label">Days Active</div>
      </div>
    </div>
    ` : ''}

    <div class="highlight">
      <strong>Every small step matters</strong>
      <p style="margin: 8px 0 0 0; color: #475569;">The consistency you're building with ${childName} creates lasting change. Keep it up!</p>
    </div>

    <p>Your trial continues for a few more days. Make the most of it!</p>

    <center>
      <a href="https://aminy.ai/dashboard" class="button">Continue Your Journey</a>
    </center>

    <p>Cheering you on,<br>– The Aminy Team 💙</p>
  </div>
  <div class="footer">
    <p>You're receiving this because you started a free trial with Aminy.</p>
  </div>
</body>
</html>`;
    }

    if (emailType === 'trial_ending') {
      return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="card">
    <p>Hi ${userName},</p>

    <p>Just a heads up – your Aminy trial ends <strong>tomorrow</strong>.</p>

    <p>We don't want you and ${childName} to lose momentum! Here's what staying with Aminy means:</p>

    <div class="highlight">
      <ul style="margin: 0; padding-left: 20px;">
        <li>✨ <strong>Unlimited AI guidance</strong> whenever you need support</li>
        <li>🎮 <strong>Full Aminy Jr</strong> – calm tools ${childName} can use independently</li>
        <li>📊 <strong>Progress tracking</strong> to see how far you've come</li>
        <li>🧠 <strong>Memory of everything</strong> – Aminy remembers ${childName}'s needs</li>
      </ul>
    </div>

    <p style="font-size: 14px; color: #64748b;">Plans start at just $14.99/month – less than one therapy session.</p>

    <center>
      <a href="https://aminy.ai/upgrade" class="button">Keep Access to Aminy</a>
    </center>

    <p>Questions? We're always here to help.</p>

    <p>– The Aminy Team 💙</p>
  </div>
  <div class="footer">
    <p>You're receiving this because your Aminy trial is ending soon.</p>
  </div>
</body>
</html>`;
    }

    // trial_expired_offer
    return `
<!DOCTYPE html>
<html>
<head><style>${baseStyles}</style></head>
<body>
  <div class="card">
    <p>Hi ${userName},</p>

    <p>We noticed your trial ended yesterday, and we wanted to reach out personally.</p>

    <p>Every family's journey is different, and we know choosing to invest in support isn't always easy. That's why we'd like to offer you something special:</p>

    <div class="offer-box">
      <div style="font-size: 14px; text-transform: uppercase; color: #92400e; letter-spacing: 1px;">Welcome Back Offer</div>
      <div style="font-size: 32px; font-weight: bold; color: #d97706; margin: 12px 0;">${offerDiscount}% OFF</div>
      <div style="font-size: 14px; color: #78716c;">Your first month</div>
      <div class="offer-code">${offerCode}</div>
      <div style="font-size: 12px; color: #a8a29e;">Expires in 48 hours</div>
    </div>

    <p>We genuinely believe Aminy can make a difference for you and ${childName}. This offer is our way of making it easier to give it another try.</p>

    <center>
      <a href="https://aminy.ai/upgrade?code=${offerCode}" class="button">Claim ${offerDiscount}% Off</a>
    </center>

    <p style="font-size: 14px; color: #64748b;">If Aminy isn't right for you, that's okay too. We just wanted to make sure you had this option.</p>

    <p>Take care,<br>– The Aminy Team 💙</p>
  </div>
  <div class="footer">
    <p>You're receiving this because your Aminy trial recently ended.</p>
  </div>
</body>
</html>`;
  };

  return sendEmail({
    to: userEmail,
    subject: subjects[emailType],
    html: getHtml(),
    from: 'Aminy <noreply@aminy.ai>',
    replyTo: 'aminyaba.ai@gmail.com',
  });
}

/**
 * Send email to parent when a BCBA answers their question
 */
export async function sendBCBAResponseEmail(
  to: string,
  childName: string,
  questionPreview: string,
): Promise<boolean> {
  const subject = `Your Aminy behaviorist replied about ${childName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; }
    .header { background: #0D1B2A; color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
    .preview-box { background: #f8fafc; border-left: 4px solid #43AA8B; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; color: #475569; font-style: italic; }
    .button { display: inline-block; background: #43AA8B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; font-size: 15px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Aminy</h1>
  </div>

  <div class="content">
    <p>Great news!</p>

    <p>A behaviorist on the Aminy team has reviewed and replied to your question about <strong>${childName}</strong>:</p>

    <div class="preview-box">"${questionPreview}"</div>

    <p>Open Aminy to read the full response and take next steps.</p>

    <center>
      <a href="https://aminy.ai/ask-bcba" class="button">View the Answer</a>
    </center>

    <p style="font-size: 14px; color: #64748b;">If you have follow-up questions, you can reply directly within the app.</p>

    <p>– The Aminy Team</p>
  </div>

  <div class="footer">
    <p>You're receiving this because you submitted a question through Ask a Behaviorist in Aminy.</p>
    <p>&copy; ${new Date().getFullYear()} Aminy LLC. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject,
    html,
    from: 'Aminy <support@aminy.ai>',
    replyTo: 'aminyaba.ai@gmail.com',
  });
}

/**
 * Send email to parent when session notes are ready to view
 */
export async function sendSessionNotesEmail(
  to: string,
  childName: string,
  sessionDate: string,
  providerName: string,
): Promise<boolean> {
  const subject = `${childName}'s session notes are ready`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; }
    .header { background: #0D1B2A; color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
    .session-info { background: #f0fdfa; border-left: 4px solid #43AA8B; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .session-info p { margin: 4px 0; font-size: 14px; }
    .button { display: inline-block; background: #43AA8B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; font-size: 15px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Aminy</h1>
  </div>

  <div class="content">
    <p>Hi there,</p>

    <p>The session notes for <strong>${childName}</strong>'s appointment are now available in Aminy.</p>

    <div class="session-info">
      <p><strong>Child:</strong> ${childName}</p>
      <p><strong>Session date:</strong> ${sessionDate}</p>
      <p><strong>Provider:</strong> ${providerName}</p>
    </div>

    <p>Review the notes, track progress, and find any recommendations your provider shared — all in one place.</p>

    <center>
      <a href="https://aminy.ai/records" class="button">Open Session Notes</a>
    </center>

    <p style="font-size: 14px; color: #64748b;">Questions about the session? Reply to your provider directly through the Aminy app.</p>

    <p>– The Aminy Team</p>
  </div>

  <div class="footer">
    <p>You're receiving this because session notes were added to ${childName}'s Aminy profile.</p>
    <p>&copy; ${new Date().getFullYear()} Aminy LLC. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject,
    html,
    from: 'Aminy <support@aminy.ai>',
    replyTo: 'aminyaba.ai@gmail.com',
  });
}

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
      <a href="https://aminy.ai/upgrade" class="button">Upgrade Now</a>
    </center>
    
    <p>Questions? We're here to help at aminyaba.ai@gmail.com</p>
    
    <p>– The Aminy Team 💙</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
    from: 'Aminy <noreply@aminy.ai>',
    replyTo: 'aminyaba.ai@gmail.com',
  });
}

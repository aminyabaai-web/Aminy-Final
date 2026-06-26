// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC

/**
 * Auth Email Hook Handler
 *
 * Intercepts Supabase Auth email sending via the "Send Email" hook.
 * Supabase calls POST /auth/send-email instead of sending emails itself,
 * giving us full control: Aminy branding, support@aminy.ai sender, Resend delivery.
 *
 * Hook setup (Supabase Dashboard):
 *   Authentication → Hooks → Send Email hook → HTTPS endpoint
 *   URL: https://qpzsvafwcwyrkdolrjbu.supabase.co/functions/v1/make-server-8a022548/auth/send-email
 *   Secret: generate in the dialog → copy → store as Supabase secret SEND_EMAIL_HOOK_SECRET
 *
 * Supabase signs hook requests using Standard Webhooks (https://www.standardwebhooks.com/).
 * The secret value has format "v1,whsec_BASE64..." — we strip the "v1," prefix before
 * passing to the Webhook constructor.
 */

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { sendEmail } from './email-service.ts';

// Supabase Send Email hook payload
interface AuthHookPayload {
  user: {
    id: string;
    email: string;
    email_confirmed_at?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    otp?: string;
    email_action_type: 'recovery' | 'signup' | 'invite' | 'magiclink' | 'email_change' | 'reauthentication';
    site_url: string;
    new_email?: string;
  };
}

function buildVerifyUrl(siteUrl: string, tokenHash: string, type: string, redirectTo: string): string {
  const base = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  const encoded = encodeURIComponent(redirectTo);
  return `${base}/auth/v1/verify?token=${tokenHash}&type=${type}&redirect_to=${encoded}`;
}

// ─── Shared email chrome ────────────────────────────────────────────────────

const BRAND_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #F8F8F6; color: #1B2733; }
  .wrapper { max-width: 560px; margin: 32px auto; padding: 0 16px 40px; }
  .header { background: #0D1B2A; border-radius: 14px 14px 0 0; padding: 28px 32px 24px; text-align: center; }
  .logo { font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
  .logo span { color: #4E93A8; }
  .card { background: #ffffff; border: 1px solid #E8E4DF; border-top: none; border-radius: 0 0 14px 14px; padding: 36px 32px 28px; }
  h1 { font-size: 20px; font-weight: 700; color: #0D1B2A; margin: 0 0 12px; }
  p { font-size: 15px; line-height: 1.6; color: #3A4A57; margin: 0 0 16px; }
  .cta { display: block; margin: 28px auto; text-align: center; }
  .cta a { background: #4E93A8; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 10px; display: inline-block; }
  .note { font-size: 13px; color: #8A9BB0; margin: 20px 0 0; }
  .divider { border: none; border-top: 1px solid #E8E4DF; margin: 24px 0; }
  .footer { text-align: center; font-size: 12px; color: #8A9BB0; padding-top: 8px; }
  .footer a { color: #4E93A8; text-decoration: none; }
`;

function wrap(inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${BRAND_CSS}</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Aminy<span>.</span></div>
    </div>
    <div class="card">
      ${inner}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Aminy LLC · <a href="https://aminy.ai">aminy.ai</a> · <a href="mailto:support@aminy.ai">support@aminy.ai</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Email templates ─────────────────────────────────────────────────────────

function passwordResetHtml(actionUrl: string): string {
  return wrap(`
    <h1>Reset your password</h1>
    <p>We received a request to reset the password for your Aminy account. Click the button below to choose a new password.</p>
    <div class="cta">
      <a href="${actionUrl}">Reset password</a>
    </div>
    <p class="note">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
    <hr class="divider" />
    <p class="note">For your security, never share this link with anyone. Aminy staff will never ask for it.</p>
  `);
}

function emailConfirmationHtml(actionUrl: string): string {
  return wrap(`
    <h1>Confirm your email</h1>
    <p>Welcome to Aminy! One quick step: confirm your email address so we can keep your account secure.</p>
    <div class="cta">
      <a href="${actionUrl}">Confirm email</a>
    </div>
    <p class="note">This link expires in 24 hours. If you didn't create an Aminy account, you can safely ignore this email.</p>
  `);
}

function magicLinkHtml(actionUrl: string): string {
  return wrap(`
    <h1>Your sign-in link</h1>
    <p>Click the button below to sign in to Aminy. No password needed.</p>
    <div class="cta">
      <a href="${actionUrl}">Sign in to Aminy</a>
    </div>
    <p class="note">This link expires in 10 minutes and can only be used once. If you didn't request this, you can safely ignore this email.</p>
  `);
}

function emailChangeHtml(actionUrl: string, newEmail?: string): string {
  return wrap(`
    <h1>Confirm your new email</h1>
    <p>You requested to change your Aminy account email${newEmail ? ` to <strong>${newEmail}</strong>` : ''}. Click below to confirm the change.</p>
    <div class="cta">
      <a href="${actionUrl}">Confirm new email</a>
    </div>
    <p class="note">This link expires in 24 hours. If you didn't make this change, please contact <a href="mailto:support@aminy.ai" style="color:#4E93A8">support@aminy.ai</a> immediately.</p>
  `);
}

function inviteHtml(actionUrl: string): string {
  return wrap(`
    <h1>You've been invited to Aminy</h1>
    <p>Someone invited you to join Aminy — the AI-powered support system for neurodivergent families. Click below to accept your invitation and set up your account.</p>
    <div class="cta">
      <a href="${actionUrl}">Accept invitation</a>
    </div>
    <p class="note">This invitation expires in 7 days. If you weren't expecting this, you can safely ignore it.</p>
  `);
}

// ─── Main handler (exported for wiring into Hono) ───────────────────────────

export async function handleAuthSendEmail(c: any): Promise<Response> {
  try {
    // Read body as text first so we can verify the signature before parsing.
    const rawBody = await c.req.text();

    // Verify Standard Webhooks signature from Supabase.
    // Secret stored as Supabase env var SEND_EMAIL_HOOK_SECRET, format "v1,whsec_BASE64...".
    // Strip the "v1," prefix — the Webhook constructor expects just the "whsec_..." part.
    const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '';
    if (hookSecret) {
      const signingSecret = hookSecret.startsWith('v1,') ? hookSecret.slice(3) : hookSecret;
      const wh = new Webhook(signingSecret);
      const webhookHeaders = {
        'webhook-id': c.req.header('webhook-id') ?? '',
        'webhook-timestamp': c.req.header('webhook-timestamp') ?? '',
        'webhook-signature': c.req.header('webhook-signature') ?? '',
      };
      try {
        wh.verify(rawBody, webhookHeaders);
      } catch {
        console.warn('[AuthEmail] Invalid webhook signature — rejecting request');
        return c.json({ error: 'Invalid signature' }, 401);
      }
    } else {
      console.warn('[AuthEmail] SEND_EMAIL_HOOK_SECRET not set — skipping signature verification');
    }

    const payload: AuthHookPayload = JSON.parse(rawBody);
    const { user, email_data } = payload;

    if (!user?.email || !email_data) {
      return c.json({ error: 'Invalid hook payload' }, 400);
    }

    const { email_action_type, token_hash, redirect_to, site_url, new_email } = email_data;

    const actionUrl = buildVerifyUrl(
      site_url || 'https://aminy.ai',
      token_hash,
      email_action_type === 'recovery' ? 'recovery'
        : email_action_type === 'signup' ? 'signup'
        : email_action_type === 'invite' ? 'invite'
        : email_action_type === 'magiclink' ? 'magiclink'
        : email_action_type === 'email_change' ? 'email_change'
        : 'recovery',
      redirect_to || 'https://aminy.ai',
    );

    let subject: string;
    let html: string;

    switch (email_action_type) {
      case 'recovery':
        subject = 'Reset your Aminy password';
        html = passwordResetHtml(actionUrl);
        break;
      case 'signup':
        subject = 'Confirm your Aminy email';
        html = emailConfirmationHtml(actionUrl);
        break;
      case 'magiclink':
        subject = 'Your Aminy sign-in link';
        html = magicLinkHtml(actionUrl);
        break;
      case 'invite':
        subject = "You've been invited to Aminy";
        html = inviteHtml(actionUrl);
        break;
      case 'email_change':
        subject = 'Confirm your new Aminy email';
        html = emailChangeHtml(actionUrl, new_email);
        break;
      default:
        subject = 'Action required for your Aminy account';
        html = passwordResetHtml(actionUrl);
    }

    await sendEmail({
      to: user.email,
      subject,
      html,
      from: 'Aminy <support@aminy.ai>',
      replyTo: 'support@aminy.ai',
    });

    console.log(`[AuthEmail] Sent ${email_action_type} email to ${user.email}`);

    return c.json({ message: 'Email sent' }, 200);
  } catch (error) {
    console.error('[AuthEmail] Failed to send auth email:', error);
    return c.json({ error: 'Email delivery failed' }, 500);
  }
}

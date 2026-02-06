/**
 * Email Service
 *
 * Handles all transactional and marketing emails for Aminy.
 * Uses Resend/SendGrid API through Supabase Edge Functions.
 *
 * Features:
 * - Trial sequence emails
 * - Retention & re-engagement
 * - Weekly summaries
 * - Provider notifications
 * - Password reset
 */

import { supabase } from '../utils/supabase/client';

// ============================================
// TYPES
// ============================================

export type EmailTemplate =
  | 'welcome'
  | 'trial_day_1'
  | 'trial_day_3'
  | 'trial_day_5'
  | 'trial_ending_soon'
  | 'trial_expired'
  | 'weekly_summary'
  | 'streak_celebration'
  | 'reengagement'
  | 'password_reset'
  | 'email_verification'
  | 'provider_application_approved'
  | 'provider_application_rejected'
  | 'appointment_confirmation'
  | 'appointment_reminder'
  | 'appointment_cancelled'
  | 'referral_invite'
  | 'referral_signup'
  | 'payment_receipt'
  | 'payment_failed'
  | 'subscription_cancelled'
  | 'export_ready';

export interface EmailPayload {
  to: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================
// EMAIL TEMPLATES
// ============================================

const EMAIL_TEMPLATES: Record<EmailTemplate, (data: any) => { subject: string; html: string; text: string }> = {
  welcome: (data) => ({
    subject: `Welcome to Aminy, ${data.parentName}! 🌟`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://aminy.app/logo.png" alt="Aminy" style="height: 48px;" />
        </div>
        <h1 style="color: #0d9488; margin-bottom: 20px;">Welcome to Aminy! 🌟</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${data.parentName},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          You're all set to get personalized support for ${data.childName}'s journey. Aminy is here to help with routines, behaviors, communication strategies, and more.
        </p>
        <div style="background: #f0fdfa; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #0d9488; margin-top: 0;">Quick Start Tips:</h3>
          <ul style="color: #374151; line-height: 1.8;">
            <li>Ask me anything about ${data.childName}'s development</li>
            <li>Upload IEPs or evaluations for personalized guidance</li>
            <li>Track behaviors and celebrate progress</li>
            <li>Connect with our BCBA marketplace when ready</li>
          </ul>
        </div>
        <a href="${data.appUrl}/dashboard" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
          Start Using Aminy
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Questions? Reply to this email anytime - we're here to help!
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} Aminy. All rights reserved.<br/>
          <a href="${data.appUrl}/unsubscribe?token=${data.unsubscribeToken}" style="color: #9ca3af;">Unsubscribe</a>
        </p>
      </div>
    `,
    text: `Welcome to Aminy, ${data.parentName}!\n\nYou're all set to get personalized support for ${data.childName}'s journey.\n\nStart using Aminy: ${data.appUrl}/dashboard`,
  }),

  trial_day_1: (data) => ({
    subject: `Day 1 with Aminy - Here's what to try! 💡`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">Welcome to Day 1! 💡</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${data.parentName},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hope you had a chance to explore Aminy! Here's a tip: try asking me for a calm-down strategy when ${data.childName} is feeling overwhelmed.
        </p>
        <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <strong style="color: #92400e;">Try saying:</strong>
          <p style="color: #374151; font-style: italic; margin-bottom: 0;">
            "Give me a quick calm-down strategy for ${data.childName}"
          </p>
        </div>
        <a href="${data.appUrl}/dashboard" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Try It Now
        </a>
      </div>
    `,
    text: `Day 1 with Aminy!\n\nTry asking: "Give me a quick calm-down strategy for ${data.childName}"\n\n${data.appUrl}/dashboard`,
  }),

  trial_day_3: (data) => ({
    subject: `You're doing great! Have you tried this? 🎯`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">Day 3 - You're doing great! 🎯</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${data.parentName},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          You've had ${data.conversationCount || 'a few'} conversations with Aminy! Have you discovered the Care Plan feature yet? It helps you coordinate care with providers.
        </p>
        <div style="background: #f0fdfa; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <strong style="color: #0d9488;">Feature Spotlight: Care Plan</strong>
          <p style="color: #374151;">
            Create a shareable care plan that your BCBA, therapists, and teachers can access. Everyone stays on the same page!
          </p>
        </div>
        <a href="${data.appUrl}/care-page" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Create Care Plan
        </a>
      </div>
    `,
    text: `Day 3 with Aminy!\n\nHave you tried the Care Plan feature?\n\n${data.appUrl}/care-page`,
  }),

  trial_day_5: (data) => ({
    subject: `Halfway through your trial - What families love most ❤️`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">Halfway There! ❤️</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${data.parentName},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          You're halfway through your free trial! Here's what other parents love most about Aminy:
        </p>
        <div style="margin: 25px 0;">
          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; margin-bottom: 12px;">
            <strong style="color: #0d9488;">🧠 "Aminy remembers everything"</strong>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Unlike ChatGPT, Aminy builds a complete picture of ${data.childName} over time.
            </p>
          </div>
          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; margin-bottom: 12px;">
            <strong style="color: #0d9488;">📄 "IEP document magic"</strong>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Upload IEPs and get plain-English explanations instantly.
            </p>
          </div>
          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px;">
            <strong style="color: #0d9488;">👨‍👩‍👧 "It feels personal"</strong>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Strategies specifically for ${data.childName}, not generic advice.
            </p>
          </div>
        </div>
        <a href="${data.appUrl}/paywall" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          See Plans & Keep Your Progress
        </a>
      </div>
    `,
    text: `Halfway through your trial!\n\nSee what other parents love about Aminy.\n\n${data.appUrl}/paywall`,
  }),

  trial_ending_soon: (data) => ({
    subject: `⏰ ${data.daysLeft} day${data.daysLeft !== 1 ? 's' : ''} left - Don't lose your memories!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">Your trial ends soon! ⏰</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${data.parentName},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your free trial ends in ${data.daysLeft} day${data.daysLeft !== 1 ? 's' : ''}. We don't want you to lose:
        </p>
        <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <ul style="color: #374151; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>${data.memoriesCount || 'All'}</strong> personalized memories about ${data.childName}</li>
            <li><strong>${data.conversationCount || 'Your'}</strong> conversation history</li>
            <li>Your care plan and uploaded documents</li>
          </ul>
        </div>
        <a href="${data.appUrl}/paywall" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Subscribe & Keep Everything
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          Plans start at just $14.99/month. Cancel anytime.
        </p>
      </div>
    `,
    text: `Your trial ends in ${data.daysLeft} day(s)!\n\nDon't lose your memories and progress.\n\n${data.appUrl}/paywall`,
  }),

  trial_expired: (data) => ({
    subject: `Your trial ended, but ${data.childName}'s data is safe 💾`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #374151;">We miss you! 💙</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${data.parentName},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your trial has ended, but don't worry - all of ${data.childName}'s personalized data is safely stored. You can reactivate anytime and pick up right where you left off.
        </p>
        <div style="background: #f0fdfa; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <strong style="color: #0d9488;">What's waiting for you:</strong>
          <ul style="color: #374151; line-height: 1.8;">
            <li>All your conversation history</li>
            <li>${data.childName}'s personalized profile</li>
            <li>Your care plan and documents</li>
          </ul>
        </div>
        <a href="${data.appUrl}/paywall" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Reactivate Now
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          Use code <strong>WELCOMEBACK</strong> for 20% off your first month!
        </p>
      </div>
    `,
    text: `Your trial ended.\n\n${data.childName}'s data is safe. Reactivate anytime!\n\n${data.appUrl}/paywall`,
  }),

  weekly_summary: (data) => ({
    subject: `${data.childName}'s Week in Review 📊`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">${data.childName}'s Week 📊</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${data.parentName}, here's your weekly summary:
        </p>
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span style="color: #6b7280;">AI Conversations</span>
            <strong style="color: #0d9488;">${data.aiMessages || 0}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span style="color: #6b7280;">Calm Cues Used</span>
            <strong style="color: #0d9488;">${data.calmCues || 0}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span style="color: #6b7280;">Streak Days</span>
            <strong style="color: #0d9488;">${data.streakDays || 0} 🔥</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6b7280;">Routines Completed</span>
            <strong style="color: #0d9488;">${data.routinesCompleted || 0}</strong>
          </div>
        </div>
        <a href="${data.appUrl}/dashboard" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          See Full Dashboard
        </a>
      </div>
    `,
    text: `${data.childName}'s Week:\n\nAI Conversations: ${data.aiMessages || 0}\nCalm Cues: ${data.calmCues || 0}\nStreak: ${data.streakDays || 0} days\n\n${data.appUrl}/dashboard`,
  }),

  streak_celebration: (data) => ({
    subject: `🎉 Amazing! ${data.streak}-day streak!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
        <h1 style="color: #0d9488; font-size: 48px; margin-bottom: 10px;">🔥 ${data.streak}</h1>
        <h2 style="color: #374151;">Day Streak!</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Incredible, ${data.parentName}! You've been consistently supporting ${data.childName} for ${data.streak} days straight. That dedication makes a real difference!
        </p>
        <a href="${data.appUrl}/dashboard" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px;">
          Keep It Going!
        </a>
      </div>
    `,
    text: `${data.streak}-day streak! Amazing work, ${data.parentName}!\n\n${data.appUrl}/dashboard`,
  }),

  reengagement: (data) => ({
    subject: `${data.childName} - we're here when you need us 💙`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">We miss you! 💙</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${data.parentName},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          It's been ${data.daysSinceVisit} days since your last visit. Life gets busy - we get it! ${data.childName}'s personalized support is always here when you need it.
        </p>
        <div style="background: #f0fdfa; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <strong style="color: #0d9488;">Quick reminder:</strong>
          <p style="color: #374151; margin-bottom: 0;">
            Aminy remembers everything about ${data.childName}, so you can jump right back in with personalized strategies.
          </p>
        </div>
        <a href="${data.appUrl}/dashboard" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Come Back to Aminy
        </a>
      </div>
    `,
    text: `We miss you!\n\n${data.childName}'s personalized support is waiting.\n\n${data.appUrl}/dashboard`,
  }),

  password_reset: (data) => ({
    subject: 'Reset your Aminy password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #374151;">Reset Your Password</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to create a new password:
        </p>
        <a href="${data.resetUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
          Reset Password
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Reset your password:\n\n${data.resetUrl}\n\nThis link expires in 1 hour.`,
  }),

  email_verification: (data) => ({
    subject: 'Verify your Aminy email',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">Verify Your Email</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Please verify your email address to complete your Aminy registration.
        </p>
        <a href="${data.verifyUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
          Verify Email
        </a>
      </div>
    `,
    text: `Verify your email:\n\n${data.verifyUrl}`,
  }),

  provider_application_approved: (data) => ({
    subject: '🎉 Welcome to Aminy Provider Network!',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">You're Approved! 🎉</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Congratulations, ${data.providerName}! Your application to join the Aminy Provider Network has been approved.
        </p>
        <div style="background: #f0fdfa; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <strong style="color: #0d9488;">Next Steps:</strong>
          <ol style="color: #374151; line-height: 1.8;">
            <li>Complete your provider profile</li>
            <li>Set your availability</li>
            <li>Start accepting consultations</li>
          </ol>
        </div>
        <a href="${data.appUrl}/provider/dashboard" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Go to Provider Dashboard
        </a>
      </div>
    `,
    text: `Your provider application is approved!\n\n${data.appUrl}/provider/dashboard`,
  }),

  provider_application_rejected: (data) => ({
    subject: 'Update on your Aminy Provider Application',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #374151;">Application Status Update</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${data.providerName},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          After careful review, we're unable to approve your provider application at this time. ${data.reason || 'Please ensure all credentials are current and documentation is complete.'}
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          You're welcome to reapply once you've addressed any missing requirements. If you have questions, please reply to this email.
        </p>
      </div>
    `,
    text: `Application Status Update\n\nWe're unable to approve your application at this time. ${data.reason || ''}\n\nYou're welcome to reapply.`,
  }),

  appointment_confirmation: (data) => ({
    subject: `✅ Appointment confirmed with ${data.providerName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">Appointment Confirmed! ✅</h1>
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Provider:</strong> ${data.providerName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${data.date}</p>
          <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${data.time}</p>
          <p style="margin: 0;"><strong>Duration:</strong> ${data.duration} minutes</p>
        </div>
        <a href="${data.meetingUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Add to Calendar
        </a>
      </div>
    `,
    text: `Appointment Confirmed!\n\nProvider: ${data.providerName}\nDate: ${data.date}\nTime: ${data.time}\n\n${data.meetingUrl}`,
  }),

  appointment_reminder: (data) => ({
    subject: `⏰ Appointment in ${data.timeUntil} with ${data.providerName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">Your appointment is coming up! ⏰</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your appointment with ${data.providerName} is in ${data.timeUntil}.
        </p>
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${data.date}</p>
          <p style="margin: 0 0 10px 0;"><strong>Time:</strong> ${data.time}</p>
          <p style="margin: 0;"><strong>Duration:</strong> ${data.duration} minutes</p>
        </div>
        <a href="${data.meetingUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Join Meeting
        </a>
      </div>
    `,
    text: `Reminder: Appointment in ${data.timeUntil}\n\n${data.providerName}\n${data.date} at ${data.time}\n\n${data.meetingUrl}`,
  }),

  appointment_cancelled: (data) => ({
    subject: `Appointment cancelled with ${data.providerName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">Appointment Cancelled</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your appointment with ${data.providerName} on ${data.date} at ${data.time} has been cancelled.
        </p>
        ${data.reason ? `<p style="color: #6b7280;">Reason: ${data.reason}</p>` : ''}
        <a href="${data.appUrl}/marketplace" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px;">
          Reschedule
        </a>
      </div>
    `,
    text: `Appointment Cancelled\n\n${data.providerName} on ${data.date}\n\nReschedule: ${data.appUrl}/marketplace`,
  }),

  referral_invite: (data) => ({
    subject: `${data.senderName} thinks you'd love Aminy! 💙`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">${data.senderName} invited you! 💙</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your friend ${data.senderName} thinks Aminy could help your family too!
        </p>
        <div style="background: #f0fdfa; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <strong style="color: #0d9488;">What is Aminy?</strong>
          <p style="color: #374151;">
            Aminy is an AI companion for parents of children with autism and ADHD. Get personalized strategies, track progress, and connect with BCBAs - all in one place.
          </p>
        </div>
        <a href="${data.referralUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Try Aminy Free
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          You'll both get 1 month free when you sign up!
        </p>
      </div>
    `,
    text: `${data.senderName} invited you to Aminy!\n\nAminy is an AI companion for parents of children with autism and ADHD.\n\n${data.referralUrl}`,
  }),

  referral_signup: (data) => ({
    subject: `🎉 ${data.referredName} joined - You earned 1 free month!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">Referral Success! 🎉</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Great news, ${data.parentName}! ${data.referredName} just signed up using your referral link.
        </p>
        <div style="background: #f0fdfa; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
          <p style="color: #0d9488; font-size: 24px; font-weight: bold; margin: 0;">
            +1 Month Free
          </p>
          <p style="color: #6b7280; margin: 5px 0 0 0;">
            Applied to your account
          </p>
        </div>
        <p style="color: #374151;">
          Total referrals: <strong>${data.totalReferrals}</strong>
        </p>
        <a href="${data.appUrl}/referrals" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Invite More Friends
        </a>
      </div>
    `,
    text: `${data.referredName} joined using your referral!\n\nYou earned 1 free month.\n\nTotal referrals: ${data.totalReferrals}`,
  }),

  payment_receipt: (data) => ({
    subject: `Receipt for your Aminy subscription`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">Payment Receipt</h1>
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Plan:</strong> ${data.planName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> $${data.amount}</p>
          <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${data.date}</p>
          <p style="margin: 0;"><strong>Receipt #:</strong> ${data.receiptId}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Questions about your billing? Reply to this email.
        </p>
      </div>
    `,
    text: `Payment Receipt\n\nPlan: ${data.planName}\nAmount: $${data.amount}\nDate: ${data.date}\nReceipt #: ${data.receiptId}`,
  }),

  payment_failed: (data) => ({
    subject: `⚠️ Payment failed - Action required`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">Payment Failed ⚠️</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          We couldn't process your payment for ${data.planName}. Please update your payment method to continue using Aminy without interruption.
        </p>
        <a href="${data.appUrl}/settings/billing" style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
          Update Payment Method
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          Your access will be limited in ${data.gracePeriodDays} days if payment isn't updated.
        </p>
      </div>
    `,
    text: `Payment Failed\n\nPlease update your payment method: ${data.appUrl}/settings/billing`,
  }),

  subscription_cancelled: (data) => ({
    subject: `Your Aminy subscription has been cancelled`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #374151;">Subscription Cancelled</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Hi ${data.parentName},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your subscription has been cancelled. You'll continue to have access until ${data.accessUntil}.
        </p>
        <div style="background: #f0fdfa; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <strong style="color: #0d9488;">Your data is safe</strong>
          <p style="color: #374151; margin-bottom: 0;">
            All of ${data.childName}'s data will be preserved. You can resubscribe anytime to pick up where you left off.
          </p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          We'd love to hear why you cancelled. Reply to this email with any feedback.
        </p>
      </div>
    `,
    text: `Subscription Cancelled\n\nAccess until: ${data.accessUntil}\n\nYour data is safe and preserved.`,
  }),

  export_ready: (data) => ({
    subject: `Your data export is ready`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488;">Your Export is Ready! 📦</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your data export is ready to download. The link below is valid for 24 hours.
        </p>
        <a href="${data.downloadUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
          Download Export
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          Export includes: conversations, memories, care plans, and uploaded documents.
        </p>
      </div>
    `,
    text: `Your data export is ready!\n\nDownload (valid 24h): ${data.downloadUrl}`,
  }),
};

// ============================================
// EMAIL SENDING FUNCTIONS
// ============================================

/**
 * Send an email using Supabase Edge Function
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: Record<string, any>
): Promise<EmailResult> {
  try {
    const templateFn = EMAIL_TEMPLATES[template];
    if (!templateFn) {
      console.error(`[Email] Unknown template: ${template}`);
      return { success: false, error: `Unknown template: ${template}` };
    }

    const { subject, html, text } = templateFn({
      ...data,
      appUrl: import.meta.env.VITE_APP_URL || 'https://aminy.app',
    });

    // Call Supabase Edge Function to send email
    const { data: result, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html,
        text,
        template,
        metadata: data,
      },
    });

    if (error) {
      console.error('[Email] Edge function error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Sent ${template} to ${to}`);
    return { success: true, messageId: result?.messageId };
  } catch (err: any) {
    console.error('[Email] Error sending email:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a batch of emails
 */
export async function sendBatchEmails(
  emails: Array<{ to: string; template: EmailTemplate; data: Record<string, any> }>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const result = await sendEmail(email.to, email.template, email.data);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`[Email] Batch complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Get user's email from profile
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.email || null;
  } catch (err) {
    console.error('[Email] Failed to get user email:', err);
    return null;
  }
}

/**
 * Check if user has unsubscribed from email type
 */
export async function isUnsubscribed(
  userId: string,
  emailType: EmailTemplate
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('email_preferences')
      .select('unsubscribed_types')
      .eq('user_id', userId)
      .single();

    if (!data) return false;
    return (data.unsubscribed_types || []).includes(emailType);
  } catch {
    return false;
  }
}

export default {
  sendEmail,
  sendBatchEmails,
  getUserEmail,
  isUnsubscribed,
  EMAIL_TEMPLATES,
};

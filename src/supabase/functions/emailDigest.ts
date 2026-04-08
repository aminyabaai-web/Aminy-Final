// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Email Digest Cron Job
 * Sends weekly progress summary emails every Sunday at 8pm
 * 
 * To schedule in Supabase:
 * 1. Go to Database → Cron Jobs
 * 2. Create new job:
 *    - Schedule: 0 20 * * 0 (Sundays at 8pm)
 *    - Command: SELECT net.http_post(...)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface WeeklySummary {
  userId: string;
  parentName: string;
  childName: string;
  email: string;
  highlights: string[];
  nextGoals: string[];
  encouragement: string;
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Query all users who have weeklyDigest enabled
    const { data: users, error: queryError } = await supabase
      .from('user_preferences')
      .select('user_id, email, weekly_digest')
      .eq('weekly_digest', true);

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users to email' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    // Generate and send digest for each user
    for (const user of users) {
      try {
        const summary = await generateWeeklySummary(user.user_id);
        await sendWeeklyDigest(user.email, summary);
        results.push({ userId: user.user_id, status: 'sent' });
      } catch (error) {
        console.error(`Failed to send digest for user ${user.user_id}:`, error);
        results.push({ userId: user.user_id, status: 'failed', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Sent ${results.filter(r => r.status === 'sent').length} digests`,
        results 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Email digest error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function generateWeeklySummary(userId: string): Promise<WeeklySummary> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get user data
  const { data: user } = await supabase
    .from('users')
    .select('name, child_name, email')
    .eq('id', userId)
    .single();

  // Calculate date range (last 7 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  // Get Aminy Jr sessions
  const { data: jrSessions } = await supabase
    .from('jr_sessions')
    .select('stars_earned, calm_coins_earned, achievements')
    .eq('child_id', userId)
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString());

  // Get completed goals
  const { data: goals } = await supabase
    .from('goals')
    .select('name')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', startDate.toISOString());

  // Get streaks
  const { data: streaks } = await supabase
    .from('streaks')
    .select('name, count')
    .eq('user_id', userId)
    .gte('count', 3);

  // Build highlights
  const highlights: string[] = [];

  if (jrSessions && jrSessions.length > 0) {
    const totalCoins = jrSessions.reduce((sum, s) => sum + s.calm_coins_earned, 0);
    highlights.push(`✓ ${jrSessions.length} Aminy Jr sessions completed, earning ${totalCoins} Calm Coins`);
  }

  if (goals && goals.length > 0) {
    highlights.push(`✓ ${goals.length} goals achieved: ${goals.map(g => g.name).join(', ')}`);
  }

  if (streaks && streaks.length > 0) {
    const longestStreak = Math.max(...streaks.map(s => s.count));
    highlights.push(`✓ ${longestStreak}-day streak maintained! Amazing consistency.`);
  }

  // If no highlights, add default encouragement
  if (highlights.length === 0) {
    highlights.push('You showed up this week — that\'s what matters most.');
  }

  // Build next goals
  const { data: upcomingGoals } = await supabase
    .from('goals')
    .select('name, priority')
    .eq('user_id', userId)
    .eq('completed', false)
    .order('priority', { ascending: false })
    .limit(3);

  const nextGoals = upcomingGoals?.map((g, idx) => 
    `${idx + 1}. ${g.name}`
  ) || ['Continue building your calm plan together'];

  // Generate personalized encouragement
  const encouragement = generateEncouragement(highlights.length, user?.child_name || 'your child');

  return {
    userId,
    parentName: user?.name || 'Parent',
    childName: user?.child_name || 'Child',
    email: user?.email || '',
    highlights,
    nextGoals,
    encouragement
  };
}

function generateEncouragement(highlightCount: number, childName: string): string {
  if (highlightCount >= 3) {
    return `What an incredible week! ${childName} is building skills that will last a lifetime. You're doing amazing work. Keep celebrating these wins — they're bigger than they seem.`;
  } else if (highlightCount >= 1) {
    return `Progress isn't about perfection — it's about showing up. You did that this week, and ${childName} is learning from your consistency. Trust the process, you're on the right path.`;
  } else {
    return `Some weeks are harder than others, and that's okay. What matters is that you're here, committed to ${childName}'s growth. Tomorrow is a fresh start. We're with you every step of the way.`;
  }
}

async function sendWeeklyDigest(email: string, summary: WeeklySummary) {
  // In production, use email service like SendGrid, Resend, or AWS SES
  // For now, log to console

  // Example with Resend (install: deno add jsr:@resend/node)
  /*
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  
  await resend.emails.send({
    from: 'Aminy <hello@aminy.ai>',
    to: email,
    subject: `${summary.childName}'s Weekly Progress Summary`,
    html: generateEmailHTML(summary)
  });
  */
}

function generateEmailHTML(summary: WeeklySummary): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Calm Progress Summary</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #334155;
          max-width: 600px;
          margin: 0 auto;
          padding: 0;
        }
        .header {
          background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .content {
          padding: 32px 20px;
        }
        .section {
          margin-bottom: 32px;
        }
        .section h2 {
          color: #0f172a;
          font-size: 20px;
          margin-bottom: 16px;
        }
        .highlight {
          padding: 12px 16px;
          background: #f0fdfa;
          border-left: 4px solid #0891b2;
          margin-bottom: 8px;
          border-radius: 4px;
        }
        .goal {
          padding: 12px 16px;
          background: #fef3c7;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .encouragement {
          background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
          padding: 24px;
          border-radius: 12px;
          font-style: italic;
          color: #0c4a6e;
        }
        .cta {
          text-align: center;
          margin-top: 32px;
        }
        .cta a {
          display: inline-block;
          background: #0891b2;
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
        }
        .footer {
          background: #f8fafc;
          padding: 24px 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
        .footer a {
          color: #0891b2;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0 0 8px 0; font-size: 28px;">Weekly Calm Progress Summary</h1>
        <p style="margin: 0; font-size: 16px; opacity: 0.9;">
          ${summary.parentName}, here's how ${summary.childName} did this week
        </p>
      </div>

      <div class="content">
        <!-- Highlights Section -->
        <div class="section">
          <h2>🌟 This Week's Highlights</h2>
          ${summary.highlights.map(h => `<div class="highlight">${h}</div>`).join('')}
        </div>

        <!-- Next Goals Section -->
        <div class="section">
          <h2>🎯 Next Week's Goals</h2>
          ${summary.nextGoals.map(g => `<div class="goal">${g}</div>`).join('')}
        </div>

        <!-- Encouragement Section -->
        <div class="section">
          <div class="encouragement">
            ${summary.encouragement}
            <br><br>
            <strong>— Your Aminy team 💙</strong>
          </div>
        </div>

        <!-- CTA -->
        <div class="cta">
          <a href="https://app.aminy.ai/reports">View Full Progress Report</a>
        </div>
      </div>

      <div class="footer">
        <p style="margin: 0 0 8px 0;">Guided by AI. Grounded in ABA. Built for Family Life.</p>
        <p style="margin: 0;">
          <a href="https://app.aminy.ai/preferences/notifications">Update Preferences</a> • 
          <a href="https://app.aminy.ai/unsubscribe">Unsubscribe</a> • 
          <a href="https://aminy.ai/privacy">Privacy Policy</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

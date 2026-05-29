/**
 * New Server Routes for Phase 3+ Features
 * Conversation, Notifications, Analytics, Wins, Emotion Tracking, Privacy
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const routes = new Hono();

// ============================================================================
// CONVERSATION & AI CHAT ROUTES
// ============================================================================

// Load conversation history
routes.post("/conversation/load", async (c) => {
  try {
    const { userId, threadKey } = await c.req.json();
    
    const messages = await kv.get(threadKey) || [];
    
    return c.json({ messages });
  } catch (error) {
    console.error('Load conversation error:', error);
    return c.json({ error: 'Failed to load conversation' }, 500);
  }
});

// Save conversation message
routes.post("/conversation/save", async (c) => {
  try {
    const { userId, threadKey, message } = await c.req.json();
    
    const messages = await kv.get(threadKey) || [];
    messages.push(message);
    
    // Keep last 100 messages
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }
    
    await kv.set(threadKey, messages);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Save message error:', error);
    return c.json({ error: 'Failed to save message' }, 500);
  }
});

// AI Chat with streaming (OpenAI or Claude)
routes.post("/ai/chat", async (c) => {
  try {
    const { messages, stream, context } = await c.req.json();

    // Check OpenAI first, then Anthropic
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!openaiKey && !anthropicKey) {
      return c.json({ error: 'AI service not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.' }, 500);
    }

    if (openaiKey) {
      // Use OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 2048,
          temperature: 0.7,
          messages,
          stream: stream || false,
        }),
      });

      if (stream) {
        return new Response(response.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      const data = await response.json();
      return c.json({ response: data.choices[0].message.content, provider: 'openai' });
    } else {
      // Use Anthropic (Claude)
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          temperature: 0.7,
          messages,
          stream: stream || false,
        }),
      });

      if (stream) {
        return new Response(response.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      const data = await response.json();
      return c.json({ response: data.content[0].text, provider: 'anthropic' });
    }
  } catch (error) {
    console.error('AI chat error:', error);
    return c.json({ error: 'AI chat failed' }, 500);
  }
});

// Generate conversation summary
routes.post("/ai/summarize", async (c) => {
  try {
    const { messages } = await c.req.json();

    // Check OpenAI first, then Anthropic
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!openaiKey && !anthropicKey) {
      return c.json({ summary: 'Conversation summary unavailable' }, 200);
    }

    const prompt = `Summarize this conversation in 2-3 sentences. Focus on key topics, decisions, and action items:\n\n${JSON.stringify(messages)}`;

    if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      return c.json({ summary: data.choices[0].message.content, provider: 'openai' });
    } else {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      return c.json({ summary: data.content[0].text, provider: 'anthropic' });
    }
  } catch (error) {
    console.error('Summarize error:', error);
    return c.json({ summary: 'Conversation summary unavailable' }, 200);
  }
});

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

// Subscribe to push notifications
routes.post("/notifications/subscribe", async (c) => {
  try {
    const { userId, subscription } = await c.req.json();
    
    await kv.set(`notification:subscription:${userId}`, subscription);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return c.json({ error: 'Failed to subscribe' }, 500);
  }
});

// Get VAPID public key
routes.get("/notifications/vapid-key", async (c) => {
  try {
    // In production, store this securely
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'demo-key';
    
    return c.json({ publicKey });
  } catch (error) {
    console.error('VAPID key error:', error);
    return c.json({ error: 'Failed to get VAPID key' }, 500);
  }
});

// Generate weekly digest
routes.post("/notifications/weekly-digest", async (c) => {
  try {
    const { userId } = await c.req.json();
    
    // Fetch weekly stats
    const stats = await kv.get(`user:${userId}:weekly_stats`) || {};
    
    const digest = {
      jrSessions: stats.jrSessions || 0,
      coinsEarned: stats.coinsEarned || 0,
      cuesUsed: stats.cuesUsed || [],
      topProgress: stats.topProgress || 'Keep up the great work!',
    };
    
    return c.json(digest);
  } catch (error) {
    console.error('Weekly digest error:', error);
    return c.json({ error: 'Failed to generate digest' }, 500);
  }
});

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

// Track analytics event
routes.post("/analytics/track", async (c) => {
  try {
    const event = await c.req.json();
    
    // Store event
    const eventKey = `analytics:event:${event.userId}:${Date.now()}`;
    await kv.set(eventKey, event);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Track event error:', error);
    return c.json({ error: 'Failed to track event' }, 500);
  }
});

// Update module usage
routes.post("/analytics/module-usage", async (c) => {
  try {
    const { userId, stats } = await c.req.json();
    
    await kv.set(`analytics:module_usage:${userId}`, stats);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Module usage error:', error);
    return c.json({ error: 'Failed to update module usage' }, 500);
  }
});

// Get analytics summary
routes.get("/analytics/summary", async (c) => {
  try {
    const userId = c.req.query('userId');
    const timeRange = c.req.query('timeRange') || '7d';
    
    // Fetch data (simplified - in production use proper queries)
    const moduleUsage = await kv.get(`analytics:module_usage:${userId}`) || {};
    
    const summary = {
      moduleUsage: Object.entries(moduleUsage).map(([module, data]: any) => ({
        module,
        percentage: Math.round((data.visits / 100) * 100),
      })),
      avgCoinsPerDay: 12, // Mock data
      retention: {
        d7: 65,
        d30: 45,
        avgSessionDuration: 420,
        avgDailyActiveUsers: 1,
      },
      topEvents: [
        { event: 'aminyjr_session_start', count: 24 },
        { event: 'nav_tab_selected', count: 156 },
        { event: 'chat_message_sent', count: 89 },
      ],
    };
    
    return c.json(summary);
  } catch (error) {
    console.error('Analytics summary error:', error);
    return c.json({ error: 'Failed to get summary' }, 500);
  }
});

// Export cohort data
routes.get("/analytics/cohort/export", async (c) => {
  try {
    const week = c.req.query('week');
    
    // Generate CSV
    const csv = `Week,Users,D7 Retention,D30 Retention\n${week},100,65%,45%`;
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="cohort-${week}.csv"`,
      },
    });
  } catch (error) {
    console.error('Cohort export error:', error);
    return c.json({ error: 'Failed to export cohort' }, 500);
  }
});

// ============================================================================
// EMOTION TRACKING ROUTES
// ============================================================================

// Get emotion history
routes.get("/emotion/history", async (c) => {
  try {
    const userId = c.req.query('userId');
    
    const history = await kv.get(`emotion:history:${userId}`) || [];
    const insights = await kv.get(`emotion:insights:${userId}`) || [];
    
    return c.json({ history, insights });
  } catch (error) {
    console.error('Emotion history error:', error);
    return c.json({ error: 'Failed to load history' }, 500);
  }
});

// Save weekly feeling
routes.post("/emotion/save", async (c) => {
  try {
    const { userId, entry } = await c.req.json();
    
    const history = await kv.get(`emotion:history:${userId}`) || [];
    history.push(entry);
    
    // Keep last 52 weeks (1 year)
    if (history.length > 52) {
      history.splice(0, history.length - 52);
    }
    
    await kv.set(`emotion:history:${userId}`, history);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Save feeling error:', error);
    return c.json({ error: 'Failed to save feeling' }, 500);
  }
});

// ============================================================================
// WINS JOURNAL ROUTES
// ============================================================================

// Load wins
routes.get("/wins/load", async (c) => {
  try {
    const userId = c.req.query('userId');
    
    const moments = await kv.get(`wins:moments:${userId}`) || [];
    const weeklySummary = await kv.get(`wins:weekly:${userId}`) || null;
    
    return c.json({ moments, weeklySummary });
  } catch (error) {
    console.error('Load wins error:', error);
    return c.json({ error: 'Failed to load wins' }, 500);
  }
});

// Save calm moment
routes.post("/wins/save", async (c) => {
  try {
    const { userId, moment } = await c.req.json();
    
    const moments = await kv.get(`wins:moments:${userId}`) || [];
    moments.unshift(moment);
    
    // Keep last 100 moments
    if (moments.length > 100) {
      moments.splice(100);
    }
    
    await kv.set(`wins:moments:${userId}`, moments);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Save moment error:', error);
    return c.json({ error: 'Failed to save moment' }, 500);
  }
});

// Share weekly summary
routes.post("/wins/share", async (c) => {
  try {
    const { userId, summary, target } = await c.req.json();
    
    // In production, send email or notification
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Share wins error:', error);
    return c.json({ error: 'Failed to share' }, 500);
  }
});

// Export weekly summary as PDF
routes.post("/wins/export", async (c) => {
  try {
    const { userId, summary } = await c.req.json();
    
    // Generate simple PDF
    const pdfContent = `Wins Summary: ${summary.week}\n\n${summary.generatedSummary}`;
    
    return new Response(pdfContent, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="wins-${summary.week}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Export wins error:', error);
    return c.json({ error: 'Failed to export' }, 500);
  }
});

// ============================================================================
// PRIVACY & DATA MANAGEMENT ROUTES
// ============================================================================

// Get privacy settings
routes.get("/privacy/settings", async (c) => {
  try {
    const userId = c.req.query('userId');
    
    const settings = await kv.get(`privacy:settings:${userId}`) || {
      enhancedPrivacyMode: false,
      allowModelTraining: false,
      shareAnonymizedData: false,
      localStorageOnly: false,
    };
    
    return c.json({ settings });
  } catch (error) {
    console.error('Privacy settings error:', error);
    return c.json({ error: 'Failed to load settings' }, 500);
  }
});

// Update privacy settings
routes.post("/privacy/update", async (c) => {
  try {
    const { userId, settings } = await c.req.json();
    
    await kv.set(`privacy:settings:${userId}`, settings);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update privacy error:', error);
    return c.json({ error: 'Failed to update settings' }, 500);
  }
});

// Get audit log
routes.get("/privacy/audit-log", async (c) => {
  try {
    const userId = c.req.query('userId');
    
    const logs = await kv.get(`privacy:audit:${userId}`) || [];
    
    return c.json({ logs });
  } catch (error) {
    console.error('Audit log error:', error);
    return c.json({ error: 'Failed to load audit log' }, 500);
  }
});

// Export user data
routes.post("/privacy/export", async (c) => {
  try {
    const { userId } = await c.req.json();
    
    // Gather all user data
    const userData = {
      userId,
      profile: await kv.get(`user:${userId}:profile`),
      conversations: await kv.get(`user_${userId}_thread`),
      wins: await kv.get(`wins:moments:${userId}`),
      emotions: await kv.get(`emotion:history:${userId}`),
      exportedAt: new Date().toISOString(),
    };
    
    return c.json(userData);
  } catch (error) {
    console.error('Export data error:', error);
    return c.json({ error: 'Failed to export data' }, 500);
  }
});

// Delete user data
routes.post("/privacy/delete", async (c) => {
  try {
    const { userId } = await c.req.json();
    
    // Delete all user data keys
    const keysToDelete = [
      `user:${userId}:profile`,
      `user_${userId}_thread`,
      `wins:moments:${userId}`,
      `emotion:history:${userId}`,
      `privacy:settings:${userId}`,
      `analytics:module_usage:${userId}`,
    ];
    
    for (const key of keysToDelete) {
      await kv.del(key);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete data error:', error);
    return c.json({ error: 'Failed to delete data' }, 500);
  }
});

export default routes;

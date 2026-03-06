/**
 * Push Notifications Edge Function
 *
 * This function handles sending Web Push notifications using VAPID.
 * It's called by a cron job that runs every minute to process due notifications.
 *
 * Deploy with: supabase functions deploy push-notifications
 *
 * Required secrets (set in Supabase Dashboard > Edge Functions > Secrets):
 * - VAPID_PUBLIC_KEY: Your VAPID public key
 * - VAPID_PRIVATE_KEY: Your VAPID private key
 * - VAPID_SUBJECT: mailto: or https: URL for your app
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:hello@aminy.ai";

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/push-notifications", "");

  try {
    // POST /send - Send notifications to pending queue
    if (req.method === "POST" && path === "/send") {
      const result = await sendPendingNotifications();
      return jsonResponse(result);
    }

    // POST /subscribe - Save push subscription
    if (req.method === "POST" && path === "/subscribe") {
      const { userId, subscription, deviceName } = await req.json();
      const result = await saveSubscription(userId, subscription, deviceName);
      return jsonResponse(result);
    }

    // POST /unsubscribe - Remove push subscription
    if (req.method === "POST" && path === "/unsubscribe") {
      const { userId, endpoint } = await req.json();
      const result = await removeSubscription(userId, endpoint);
      return jsonResponse(result);
    }

    // POST /schedule - Schedule a notification
    if (req.method === "POST" && path === "/schedule") {
      const body = await req.json();
      const result = await scheduleNotification(body);
      return jsonResponse(result);
    }

    // POST /cancel - Cancel a scheduled notification
    if (req.method === "POST" && path === "/cancel") {
      const { notificationId } = await req.json();
      const result = await cancelNotification(notificationId);
      return jsonResponse(result);
    }

    // GET /vapid-key - Return public VAPID key
    if (req.method === "GET" && path === "/vapid-key") {
      return jsonResponse({ publicKey: VAPID_PUBLIC_KEY });
    }

    // POST /test - Send a test notification
    if (req.method === "POST" && path === "/test") {
      const { userId } = await req.json();
      const result = await sendTestNotification(userId);
      return jsonResponse(result);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Send pending notifications from the queue
 * Called by cron job every minute
 */
async function sendPendingNotifications() {
  // Get pending notifications from the view
  const { data: pending, error } = await supabase
    .from("pending_push_notifications")
    .select("*");

  if (error) throw error;
  if (!pending || pending.length === 0) {
    return { sent: 0, message: "No pending notifications" };
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const notification of pending) {
    try {
      await sendWebPush(
        {
          endpoint: notification.endpoint,
          keys: {
            p256dh: notification.p256dh_key,
            auth: notification.auth_key,
          },
        },
        {
          title: notification.title,
          body: notification.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          tag: `aminy-${notification.notification_type}`,
          data: notification.metadata || {},
        }
      );

      // Update delivery status
      await supabase
        .from("notification_history")
        .update({ delivery_status: "delivered" })
        .eq("id", notification.history_id);

      sentCount++;
    } catch (err) {
      console.error(`Failed to send notification ${notification.history_id}:`, err);

      // Update with error
      await supabase
        .from("notification_history")
        .update({
          delivery_status: "failed",
          error: err.message
        })
        .eq("id", notification.history_id);

      // If subscription is invalid, remove it
      if (err.message.includes("410") || err.message.includes("expired")) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", notification.endpoint);
      }

      failedCount++;
    }
  }

  return {
    sent: sentCount,
    failed: failedCount,
    total: pending.length
  };
}

/**
 * Send a Web Push notification using VAPID
 */
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: any
) {
  // Import web-push library for Deno
  // Note: In production, use the web-push npm package or implement VAPID signing
  const { default: webpush } = await import("npm:web-push@3.6.7");

  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  };

  await webpush.sendNotification(
    pushSubscription,
    JSON.stringify(payload)
  );
}

/**
 * Save a push subscription to the database
 */
async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  deviceName?: string
) {
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      device_name: deviceName,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "endpoint",
    });

  if (error) throw error;

  // Initialize notification preferences if not exists
  await supabase
    .from("notification_preferences")
    .upsert({
      user_id: userId,
    }, {
      onConflict: "user_id",
    });

  return { success: true };
}

/**
 * Remove a push subscription
 */
async function removeSubscription(userId: string, endpoint?: string) {
  let query = supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId);

  if (endpoint) {
    query = query.eq("endpoint", endpoint);
  }

  const { error } = await query;
  if (error) throw error;

  return { success: true };
}

/**
 * Schedule a notification for future delivery
 */
async function scheduleNotification(data: {
  userId: string;
  title: string;
  body: string;
  scheduledFor: string;
  type: string;
  data?: any;
  priority?: string;
}) {
  const { error, data: notification } = await supabase
    .from("scheduled_notifications")
    .insert({
      user_id: data.userId,
      title: data.title,
      body: data.body,
      scheduled_for: data.scheduledFor,
      notification_type: data.type,
      data: data.data || {},
      priority: data.priority || "normal",
    })
    .select()
    .single();

  if (error) throw error;

  return { notificationId: notification.id };
}

/**
 * Cancel a scheduled notification
 */
async function cancelNotification(notificationId: string) {
  const { error } = await supabase
    .from("scheduled_notifications")
    .delete()
    .eq("id", notificationId)
    .eq("sent", false);

  if (error) throw error;

  return { success: true };
}

/**
 * Send a test notification to verify setup
 */
async function sendTestNotification(userId: string) {
  // Get user's subscriptions
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  if (!subscriptions || subscriptions.length === 0) {
    throw new Error("No push subscriptions found for user");
  }

  let sentCount = 0;
  for (const sub of subscriptions) {
    try {
      await sendWebPush(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        },
        {
          title: "Test Notification",
          body: "Push notifications are working! 🎉",
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          tag: "test-notification",
          data: { route: "/" },
        }
      );
      sentCount++;
    } catch (err) {
      console.error("Failed to send test notification:", err);
    }
  }

  return { sent: sentCount, total: subscriptions.length };
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

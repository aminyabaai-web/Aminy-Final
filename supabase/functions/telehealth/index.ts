/**
 * Telehealth API Edge Function
 * Handles all telehealth-related backend operations
 *
 * Deploy with: supabase functions deploy telehealth
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

// Environment variables (set in Supabase Dashboard > Edge Functions > Secrets)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@aminy.ai";

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

// CORS headers - restrict to app domain in production
const ALLOWED_ORIGINS = [
  'https://aminy.ai',
  'https://www.aminy.ai',
  'https://app.aminy.ai',
  ...(Deno.env.get('ENVIRONMENT') !== 'production' ? ['http://localhost:3000', 'http://localhost:5173'] : []),
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Authentication helper - verify JWT and extract user
async function verifyAuth(req: Request): Promise<{ userId: string; email: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth verification failed:', error?.message);
      return null;
    }

    return { userId: user.id, email: user.email || '' };
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

// Helper for unauthorized response
function unauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized - valid authentication required' }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/telehealth", "");

  try {
    // SECURITY: Verify authentication for all routes except OPTIONS
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return unauthorizedResponse(corsHeaders);
    }

    // Route requests - pass authenticated user to handlers
    if (path.startsWith("/appointments")) {
      return handleAppointments(req, path, authUser, corsHeaders);
    }
    if (path.startsWith("/payments")) {
      return handlePayments(req, path, authUser, corsHeaders);
    }
    if (path.startsWith("/video")) {
      return handleVideo(req, path, authUser, corsHeaders);
    }
    if (path.startsWith("/notifications")) {
      return handleNotifications(req, path, authUser, corsHeaders);
    }
    if (path.startsWith("/providers")) {
      return handleProviders(req, path, authUser, corsHeaders);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    // Don't expose internal error messages in production
    const errorMessage = Deno.env.get('ENVIRONMENT') === 'production'
      ? 'An internal error occurred'
      : error.message;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// =============================================================================
// Appointments Handler
// =============================================================================

async function handleAppointments(
  req: Request,
  path: string,
  authUser: { userId: string; email: string },
  corsHeaders: Record<string, string>
): Promise<Response> {
  const method = req.method;

  // POST /appointments - Create appointment
  if (method === "POST" && path === "/appointments") {
    const body = await req.json();
    const {
      providerId,
      slot,
      visitType,
      visitFormat = 'video',
      concernId,
      concernLabel,
      intake,
      durationMinutes = 25
    } = body;

    // Input validation - match database schema requirements
    if (!providerId || !slot?.startTime || !visitType || !concernId || !concernLabel) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: providerId, slot.startTime, visitType, concernId, concernLabel'
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate visitType matches schema CHECK constraint
    const validVisitTypes = ['consult', 'extended', 'follow-up'];
    if (!validVisitTypes.includes(visitType)) {
      return new Response(JSON.stringify({
        error: `Invalid visitType. Must be one of: ${validVisitTypes.join(', ')}`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate visitFormat matches schema CHECK constraint
    const validFormats = ['video', 'phone', 'in-person'];
    if (!validFormats.includes(visitFormat)) {
      return new Response(JSON.stringify({
        error: `Invalid visitFormat. Must be one of: ${validFormats.join(', ')}`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Use authenticated user's ID, not from request body
    const userId = authUser.userId;

    // Validate slot is in the future
    const scheduledTime = new Date(slot.startTime);
    if (scheduledTime <= new Date()) {
      return new Response(JSON.stringify({ error: 'Cannot book slots in the past' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check slot availability (prevent double-booking)
    // Look for overlapping appointments for this provider at this time
    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("provider_id", providerId)
      .eq("scheduled_time", slot.startTime)
      .in("status", ["scheduled", "confirmed", "in-progress"])
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: 'This slot is no longer available' }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate video room name if video format
    const videoRoomName = visitFormat === 'video' ? `aminy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : null;
    const videoRoomUrl = videoRoomName ? `https://aminy.daily.co/${videoRoomName}` : null;

    // Create appointment in database - matching schema exactly
    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert({
        user_id: userId,
        provider_id: providerId,
        concern_id: concernId,
        concern_label: concernLabel,
        visit_type: visitType,
        visit_format: visitFormat,
        scheduled_time: slot.startTime,
        duration_minutes: durationMinutes,
        status: "scheduled",
        video_room_url: videoRoomUrl,
        video_room_name: videoRoomName,
        intake_answers: intake || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Appointment creation error:', error);
      throw error;
    }

    return jsonResponse(appointment, 201, corsHeaders);
  }

  // GET /appointments - Get user's own appointments only
  if (method === "GET" && path === "/appointments") {
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // Optional filter: scheduled, completed, cancelled
    const upcoming = url.searchParams.get("upcoming") === "true"; // Only future appointments

    // SECURITY: Only return authenticated user's appointments with provider details
    let query = supabase
      .from("appointments")
      .select(`
        *,
        provider:providers(id, name, credentials, role, specialty, photo)
      `)
      .eq("user_id", authUser.userId);

    // Apply optional filters
    if (status) {
      query = query.eq("status", status);
    }
    if (upcoming) {
      query = query.gte("scheduled_time", new Date().toISOString());
    }

    const { data, error } = await query.order("scheduled_time", { ascending: true });

    if (error) throw error;
    return jsonResponse(data, 200, corsHeaders);
  }

  // GET /appointments/:id - Get single appointment (only if owned by user)
  const appointmentIdMatch = path.match(/^\/appointments\/([^/]+)$/);
  if (method === "GET" && appointmentIdMatch) {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        provider:providers(id, name, credentials, role, specialty, photo, bio)
      `)
      .eq("id", appointmentIdMatch[1])
      .eq("user_id", authUser.userId) // SECURITY: Ensure user owns this appointment
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return jsonResponse(data, 200, corsHeaders);
  }

  // POST /appointments/:id/cancel - Cancel appointment (only if owned by user)
  const cancelMatch = path.match(/^\/appointments\/([^/]+)\/cancel$/);
  if (method === "POST" && cancelMatch) {
    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    // SECURITY: Verify ownership before canceling
    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason || null,
      })
      .eq("id", cancelMatch[1])
      .eq("user_id", authUser.userId) // SECURITY: Only cancel own appointments
      .select()
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Appointment not found or not authorized' }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return jsonResponse(data, 200, corsHeaders);
  }

  // GET /appointments/:id/summary - Get visit summary for completed appointment
  const summaryMatch = path.match(/^\/appointments\/([^/]+)\/summary$/);
  if (method === "GET" && summaryMatch) {
    // First verify the user owns this appointment
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", summaryMatch[1])
      .eq("user_id", authUser.userId)
      .single();

    if (!appointment) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the visit summary
    const { data, error } = await supabase
      .from("visit_summaries")
      .select(`
        *,
        action_items(*)
      `)
      .eq("appointment_id", summaryMatch[1])
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return jsonResponse(data || null, 200, corsHeaders);
  }

  // GET /appointments/summaries - Get all visit summaries for user
  if (method === "GET" && path === "/appointments/summaries") {
    const { data, error } = await supabase
      .from("visit_summaries")
      .select(`
        *,
        action_items(*)
      `)
      .eq("user_id", authUser.userId)
      .order("visit_date", { ascending: false });

    if (error) throw error;
    return jsonResponse(data, 200, corsHeaders);
  }

  return notFound(corsHeaders);
}

// =============================================================================
// Payments Handler (Stripe)
// =============================================================================

async function handlePayments(
  req: Request,
  path: string,
  authUser: { userId: string; email: string },
  corsHeaders: Record<string, string>
): Promise<Response> {
  const method = req.method;

  // POST /payments/create-intent - Create payment intent for appointment
  if (method === "POST" && path === "/payments/create-intent") {
    const body = await req.json();
    const { amount, currency = "usd", customerId, appointmentId, metadata, description, promoCode } = body;

    // Input validation
    if (!amount || amount <= 0 || amount > 100000) { // Max $1000
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate discount if promo code provided
    let discountAmount = 0;
    if (promoCode) {
      // Validate promo code against database (not hardcoded)
      const { data: promoData } = await supabase
        .from('promo_codes')
        .select('discount_cents, is_active, max_uses, current_uses')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (promoData && (promoData.max_uses === null || promoData.current_uses < promoData.max_uses)) {
        discountAmount = promoData.discount_cents || 0;
      }
    }

    const finalAmount = Math.max(0, amount - discountAmount);

    // Add idempotency key to prevent duplicate charges
    const idempotencyKey = `pi_${authUser.userId}_${appointmentId || Date.now()}`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency,
      customer: customerId,
      metadata: { ...metadata, userId: authUser.userId, appointmentId }, // Track user
      description,
      automatic_payment_methods: { enabled: true },
    }, {
      idempotencyKey,
    });

    // Store payment record in database
    const { error: dbError } = await supabase
      .from("payments")
      .insert({
        appointment_id: appointmentId || null,
        user_id: authUser.userId,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: customerId,
        amount: finalAmount,
        currency,
        status: 'pending',
        promo_code: promoCode || null,
        discount_amount: discountAmount,
        metadata: { ...metadata, description },
      });

    if (dbError) {
      console.error('Failed to store payment record:', dbError);
      // Don't fail the request - payment was created in Stripe
    }

    return jsonResponse({
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: finalAmount,
      originalAmount: amount,
      discountAmount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    }, 200, corsHeaders);
  }

  // POST /payments/customer - Get or create customer
  if (method === "POST" && path === "/payments/customer") {
    const body = await req.json();
    const { email, name, phone } = body;

    // Check for existing customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      return jsonResponse({
        id: existing.data[0].id,
        email: existing.data[0].email,
        name: existing.data[0].name,
      }, 200, corsHeaders);
    }

    // Create new customer
    const customer = await stripe.customers.create({ email, name, phone });
    return jsonResponse({
      id: customer.id,
      email: customer.email,
      name: customer.name,
    }, 201, corsHeaders);
  }

  // POST /payments/create-checkout - Create checkout session
  if (method === "POST" && path === "/payments/create-checkout") {
    const body = await req.json();
    const { amount, description, metadata, successUrl, cancelUrl } = body;

    // Input validation
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: description },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: { ...metadata, userId: authUser.userId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return jsonResponse({ url: session.url, sessionId: session.id }, 200, corsHeaders);
  }

  // POST /payments/refund - Process refund (admin only in future)
  if (method === "POST" && path === "/payments/refund") {
    const body = await req.json();
    const { paymentIntentId, amount, reason } = body;

    if (!paymentIntentId) {
      return new Response(JSON.stringify({ error: 'paymentIntentId required' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason,
    });

    // Update payment record in database
    await supabase
      .from("payments")
      .update({
        status: amount ? 'partially_refunded' : 'refunded',
        refund_amount: amount || refund.amount,
        refund_reason: reason,
      })
      .eq("stripe_payment_intent_id", paymentIntentId);

    return jsonResponse({
      id: refund.id,
      status: refund.status,
      amount: refund.amount,
    }, 200, corsHeaders);
  }

  // GET /payments/history - Get user's payment history
  if (method === "GET" && path === "/payments/history") {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        appointment:appointments(id, concern_label, scheduled_time, status)
      `)
      .eq("user_id", authUser.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return jsonResponse(data, 200, corsHeaders);
  }

  // POST /payments/confirm - Webhook to confirm payment succeeded
  if (method === "POST" && path === "/payments/confirm") {
    const body = await req.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return new Response(JSON.stringify({ error: 'paymentIntentId required' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update payment record
      await supabase
        .from("payments")
        .update({ status: 'succeeded' })
        .eq("stripe_payment_intent_id", paymentIntentId);

      // Update appointment to confirmed if linked
      if (paymentIntent.metadata?.appointmentId) {
        await supabase
          .from("appointments")
          .update({ status: 'confirmed' })
          .eq("id", paymentIntent.metadata.appointmentId);
      }
    }

    return jsonResponse({
      status: paymentIntent.status,
      confirmed: paymentIntent.status === 'succeeded',
    }, 200, corsHeaders);
  }

  return notFound(corsHeaders);
}

// =============================================================================
// Video Handler (Daily.co)
// =============================================================================

async function handleVideo(
  req: Request,
  path: string,
  authUser: { userId: string; email: string },
  corsHeaders: Record<string, string>
): Promise<Response> {
  const method = req.method;

  // POST /video/create-room - Create video room
  if (method === "POST" && path === "/video/create-room") {
    const body = await req.json();
    const { sessionId, privacy, expiryMinutes, maxParticipants, enableKnocking } = body;

    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `aminy-${sessionId}`,
        privacy: privacy || "private",
        properties: {
          exp: Math.floor(Date.now() / 1000) + (expiryMinutes || 120) * 60,
          max_participants: maxParticipants || 4,
          enable_knocking: enableKnocking ?? true,
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    const room = await response.json();
    return jsonResponse({
      id: room.id,
      name: room.name,
      url: room.url,
      privacy: room.privacy,
      config: room.config,
      createdAt: room.created_at,
    }, 201, corsHeaders);
  }

  // POST /video/get-token - Get meeting token
  if (method === "POST" && path === "/video/get-token") {
    const body = await req.json();
    const { roomName, userName, isProvider } = body;

    // SECURITY: Use authenticated user's ID for the token
    const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_id: authUser.userId, // Use authenticated user
          user_name: userName,
          is_owner: isProvider,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60, // 2 hours
        },
      }),
    });

    const data = await response.json();
    return jsonResponse({
      token: data.token,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    }, 200, corsHeaders);
  }

  // GET /video/room/:sessionId - Get room by session
  const roomMatch = path.match(/^\/video\/room\/([^/]+)$/);
  if (method === "GET" && roomMatch) {
    const response = await fetch(`https://api.daily.co/v1/rooms/aminy-${roomMatch[1]}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Room not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const room = await response.json();
    return jsonResponse(room, 200, corsHeaders);
  }

  // DELETE /video/room/:roomName - Delete room
  if (method === "DELETE" && roomMatch) {
    await fetch(`https://api.daily.co/v1/rooms/${roomMatch[1]}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return notFound(corsHeaders);
}

// =============================================================================
// Notifications Handler (Email + SMS)
// =============================================================================

async function handleNotifications(
  req: Request,
  path: string,
  authUser: { userId: string; email: string },
  corsHeaders: Record<string, string>
): Promise<Response> {
  const method = req.method;

  // POST /notifications/email - Send email
  if (method === "POST" && path === "/notifications/email") {
    const body = await req.json();
    const { to, template, data } = body;

    if (!SENDGRID_API_KEY) {
      console.log("SendGrid not configured, skipping email");
      return jsonResponse({ success: true, mock: true }, 200, corsHeaders);
    }

    const emailContent = generateEmailContent(template, data);

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: "Aminy" },
        subject: emailContent.subject,
        content: [
          { type: "text/plain", value: emailContent.text },
          { type: "text/html", value: emailContent.html },
        ],
      }),
    });

    return jsonResponse({ success: response.ok }, 200, corsHeaders);
  }

  // POST /notifications/sms - Send SMS
  if (method === "POST" && path === "/notifications/sms") {
    const body = await req.json();
    const { phoneNumber, message } = body;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.log("Twilio not configured, skipping SMS");
      return jsonResponse({ success: true, mock: true }, 200, corsHeaders);
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: TWILIO_PHONE_NUMBER!,
          Body: message,
        }),
      }
    );

    const result = await response.json();
    return jsonResponse({ success: response.ok, messageId: result.sid }, 200, corsHeaders);
  }

  // POST /notifications/schedule-reminders - Schedule appointment reminders
  if (method === "POST" && path === "/notifications/schedule-reminders") {
    const body = await req.json();
    const { appointmentId, userId, email, phoneNumber, providerName, videoLink, reminders } = body;

    // Store reminders in database for cron job to process
    const { error } = await supabase.from("scheduled_reminders").insert(
      reminders.map((r: any) => ({
        appointment_id: appointmentId,
        user_id: userId,
        email,
        phone_number: phoneNumber,
        provider_name: providerName,
        video_link: videoLink,
        scheduled_for: r.scheduledFor,
        minutes_before: r.minutesBefore,
        sent: false,
      }))
    );

    if (error) throw error;
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  // DELETE /notifications/cancel-reminders/:appointmentId
  const cancelMatch = path.match(/^\/notifications\/cancel-reminders\/([^/]+)$/);
  if (method === "DELETE" && cancelMatch) {
    // SECURITY: Only cancel reminders for user's own appointments
    await supabase
      .from("scheduled_reminders")
      .delete()
      .eq("appointment_id", cancelMatch[1])
      .eq("user_id", authUser.userId);

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return notFound(corsHeaders);
}

// =============================================================================
// Providers Handler
// =============================================================================

async function handleProviders(
  req: Request,
  path: string,
  authUser: { userId: string; email: string },
  corsHeaders: Record<string, string>
): Promise<Response> {
  const method = req.method;

  // GET /providers - List providers with filters
  if (method === "GET" && path === "/providers") {
    const url = new URL(req.url);
    const state = url.searchParams.get("state");
    const role = url.searchParams.get("role");

    let query = supabase.from("providers").select("*");

    if (state) {
      query = query.contains("licensed_states", [state]);
    }
    if (role) {
      query = query.eq("role", role);
    }

    const { data, error } = await query;
    if (error) throw error;

    return jsonResponse(data, 200, corsHeaders);
  }

  // GET /providers/:id - Get single provider
  const providerMatch = path.match(/^\/providers\/([^/]+)$/);
  if (method === "GET" && providerMatch) {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .eq("id", providerMatch[1])
      .single();

    if (error) throw error;
    return jsonResponse(data, 200, corsHeaders);
  }

  // GET /providers/:id/slots - Get provider availability slots
  const slotsMatch = path.match(/^\/providers\/([^/]+)\/slots$/);
  if (method === "GET" && slotsMatch) {
    const url = new URL(req.url);
    const visitType = url.searchParams.get("visitType") || "consult";
    const startDate = url.searchParams.get("startDate") || new Date().toISOString();

    // Get provider availability
    const { data: provider } = await supabase
      .from("providers")
      .select("availability_blocks, time_off_blocks")
      .eq("id", slotsMatch[1])
      .single();

    // Get existing appointments
    const { data: appointments } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("provider_id", slotsMatch[1])
      .gte("start_time", startDate)
      .in("status", ["scheduled", "in_progress"]);

    // Generate slots (simplified - in production use availability-engine logic)
    const slots = generateSlots(
      slotsMatch[1],
      provider?.availability_blocks || [],
      provider?.time_off_blocks || [],
      appointments || [],
      visitType,
      new Date(startDate)
    );

    return jsonResponse(slots, 200, corsHeaders);
  }

  return notFound(corsHeaders);
}

// =============================================================================
// Helper Functions
// =============================================================================

function jsonResponse(data: any, status = 200, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function notFound(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateEmailContent(template: string, data: any): { subject: string; text: string; html: string } {
  const templates: Record<string, (d: any) => { subject: string; text: string; html: string }> = {
    appointment_confirmed: (d) => ({
      subject: `Appointment Confirmed - ${d.appointmentDate}`,
      text: `Hi ${d.userName},\n\nYour appointment with ${d.providerName} is confirmed for ${d.appointmentDate} at ${d.appointmentTime}.\n\n${d.videoLink ? `Join link: ${d.videoLink}` : ""}\n\nBest,\nThe Aminy Team`,
      html: `
        <h2>Appointment Confirmed!</h2>
        <p>Hi ${d.userName},</p>
        <p>Your appointment with <strong>${d.providerName}</strong> is confirmed:</p>
        <ul>
          <li><strong>Date:</strong> ${d.appointmentDate}</li>
          <li><strong>Time:</strong> ${d.appointmentTime}</li>
          <li><strong>Type:</strong> ${d.visitType}</li>
        </ul>
        ${d.videoLink ? `<p><a href="${d.videoLink}">Join Video Call</a></p>` : ""}
        <p>Best,<br>The Aminy Team</p>
      `,
    }),
    appointment_reminder_24h: (d) => ({
      subject: `Reminder: Appointment Tomorrow with ${d.providerName}`,
      text: `Hi ${d.userName},\n\nReminder: You have an appointment with ${d.providerName} tomorrow at ${d.appointmentTime}.\n\nBest,\nThe Aminy Team`,
      html: `
        <h2>Appointment Tomorrow</h2>
        <p>Hi ${d.userName},</p>
        <p>This is a reminder that you have an appointment with <strong>${d.providerName}</strong> tomorrow at <strong>${d.appointmentTime}</strong>.</p>
        <p>Best,<br>The Aminy Team</p>
      `,
    }),
    appointment_reminder_1h: (d) => ({
      subject: `Appointment in 1 Hour - ${d.providerName}`,
      text: `Hi ${d.userName},\n\nYour appointment with ${d.providerName} starts in 1 hour.\n\n${d.videoLink ? `Join link: ${d.videoLink}` : ""}\n\nBest,\nThe Aminy Team`,
      html: `
        <h2>Appointment Starting Soon</h2>
        <p>Hi ${d.userName},</p>
        <p>Your appointment with <strong>${d.providerName}</strong> starts in 1 hour.</p>
        ${d.videoLink ? `<p><a href="${d.videoLink}" style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Join Video Call</a></p>` : ""}
        <p>Best,<br>The Aminy Team</p>
      `,
    }),
  };

  const generator = templates[template];
  if (!generator) {
    return {
      subject: "Notification from Aminy",
      text: JSON.stringify(data),
      html: `<pre>${JSON.stringify(data, null, 2)}</pre>`,
    };
  }

  return generator(data);
}

function generateSlots(
  providerId: string,
  availabilityBlocks: any[],
  timeOffBlocks: any[],
  existingAppointments: any[],
  visitType: string,
  startDate: Date
): any[] {
  // Simplified slot generation - returns mock slots for demo
  const slots = [];
  const duration = visitType === "consult" ? 30 : 55;

  for (let day = 0; day < 14; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Generate 9am-5pm slots
    for (let hour = 9; hour < 17; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      // Check for conflicts
      const hasConflict = existingAppointments.some((apt) => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      if (!hasConflict && slotStart > new Date()) {
        slots.push({
          id: `slot-${providerId}-${slotStart.toISOString()}`,
          providerId,
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          visitType,
          status: "available",
        });
      }
    }
  }

  return slots;
}
